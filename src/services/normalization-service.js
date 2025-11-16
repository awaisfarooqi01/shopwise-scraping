/**
 * Normalization Service
 * Handles brand and category normalization with caching
 * 
 * @typedef {import('../types').BrandNormalizationResponse} BrandNormalizationResponse
 * @typedef {import('../types').CategoryMappingResponse} CategoryMappingResponse
 */

const NodeCache = require('node-cache');
const backendAPIClient = require('./backend-api-client');
const { logger } = require('../utils/logger');
const config = require('../config/config');

/**
 * Normalization Service
 * Provides brand and category normalization with intelligent caching
 */
class NormalizationService {
  constructor() {
    // Cache configuration from config
    const cacheTTL = config.cache?.ttl || 3600; // 1 hour default
    const cacheEnabled = config.cache?.enabled !== false;

    // Initialize caches
    this.brandCache = new NodeCache({
      stdTTL: cacheTTL,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false, // Don't clone objects (better performance)
    });

    this.categoryCache = new NodeCache({
      stdTTL: cacheTTL,
      checkperiod: 600,
      useClones: false,
    });

    this.cacheEnabled = cacheEnabled;
    this.cacheStats = {
      brandHits: 0,
      brandMisses: 0,
      categoryHits: 0,
      categoryMisses: 0,
    };

    // Initialize cache with data from backend
    if (this.cacheEnabled) {
      this.initializeCache();
    }

    logger.info('NormalizationService initialized', {
      cacheEnabled: this.cacheEnabled,
      cacheTTL: cacheTTL,
    });
  }
  /**
   * Initialize cache with data from backend
   */
  async initializeCache() {
    try {
      logger.info('Initializing normalization cache...');

      // Backend max limit is 100, request the maximum allowed
      // Note: To get more brands, backend needs pagination support
      const brands = await backendAPIClient.getTopBrands(100);

      let cachedCount = 0;
      brands.forEach((brand) => {
        // Cache by brand ID
        this.brandCache.set(`id:${brand._id}`, brand);

        // Cache by normalized name
        const normalizedKey = this.getBrandCacheKey(brand.normalized_name);
        this.brandCache.set(normalizedKey, {
          brand_id: brand._id,
          normalized: brand.normalized_name,
          confidence: 1.0,
          source: 'cache',
          needs_review: false,
          original: brand.normalized_name,
        });

        // Cache by original name
        if (brand.name !== brand.normalized_name) {
          const nameKey = this.getBrandCacheKey(brand.name);
          this.brandCache.set(nameKey, {
            brand_id: brand._id,
            normalized: brand.normalized_name,
            confidence: 1.0,
            source: 'cache',
            needs_review: false,
            original: brand.name,
          });
        }

        // Cache all aliases
        if (brand.aliases && Array.isArray(brand.aliases)) {
          brand.aliases.forEach((alias) => {
            const aliasKey = this.getBrandCacheKey(alias);
            this.brandCache.set(aliasKey, {
              brand_id: brand._id,
              normalized: brand.normalized_name,
              confidence: 1.0,
              source: 'cache',
              needs_review: false,
              original: alias,
            });
          });
        }

        cachedCount++;
      });

      logger.info(`Initialized brand cache with ${cachedCount} brands (max ${cachedCount} due to backend limit)`);
    } catch (error) {
      logger.error('Failed to initialize normalization cache:', error);
    }
  }

  /**
   * Get cache key for brand
   * @param {string} brandName - Brand name
   * @returns {string}
   */
  getBrandCacheKey(brandName) {
    return `brand:${brandName.toLowerCase().trim()}`;
  }

  /**
   * Get cache key for category
   * @param {string} platformId - Platform ID
   * @param {string} platformCategory - Platform category
   * @returns {string}
   */
  getCategoryCacheKey(platformId, platformCategory) {
    return `category:${platformId}:${platformCategory.toLowerCase().trim()}`;
  }

  // ============================================================================
  // BRAND NORMALIZATION
  // ============================================================================

  /**
   * Normalize brand name with caching
   * @param {string} brandName - Brand name to normalize
   * @param {string} platformId - Platform identifier (for logging)
   * @param {boolean} autoLearn - Auto-create if not found
   * @returns {Promise<BrandNormalizationResponse>}
   */  async normalizeBrand(brandName, platformId = 'unknown', autoLearn = false) {
    // Validate input - check type first
    if (typeof brandName !== 'string' || brandName === null || brandName === undefined) {
      logger.warn('Invalid brand name provided:', brandName);
      return {
        brand_id: null,
        confidence: 0,
        source: 'invalid_input',
        needs_review: true,
        original: brandName,
        normalized: null,
      };
    }

    // Check for empty string after trim
    const cleanBrandName = brandName.trim();
    if (!cleanBrandName) {
      return {
        brand_id: null,
        confidence: 0,
        source: 'empty_input',
        needs_review: true,
        original: brandName,
        normalized: null,
      };
    }

    // Check cache first
    if (this.cacheEnabled) {
      const cacheKey = this.getBrandCacheKey(cleanBrandName);
      const cached = this.brandCache.get(cacheKey);

      if (cached) {
        this.cacheStats.brandHits++;
        logger.debug(`Brand cache hit for "${cleanBrandName}"`);
        return cached;
      }

      this.cacheStats.brandMisses++;
    }

    // Cache miss - call backend API
    try {
      logger.debug(`Normalizing brand "${cleanBrandName}" via API...`);

      const result = await backendAPIClient.normalizeBrand(cleanBrandName, autoLearn);

      // Cache the result if successful
      if (this.cacheEnabled && result.brand_id) {
        const cacheKey = this.getBrandCacheKey(cleanBrandName);
        this.brandCache.set(cacheKey, result);
        logger.debug(`Cached brand normalization for "${cleanBrandName}"`);
      }

      return result;
    } catch (error) {
      logger.error(`Brand normalization failed for "${cleanBrandName}":`, error.message);

      // Return fallback response
      return {
        brand_id: null,
        confidence: 0,
        source: 'api_error',
        needs_review: true,
        original: cleanBrandName,
        normalized: null,
        error: error.message,
      };
    }
  }

  /**
   * Normalize multiple brands in batch
   * @param {Array<{brand_name: string, auto_learn?: boolean}>} brands - Brands to normalize
   * @returns {Promise<Array<BrandNormalizationResponse>>}
   */
  async normalizeBrandsBatch(brands) {
    // Separate cached and uncached brands
    const uncachedBrands = [];
    const results = new Array(brands.length);

    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      const cacheKey = this.getBrandCacheKey(brand.brand_name);
      const cached = this.cacheEnabled ? this.brandCache.get(cacheKey) : null;

      if (cached) {
        this.cacheStats.brandHits++;
        results[i] = cached;
      } else {
        this.cacheStats.brandMisses++;
        uncachedBrands.push({ ...brand, originalIndex: i });
      }
    }    // Fetch uncached brands from API
    if (uncachedBrands.length > 0) {
      try {
        // Extract brand names and determine if any need auto_learn
        const brandNames = uncachedBrands.map(({ brand_name }) => brand_name);
        const autoLearn = uncachedBrands.some(({ auto_learn }) => auto_learn !== false);
        
        const apiResults = await backendAPIClient.normalizeBrandsBatch(
          brandNames,
          autoLearn
        );

        // Map results back and cache them
        apiResults.forEach((result, idx) => {
          const { originalIndex } = uncachedBrands[idx];
          results[originalIndex] = result;

          // Cache the result
          if (this.cacheEnabled && result.brand_id) {
            const cacheKey = this.getBrandCacheKey(uncachedBrands[idx].brand_name);
            this.brandCache.set(cacheKey, result);
          }
        });
      } catch (error) {
        logger.error('Batch brand normalization failed:', error.message);

        // Fill in error responses for uncached brands
        uncachedBrands.forEach(({ brand_name, originalIndex }) => {
          results[originalIndex] = {
            brand_id: null,
            confidence: 0,
            source: 'api_error',
            needs_review: true,
            original: brand_name,
            normalized: null,
            error: error.message,
          };
        });
      }
    }

    return results;
  }

  // ============================================================================
  // CATEGORY MAPPING
  // ============================================================================

  /**
   * Map platform category to backend category
   * @param {string} platformId - Platform identifier
   * @param {string} platformCategory - Platform category name/path
   * @param {boolean} autoCreate - Auto-create mapping if not found
   * @returns {Promise<CategoryMappingResponse>}
   */
  async mapCategory(platformId, platformCategory, autoCreate = false) {
    // Validate input
    if (!platformId || !platformCategory) {
      logger.warn('Invalid category mapping request:', { platformId, platformCategory });
      return {
        category_id: null,
        confidence: 0,
        source: 'invalid_input',
        needs_review: true,
        platform_category: platformCategory,
        mapped_category: null,
      };
    }

    // Check cache first
    if (this.cacheEnabled) {
      const cacheKey = this.getCategoryCacheKey(platformId, platformCategory);
      const cached = this.categoryCache.get(cacheKey);

      if (cached) {
        this.cacheStats.categoryHits++;
        logger.debug(`Category cache hit for "${platformCategory}" on platform ${platformId}`);
        return cached;
      }

      this.cacheStats.categoryMisses++;
    }

    // Cache miss - call backend API
    try {
      logger.debug(`Mapping category "${platformCategory}" via API...`);

      const result = await backendAPIClient.mapCategory(platformId, platformCategory, autoCreate);

      // Cache the result if successful
      if (this.cacheEnabled && result.category_id) {
        const cacheKey = this.getCategoryCacheKey(platformId, platformCategory);
        this.categoryCache.set(cacheKey, result);
        logger.debug(`Cached category mapping for "${platformCategory}"`);
      }

      return result;
    } catch (error) {
      logger.error(`Category mapping failed for "${platformCategory}":`, error.message);

      // Return fallback response
      return {
        category_id: null,
        confidence: 0,
        source: 'api_error',
        needs_review: true,
        platform_category: platformCategory,
        mapped_category: null,
        error: error.message,
      };
    }
  }

  /**
   * Map multiple categories in batch
   * @param {Array<{platform_id: string, platform_category: string, auto_create?: boolean}>} categories
   * @returns {Promise<Array<CategoryMappingResponse>>}
   */
  async mapCategoriesBatch(categories) {
    // Separate cached and uncached categories
    const uncachedCategories = [];
    const results = new Array(categories.length);

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const cacheKey = this.getCategoryCacheKey(
        category.platform_id,
        category.platform_category
      );
      const cached = this.cacheEnabled ? this.categoryCache.get(cacheKey) : null;

      if (cached) {
        this.cacheStats.categoryHits++;
        results[i] = cached;
      } else {
        this.cacheStats.categoryMisses++;
        uncachedCategories.push({ ...category, originalIndex: i });
      }
    }

    // Fetch uncached categories from API
    if (uncachedCategories.length > 0) {
      try {
        const apiResults = await backendAPIClient.mapCategoriesBatch(
          uncachedCategories.map(({ platform_id, platform_category, auto_create }) => ({
            platform_id,
            platform_category,
            auto_create,
          }))
        );

        // Map results back and cache them
        apiResults.forEach((result, idx) => {
          const { originalIndex } = uncachedCategories[idx];
          results[originalIndex] = result;

          // Cache the result
          if (this.cacheEnabled && result.category_id) {
            const cacheKey = this.getCategoryCacheKey(
              uncachedCategories[idx].platform_id,
              uncachedCategories[idx].platform_category
            );
            this.categoryCache.set(cacheKey, result);
          }
        });
      } catch (error) {
        logger.error('Batch category mapping failed:', error.message);

        // Fill in error responses for uncached categories
        uncachedCategories.forEach(({ platform_category, originalIndex }) => {
          results[originalIndex] = {
            category_id: null,
            confidence: 0,
            source: 'api_error',
            needs_review: true,
            platform_category,
            mapped_category: null,
            error: error.message,
          };
        });
      }
    }

    return results;
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Clear all caches
   */
  clearCache() {
    this.brandCache.flushAll();
    this.categoryCache.flushAll();
    logger.info('Normalization cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      brandCacheSize: this.brandCache.keys().length,
      categoryCacheSize: this.categoryCache.keys().length,
      brandHitRate:
        this.cacheStats.brandHits + this.cacheStats.brandMisses > 0
          ? (
              (this.cacheStats.brandHits /
                (this.cacheStats.brandHits + this.cacheStats.brandMisses)) *
              100
            ).toFixed(2)
          : 0,
      categoryHitRate:
        this.cacheStats.categoryHits + this.cacheStats.categoryMisses > 0
          ? (
              (this.cacheStats.categoryHits /
                (this.cacheStats.categoryHits + this.cacheStats.categoryMisses)) *
              100
            ).toFixed(2)
          : 0,
    };
  }

  /**
   * Refresh cache (reload from backend)
   */
  async refreshCache() {
    logger.info('Refreshing normalization cache...');
    this.clearCache();
    await this.initializeCache();
  }
}

// Export singleton instance
module.exports = new NormalizationService();

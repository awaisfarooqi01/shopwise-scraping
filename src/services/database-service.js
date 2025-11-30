/**
 * Database Service
 * Direct MongoDB operations for scraping - bypasses backend API
 * 
 * This service provides:
 * - Brand normalization with auto-creation
 * - Category mapping with auto-creation under "Unmapped Products"
 * - Product save with upsert
 * - Review save with bulk operations
 * 
 * Reusable across all scrapers (PriceOye, Daraz, etc.)
 */

const NodeCache = require('node-cache');
const { logger } = require('../utils/logger');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const CategoryMapping = require('../models/CategoryMapping');
const Product = require('../models/Product');
const Review = require('../models/Review');

/**
 * Database Service for direct MongoDB operations
 */
class DatabaseService {
  constructor() {
    // Cache configuration
    const cacheTTL = 3600; // 1 hour

    // Initialize caches for performance
    this.brandCache = new NodeCache({
      stdTTL: cacheTTL,
      checkperiod: 600,
      useClones: false,
    });

    this.categoryMappingCache = new NodeCache({
      stdTTL: cacheTTL,
      checkperiod: 600,
      useClones: false,
    });

    this.categoryCache = new NodeCache({
      stdTTL: cacheTTL,
      checkperiod: 600,
      useClones: false,
    });

    this.cacheStats = {
      brandHits: 0,
      brandMisses: 0,
      categoryHits: 0,
      categoryMisses: 0,
    };

    logger.info('DatabaseService initialized with caching');
  }

  // ============================================================================
  // BRAND OPERATIONS
  // ============================================================================

  /**
   * Normalize brand name - find existing or create new
   * @param {string} brandName - Brand name to normalize
   * @param {object} options - Options
   * @param {string} options.platformId - Platform ID for logging
   * @param {boolean} options.autoCreate - Auto-create if not found (default: true)
   * @returns {Promise<{brand_id: string|null, normalized: string, confidence: number, source: string, needs_review: boolean}>}
   */
  async normalizeBrand(brandName, options = {}) {
    const { platformId = 'unknown', autoCreate = true } = options;

    // Validate input
    if (typeof brandName !== 'string' || !brandName.trim()) {
      logger.warn('Invalid brand name provided:', brandName);
      return {
        brand_id: null,
        normalized: null,
        confidence: 0,
        source: 'invalid_input',
        needs_review: true,
        original: brandName,
      };
    }

    const cleanBrandName = brandName.trim();
    const normalizedName = cleanBrandName.toLowerCase();

    // Check cache first
    const cacheKey = `brand:${normalizedName}`;
    const cached = this.brandCache.get(cacheKey);
    if (cached) {
      this.cacheStats.brandHits++;
      logger.debug(`Brand cache hit for "${cleanBrandName}"`);
      return cached;
    }
    this.cacheStats.brandMisses++;

    try {
      // Step 1: Try exact match on normalized_name
      let brand = await Brand.findOne({ normalized_name: normalizedName });

      if (brand) {
        const result = {
          brand_id: brand._id,
          normalized: brand.name,
          canonical_name: brand.name,
          confidence: 1.0,
          source: 'exact_match',
          needs_review: false,
          original: cleanBrandName,
        };
        this.brandCache.set(cacheKey, result);
        logger.debug(`Brand exact match: "${cleanBrandName}" → "${brand.name}"`);
        return result;
      }

      // Step 2: Try case-insensitive match on name
      brand = await Brand.findOne({
        name: { $regex: new RegExp(`^${this.escapeRegex(cleanBrandName)}$`, 'i') },
      });

      if (brand) {
        const result = {
          brand_id: brand._id,
          normalized: brand.name,
          canonical_name: brand.name,
          confidence: 0.95,
          source: 'case_insensitive',
          needs_review: false,
          original: cleanBrandName,
        };
        this.brandCache.set(cacheKey, result);
        logger.debug(`Brand case-insensitive match: "${cleanBrandName}" → "${brand.name}"`);
        return result;
      }

      // Step 3: Try alias match
      brand = await Brand.findOne({
        aliases: { $regex: new RegExp(`^${this.escapeRegex(cleanBrandName)}$`, 'i') },
      });

      if (brand) {
        const result = {
          brand_id: brand._id,
          normalized: brand.name,
          canonical_name: brand.name,
          confidence: 0.9,
          source: 'alias_match',
          needs_review: false,
          original: cleanBrandName,
        };
        this.brandCache.set(cacheKey, result);
        logger.debug(`Brand alias match: "${cleanBrandName}" → "${brand.name}"`);
        return result;
      }

      // Step 4: No match found - auto-create if enabled
      if (!autoCreate) {
        const result = {
          brand_id: null,
          normalized: null,
          confidence: 0,
          source: 'no_match',
          needs_review: true,
          original: cleanBrandName,
        };
        return result;
      }

      // Create new brand
      logger.info(`Creating new brand: "${cleanBrandName}"`);
      const newBrand = await Brand.create({
        name: cleanBrandName,
        normalized_name: normalizedName,
        aliases: [],
        country: 'Unknown',
        description: `Auto-created brand from ${platformId}`,
        is_verified: false,
        product_count: 0,
        popularity_score: 0,
        is_active: true,
      });

      const result = {
        brand_id: newBrand._id,
        normalized: newBrand.name,
        canonical_name: newBrand.name,
        confidence: 1.0,
        source: 'auto_created',
        needs_review: true,
        original: cleanBrandName,
      };

      this.brandCache.set(cacheKey, result);
      logger.info(`✅ Brand created: "${newBrand.name}" (ID: ${newBrand._id})`);
      return result;

    } catch (error) {
      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        logger.warn(`Brand "${cleanBrandName}" was created by another process, fetching...`);
        const existingBrand = await Brand.findOne({ normalized_name: normalizedName });
        if (existingBrand) {
          const result = {
            brand_id: existingBrand._id,
            normalized: existingBrand.name,
            canonical_name: existingBrand.name,
            confidence: 1.0,
            source: 'exact_match',
            needs_review: false,
            original: cleanBrandName,
          };
          this.brandCache.set(cacheKey, result);
          return result;
        }
      }

      logger.error(`Brand normalization failed for "${cleanBrandName}":`, error.message);
      return {
        brand_id: null,
        normalized: null,
        confidence: 0,
        source: 'error',
        needs_review: true,
        original: cleanBrandName,
        error: error.message,
      };
    }
  }

  /**
   * Normalize multiple brands in batch
   * @param {Array<string>} brandNames - Brand names to normalize
   * @param {object} options - Options
   * @returns {Promise<Array>}
   */
  async normalizeBrandsBatch(brandNames, options = {}) {
    const results = [];
    for (const brandName of brandNames) {
      const result = await this.normalizeBrand(brandName, options);
      results.push(result);
    }
    return results;
  }

  // ============================================================================
  // CATEGORY MAPPING OPERATIONS
  // ============================================================================

  /**
   * Map platform category to our category
   * @param {string} platformId - Platform ObjectId
   * @param {string} platformCategory - Platform category name
   * @param {object} options - Options
   * @param {string} options.unmappedCategoryId - ID of "Unmapped Products" category
   * @param {boolean} options.autoCreate - Auto-create under unmapped if not found
   * @returns {Promise<{category_id: string|null, subcategory_id: string|null, category_name: string, subcategory_name: string, confidence: number, source: string, needs_review: boolean}>}
   */
  async mapCategory(platformId, platformCategory, options = {}) {
    const { unmappedCategoryId = null, autoCreate = true } = options;

    // Validate input
    if (!platformId || !platformCategory) {
      logger.warn('Invalid category mapping request:', { platformId, platformCategory });
      return {
        category_id: null,
        subcategory_id: null,
        category_name: null,
        subcategory_name: null,
        confidence: 0,
        source: 'invalid_input',
        needs_review: true,
        platform_category: platformCategory,
      };
    }

    const cleanCategory = platformCategory.trim();

    // Check cache first
    const cacheKey = `catmap:${platformId}:${cleanCategory.toLowerCase()}`;
    const cached = this.categoryMappingCache.get(cacheKey);
    if (cached) {
      this.cacheStats.categoryHits++;
      logger.debug(`Category mapping cache hit for "${cleanCategory}"`);
      return cached;
    }
    this.cacheStats.categoryMisses++;

    try {
      // Step 1: Check CategoryMapping collection for existing mapping
      const mapping = await CategoryMapping.findOne({
        platform_id: platformId,
        platform_category: { $regex: new RegExp(`^${this.escapeRegex(cleanCategory)}$`, 'i') },
        is_active: true,
      }).populate('our_category_id').populate('our_subcategory_id');

      if (mapping) {
        // Update usage stats
        await CategoryMapping.updateOne(
          { _id: mapping._id },
          { $inc: { usage_count: 1 }, last_used: new Date() }
        );

        const result = {
          category_id: mapping.our_category_id?._id || mapping.our_category_id,
          subcategory_id: mapping.our_subcategory_id?._id || mapping.our_subcategory_id,
          category_name: mapping.our_category_id?.name || 'Unknown',
          subcategory_name: mapping.our_subcategory_id?.name || null,
          confidence: mapping.confidence,
          source: 'existing_mapping',
          needs_review: !mapping.is_verified,
          platform_category: cleanCategory,
        };

        this.categoryMappingCache.set(cacheKey, result);
        logger.debug(`Category mapping found: "${cleanCategory}" → "${result.category_name}"`);
        return result;
      }

      // Step 2: Try to find existing category by name (fuzzy match)
      const existingCategory = await this.findCategoryByName(cleanCategory);
      if (existingCategory) {
        // Found a matching category - use it
        let categoryId = existingCategory.parent_category_id || existingCategory._id;
        let subcategoryId = existingCategory.parent_category_id ? existingCategory._id : null;
        let categoryName = existingCategory.name;
        let subcategoryName = null;

        // If it has a parent, get parent name
        if (existingCategory.parent_category_id) {
          const parentCategory = await Category.findById(existingCategory.parent_category_id);
          if (parentCategory) {
            categoryName = parentCategory.name;
            subcategoryName = existingCategory.name;
          }
        }

        const result = {
          category_id: categoryId,
          subcategory_id: subcategoryId,
          category_name: categoryName,
          subcategory_name: subcategoryName,
          confidence: 0.8,
          source: 'fuzzy_match',
          needs_review: false,
          platform_category: cleanCategory,
        };

        this.categoryMappingCache.set(cacheKey, result);
        logger.debug(`Category fuzzy match: "${cleanCategory}" → "${categoryName}"`);
        return result;
      }

      // Step 3: No mapping found - auto-create under "Unmapped Products"
      if (!autoCreate || !unmappedCategoryId) {
        const result = {
          category_id: null,
          subcategory_id: null,
          category_name: null,
          subcategory_name: null,
          confidence: 0,
          source: 'no_match',
          needs_review: true,
          platform_category: cleanCategory,
        };
        return result;
      }

      // Auto-create subcategory under "Unmapped Products"
      logger.info(`Creating unmapped category: "${cleanCategory}"`);
      const newCategory = await this.findOrCreateUnmappedCategory(cleanCategory, unmappedCategoryId);

      if (newCategory) {
        const result = {
          category_id: unmappedCategoryId,
          subcategory_id: newCategory._id,
          category_name: 'Unmapped Products',
          subcategory_name: newCategory.name,
          confidence: 0.5,
          source: 'auto_created',
          needs_review: true,
          platform_category: cleanCategory,
        };

        this.categoryMappingCache.set(cacheKey, result);
        logger.info(`✅ Unmapped category created: "${newCategory.name}" (ID: ${newCategory._id})`);
        return result;
      }

      // Creation failed
      return {
        category_id: null,
        subcategory_id: null,
        category_name: null,
        subcategory_name: null,
        confidence: 0,
        source: 'creation_failed',
        needs_review: true,
        platform_category: cleanCategory,
      };

    } catch (error) {
      logger.error(`Category mapping failed for "${cleanCategory}":`, error.message);
      return {
        category_id: null,
        subcategory_id: null,
        category_name: null,
        subcategory_name: null,
        confidence: 0,
        source: 'error',
        needs_review: true,
        platform_category: cleanCategory,
        error: error.message,
      };
    }
  }

  /**
   * Find category by name (fuzzy matching)
   * @param {string} categoryName - Category name to find
   * @returns {Promise<object|null>}
   */
  async findCategoryByName(categoryName) {
    const normalizedName = categoryName.toLowerCase().trim();

    // Check cache
    const cacheKey = `cat:${normalizedName}`;
    const cached = this.categoryCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      // Try exact match first
      let category = await Category.findOne({
        name: { $regex: new RegExp(`^${this.escapeRegex(categoryName)}$`, 'i') },
        is_active: true,
      });

      if (category) {
        this.categoryCache.set(cacheKey, category);
        return category;
      }

      // Try fuzzy match (remove common words, pluralization)
      const fuzzyPatterns = this.generateFuzzyPatterns(categoryName);
      for (const pattern of fuzzyPatterns) {
        category = await Category.findOne({
          name: { $regex: pattern, $options: 'i' },
          is_active: true,
        });
        if (category) {
          this.categoryCache.set(cacheKey, category);
          return category;
        }
      }

      this.categoryCache.set(cacheKey, null);
      return null;

    } catch (error) {
      logger.error(`Error finding category "${categoryName}":`, error.message);
      return null;
    }
  }

  /**
   * Find or create category under "Unmapped Products"
   * @param {string} categoryName - Category name
   * @param {string} unmappedParentId - ID of "Unmapped Products" parent
   * @returns {Promise<object|null>}
   */
  async findOrCreateUnmappedCategory(categoryName, unmappedParentId) {
    const cleanName = categoryName.trim();

    try {
      // Check if already exists under "Unmapped Products"
      let category = await Category.findOne({
        name: { $regex: new RegExp(`^${this.escapeRegex(cleanName)}$`, 'i') },
        parent_category_id: unmappedParentId,
        is_active: true,
      });

      if (category) {
        logger.debug(`Unmapped category already exists: "${cleanName}"`);
        return category;
      }

      // Create new category under "Unmapped Products"
      category = await Category.create({
        name: cleanName,
        parent_category_id: unmappedParentId,
        level: 1,
        path: [unmappedParentId],
        icon: '📦',
        description: `Auto-created unmapped category`,
        is_active: true,
        metadata: {
          auto_created: true,
          created_at: new Date(),
          source: 'scraper',
        },
      });

      logger.info(`✅ Created unmapped category: "${cleanName}"`);
      return category;

    } catch (error) {
      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        logger.warn(`Category "${cleanName}" was created by another process, fetching...`);
        const existingCategory = await Category.findOne({
          name: { $regex: new RegExp(`^${this.escapeRegex(cleanName)}$`, 'i') },
          parent_category_id: unmappedParentId,
        });
        return existingCategory;
      }

      logger.error(`Failed to create unmapped category "${cleanName}":`, error.message);
      return null;
    }
  }

  // ============================================================================
  // PRODUCT OPERATIONS
  // ============================================================================

  /**
   * Save product to database (upsert by URL)
   * @param {object} productData - Product data
   * @returns {Promise<object>} Saved product
   */
  async saveProduct(productData) {
    try {
      const { original_url, ...data } = productData;

      if (!original_url) {
        throw new Error('original_url is required for product save');
      }

      // Upsert by original_url
      const saved = await Product.findOneAndUpdate(
        { original_url },
        { $set: data, original_url },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      logger.debug(`Product saved: ${saved.name} (${saved._id})`);
      return saved;

    } catch (error) {
      logger.error('Failed to save product:', error.message);
      throw error;
    }
  }

  /**
   * Save multiple products in batch
   * @param {Array<object>} products - Array of product data
   * @returns {Promise<{saved: number, errors: number}>}
   */
  async saveProductsBatch(products) {
    let saved = 0;
    let errors = 0;

    for (const product of products) {
      try {
        await this.saveProduct(product);
        saved++;
      } catch (error) {
        errors++;
        logger.error(`Failed to save product: ${error.message}`);
      }
    }

    logger.info(`Products batch save: ${saved} saved, ${errors} errors`);
    return { saved, errors };
  }

  // ============================================================================
  // REVIEW OPERATIONS
  // ============================================================================

  /**
   * Save review to database
   * @param {object} reviewData - Review data
   * @returns {Promise<object>} Saved review
   */
  async saveReview(reviewData) {
    try {
      const { product_id, reviewer_name, review_date, ...data } = reviewData;

      if (!product_id) {
        throw new Error('product_id is required for review save');
      }

      // Upsert by product_id + reviewer_name + review_date (composite key)
      const saved = await Review.findOneAndUpdate(
        { product_id, reviewer_name, review_date },
        { $set: data, product_id, reviewer_name, review_date },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      logger.debug(`Review saved for product ${product_id}`);
      return saved;

    } catch (error) {
      logger.error('Failed to save review:', error.message);
      throw error;
    }
  }

  /**
   * Save multiple reviews in batch
   * @param {Array<object>} reviews - Array of review data
   * @returns {Promise<{saved: number, errors: number}>}
   */
  async saveReviewsBatch(reviews) {
    let saved = 0;
    let errors = 0;

    for (const review of reviews) {
      try {
        await this.saveReview(review);
        saved++;
      } catch (error) {
        errors++;
        logger.error(`Failed to save review: ${error.message}`);
      }
    }

    logger.info(`Reviews batch save: ${saved} saved, ${errors} errors`);
    return { saved, errors };
  }

  /**
   * Delete all reviews for a product
   * @param {string} productId - Product ID
   * @returns {Promise<number>} Number of deleted reviews
   */
  async deleteProductReviews(productId) {
    try {
      const result = await Review.deleteMany({ product_id: productId });
      logger.debug(`Deleted ${result.deletedCount} reviews for product ${productId}`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to delete reviews:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Escape special regex characters
   * @param {string} str - String to escape
   * @returns {string}
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate fuzzy matching patterns
   * @param {string} name - Name to generate patterns for
   * @returns {Array<RegExp>}
   */
  generateFuzzyPatterns(name) {
    const patterns = [];
    const normalized = name.toLowerCase().trim();

    // Remove "s" suffix (simple pluralization)
    if (normalized.endsWith('s')) {
      patterns.push(new RegExp(`^${this.escapeRegex(normalized.slice(0, -1))}s?$`, 'i'));
    }

    // Remove common prefixes/suffixes
    const withoutCommon = normalized
      .replace(/^(all|the|new|best|top)\s+/i, '')
      .replace(/\s+(devices?|products?|items?|accessories?)$/i, '');
    
    if (withoutCommon !== normalized) {
      patterns.push(new RegExp(`^${this.escapeRegex(withoutCommon)}`, 'i'));
    }

    // Handle hyphenated names
    if (normalized.includes('-')) {
      const withSpaces = normalized.replace(/-/g, ' ');
      patterns.push(new RegExp(`^${this.escapeRegex(withSpaces)}$`, 'i'));
    }
    if (normalized.includes(' ')) {
      const withHyphens = normalized.replace(/\s+/g, '-');
      patterns.push(new RegExp(`^${this.escapeRegex(withHyphens)}$`, 'i'));
    }

    return patterns;
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      brandCacheSize: this.brandCache.keys().length,
      categoryMappingCacheSize: this.categoryMappingCache.keys().length,
      categoryCacheSize: this.categoryCache.keys().length,
    };
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.brandCache.flushAll();
    this.categoryMappingCache.flushAll();
    this.categoryCache.flushAll();
    logger.info('All caches cleared');
  }

  /**
   * Preload brands into cache
   * @param {number} limit - Max brands to load
   */
  async preloadBrandCache(limit = 500) {
    try {
      const brands = await Brand.find({ is_active: true })
        .sort({ product_count: -1 })
        .limit(limit)
        .lean();      let count = 0;
      for (const brand of brands) {
        const result = {
          brand_id: brand._id,
          normalized: brand.name,
          canonical_name: brand.name,
          confidence: 1.0,
          source: 'cache',
          needs_review: false,
          original: brand.name,
        };

        // Cache by normalized name
        this.brandCache.set(`brand:${brand.normalized_name}`, result);

        // Cache by name
        if (brand.name.toLowerCase() !== brand.normalized_name) {
          this.brandCache.set(`brand:${brand.name.toLowerCase()}`, result);
        }

        // Cache aliases
        if (brand.aliases) {
          for (const alias of brand.aliases) {
            this.brandCache.set(`brand:${alias.toLowerCase()}`, result);
          }
        }

        count++;
      }

      logger.info(`Preloaded ${count} brands into cache`);
    } catch (error) {
      logger.error('Failed to preload brand cache:', error.message);
    }
  }

  /**
   * Increment brand product count
   * @param {string} brandId - Brand ID
   */
  async incrementBrandProductCount(brandId) {
    try {
      await Brand.updateOne(
        { _id: brandId },
        { $inc: { product_count: 1 } }
      );
    } catch (error) {
      logger.error('Failed to increment brand product count:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new DatabaseService();

/**
 * Backend API Client
 * HTTP client for ShopWise Backend APIs
 * 
 * @typedef {import('../types').BrandNormalizationRequest} BrandNormalizationRequest
 * @typedef {import('../types').BrandNormalizationResponse} BrandNormalizationResponse
 * @typedef {import('../types').CategoryMappingRequest} CategoryMappingRequest
 * @typedef {import('../types').CategoryMappingResponse} CategoryMappingResponse
 */

const axios = require('axios');
const { logger } = require('../utils/logger');
const config = require('../config/config');

/**
 * Backend API Client
 * Handles all communication with ShopWise Backend APIs
 */
class BackendAPIClient {
  constructor() {
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: config.backendApi.baseUrl,
      timeout: config.backendApi.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ShopWise-Scraping-Service/1.0',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (requestConfig) => {
        logger.debug('Backend API Request:', {
          method: requestConfig.method,
          url: requestConfig.url,
          data: requestConfig.data,
        });
        return requestConfig;
      },
      (error) => {
        logger.error('Backend API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Backend API Response:', {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle API errors
   * @param {Error} error - Axios error
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      logger.error('Backend API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      // Request made but no response
      logger.error('Backend API No Response:', {
        url: error.config?.url,
        message: error.message,
      });
    } else {
      // Error in request configuration
      logger.error('Backend API Request Setup Error:', error.message);
    }
  }

  // ============================================================================
  // BRAND NORMALIZATION APIs
  // ============================================================================

  /**
   * Normalize single brand name
   * @param {string} brandName - Brand name to normalize
   * @param {boolean} autoLearn - Auto-create if not found
   * @returns {Promise<BrandNormalizationResponse>}
   */
  async normalizeBrand(brandName, autoLearn = false) {
    try {
      const response = await this.client.post('/api/v1/brands/normalize', {
        brand_name: brandName,
        auto_learn: autoLearn,
      });

      return response.data.data.result;
    } catch (error) {
      logger.error(`Brand normalization failed for "${brandName}":`, error.message);
      throw error;
    }
  }
  /**
   * Normalize multiple brands in batch
   * @param {Array<string>|Array<{brand_name: string, auto_learn?: boolean}>} brands - Brand names or objects
   * @param {boolean} autoLearn - Auto-create if not found (applied to all brands)
   * @returns {Promise<Array<BrandNormalizationResponse>>}
   */
  async normalizeBrandsBatch(brands, autoLearn = true) {
    try {
      // Extract brand names from objects or use strings directly
      const brandNames = brands.map(b => 
        typeof b === 'string' ? b : b.brand_name
      );

      const response = await this.client.post('/api/v1/brands/normalize/batch', {
        brand_names: brandNames,  // Backend expects brand_names (array of strings)
        auto_learn: autoLearn,    // Backend expects single auto_learn value
      });

      return response.data.data.results;
    } catch (error) {
      logger.error('Batch brand normalization failed:', error.message);
      throw error;
    }
  }
  /**
   * Search brands by name
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Promise<Array>}
   */
  async searchBrands(query, limit = 10) {
    try {
      const response = await this.client.get('/api/v1/brands/search', {
        params: { q: query, limit },
      });

      // Backend returns: { data: { brands: { brands: [...], total, searchTerm } } }
      return response.data.data.brands.brands || [];
    } catch (error) {
      logger.error(`Brand search failed for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Get all brands
   * @param {number} limit - Max brands to fetch
   * @param {number} page - Page number
   * @returns {Promise<Array>}
   */
  async getAllBrands(limit = 1000, page = 1) {
    try {
      const response = await this.client.get('/api/v1/brands', {
        params: { limit, page },
      });

      return response.data.data.brands;
    } catch (error) {
      logger.error('Failed to fetch brands:', error.message);
      return [];
    }
  }
  /**
   * Get top brands
   * @param {number} limit - Number of brands
   * @returns {Promise<Array>}
   */
  async getTopBrands(limit = 50) {
    try {
      const response = await this.client.get('/api/v1/brands/top', {
        params: { limit },
      });

      // Backend returns: { data: { brands: { brands: [...], total, sortBy } } }
      return response.data.data.brands.brands || [];
    } catch (error) {
      logger.error('Failed to fetch top brands:', error.message);
      return [];
    }
  }

  // ============================================================================
  // CATEGORY MAPPING APIs
  // ============================================================================

  /**
   * Map platform category to backend category
   * @param {string} platformId - Platform identifier
   * @param {string} platformCategory - Platform category name/path
   * @param {boolean} autoCreate - Auto-create mapping if not found
   * @returns {Promise<CategoryMappingResponse>}
   */
  async mapCategory(platformId, platformCategory, autoCreate = false) {
    try {
      const response = await this.client.post('/api/v1/category-mappings/map', {
        platform_id: platformId,
        platform_category: platformCategory,
        auto_create: autoCreate,
      });

      return response.data.data.result;
    } catch (error) {
      logger.error(
        `Category mapping failed for "${platformCategory}" on platform ${platformId}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Map multiple categories in batch
   * @param {Array<{platform_id: string, platform_category: string, auto_create?: boolean}>} categories
   * @returns {Promise<Array<CategoryMappingResponse>>}
   */
  async mapCategoriesBatch(categories) {
    try {
      const response = await this.client.post('/api/v1/category-mappings/map/batch', {
        categories,
      });

      return response.data.data.results;
    } catch (error) {
      logger.error('Batch category mapping failed:', error.message);
      throw error;
    }
  }

  /**
   * Get category mappings for a platform
   * @param {string} platformId - Platform ObjectId
   * @returns {Promise<Array>}
   */
  async getPlatformMappings(platformId) {
    try {
      const response = await this.client.get(
        `/api/v1/category-mappings/platform/${platformId}`
      );

      return response.data.data.mappings;
    } catch (error) {
      logger.error(`Failed to fetch mappings for platform ${platformId}:`, error.message);
      return [];
    }
  }

  /**
   * Get mapping statistics
   * @returns {Promise<Object>}
   */
  async getMappingStatistics() {
    try {
      const response = await this.client.get('/api/v1/category-mappings/statistics');

      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch mapping statistics:', error.message);
      return null;
    }
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  /**
   * Check backend API health
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/api/v1/health');
      return response.status === 200;
    } catch (error) {
      logger.error('Backend API health check failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new BackendAPIClient();

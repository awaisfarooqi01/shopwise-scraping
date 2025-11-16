# Code Snippets for ShopWise Scraping

This file contains common code patterns and snippets for GitHub Copilot to learn from.

## Platform Scraper Template

```javascript
/**
 * @typedef {import('../types').Product} Product
 * @typedef {import('../types').ScrapeOptions} ScrapeOptions
 * @typedef {import('../types').ScrapeResult} ScrapeResult
 */

const StaticScraper = require('../base/StaticScraper');
const { logger } = require('../../utils/logger');
const { cleanText, parsePrice, sanitizeUrl } = require('../../utils/helpers');

/**
 * Example Platform Scraper
 * Scrapes product data from Example.pk
 */
class ExampleScraper extends StaticScraper {
  constructor() {
    super({
      platformId: 'example',
      name: 'Example.pk',
      baseUrl: 'https://example.pk',
      rateLimit: 1000,
      maxRetries: 3,
      selectors: {
        productList: '.product-item',
        productName: 'h2.product-title',
        productPrice: '.price-current',
        productImage: 'img.product-img',
        productUrl: 'a.product-link',
      },
    });
  }

  /**
   * Scrape products from category
   * @param {string} categoryUrl - Category URL
   * @param {ScrapeOptions} options - Scrape options
   * @returns {Promise<ScrapeResult>}
   */
  async scrapeCategory(categoryUrl, options = {}) {
    const startTime = Date.now();
    const products = [];
    
    try {
      this.logStart('category', categoryUrl);
      
      const $ = await this.fetchAndParse(categoryUrl);
      const productElements = $(this.selectors.productList);
      
      for (let i = 0; i < productElements.length; i++) {
        const element = productElements.eq(i);
        
        try {
          const product = await this.extractProduct($, element);
          if (product) {
            products.push(product);
          }
        } catch (error) {
          logger.error(`Failed to extract product ${i}:`, error);
        }
      }
      
      this.logSuccess('category', products.length);
      
      return {
        success: true,
        products,
        metrics: {
          duration: Date.now() - startTime,
          itemsScraped: products.length,
          itemsSuccessful: products.length,
          itemsFailed: 0,
        },
      };
    } catch (error) {
      this.logError('category', error);
      throw error;
    }
  }

  /**
   * Extract product data from element
   * @param {import('cheerio').CheerioAPI} $ - Cheerio instance
   * @param {import('cheerio').Cheerio} element - Product element
   * @returns {Promise<Product>}
   */
  async extractProduct($, element) {
    const name = cleanText(this.extractText($, element, this.selectors.productName));
    const priceText = this.extractText($, element, this.selectors.productPrice);
    const imageUrl = this.extractAttribute($, element, this.selectors.productImage, 'src');
    const productUrl = this.extractAttribute($, element, this.selectors.productUrl, 'href');
    
    if (!name || !productUrl) {
      return null;
    }
    
    return {
      platform: this.platformId,
      platformProductId: this.extractProductId(productUrl),
      name,
      slug: slugify(name),
      price: {
        current: parsePrice(priceText),
        currency: 'PKR',
      },
      images: imageUrl ? [{ url: sanitizeUrl(imageUrl), type: 'main' }] : [],
      url: sanitizeUrl(productUrl, this.baseUrl),
      availability: {
        inStock: true,
        status: 'in_stock',
      },
      scrapedAt: new Date(),
    };
  }

  /**
   * Extract product ID from URL
   * @param {string} url - Product URL
   * @returns {string}
   */
  extractProductId(url) {
    const match = url.match(/\/product\/(\d+)/);
    return match ? match[1] : url;
  }
}

module.exports = ExampleScraper;
```

## Normalization Service Pattern

```javascript
/**
 * @typedef {import('../types').BrandNormalizationRequest} BrandNormalizationRequest
 * @typedef {import('../types').BrandNormalizationResponse} BrandNormalizationResponse
 */

const backendApiClient = require('./backend-api-client');
const { redisManager } = require('../utils/redis');
const { logger } = require('../utils/logger');

/**
 * Normalize brand name using backend API
 * @param {string} brandName - Brand name to normalize
 * @param {string} platformId - Platform identifier
 * @param {boolean} autoLearn - Auto-create if not found
 * @returns {Promise<BrandNormalizationResponse>}
 */
async function normalizeBrand(brandName, platformId, autoLearn = false) {
  try {
    // Check cache first
    const cacheKey = `brand:${platformId}:${brandName.toLowerCase()}`;
    const cached = await redisManager.get(cacheKey);
    
    if (cached) {
      logger.debug(`Brand cache hit: ${brandName}`);
      return cached;
    }
    
    // Call backend API
    const response = await backendApiClient.normalizeBrand({
      brandName,
      platformId,
      autoLearn,
    });
    
    // Cache the result
    if (response.success) {
      await redisManager.set(cacheKey, response, 86400); // 24 hours
    }
    
    return response;
  } catch (error) {
    logger.error(`Brand normalization failed for ${brandName}:`, error);
    throw error;
  }
}

module.exports = { normalizeBrand };
```

## Pipeline Stage Pattern

```javascript
/**
 * @typedef {import('../types').Product} Product
 */

const { logger } = require('../../utils/logger');

/**
 * Clean and normalize product data
 * @param {Product} product - Raw product data
 * @returns {Promise<Product>}
 */
async function cleanStage(product) {
  try {
    return {
      ...product,
      name: cleanText(product.name),
      description: product.description ? cleanText(product.description) : undefined,
      price: {
        ...product.price,
        current: parseFloat(product.price.current),
        original: product.price.original ? parseFloat(product.price.original) : undefined,
      },
      // Remove duplicates from arrays
      images: [...new Set(product.images.map(img => img.url))].map(url => ({ url, type: 'main' })),
    };
  } catch (error) {
    logger.error('Clean stage failed:', error);
    throw error;
  }
}

module.exports = { cleanStage };
```

## Queue Job Worker Pattern

```javascript
/**
 * @typedef {import('../types').JobData} JobData
 */

const { logger } = require('../../utils/logger');
const scraperFactory = require('../../scrapers/factory/scraper-factory');

/**
 * Process scraping job
 * @param {import('bull').Job<JobData>} job - Bull job
 * @returns {Promise<any>}
 */
async function processScrapingJob(job) {
  const { type, platform, productId, categoryUrl, options } = job.data;
  
  logger.info(`Processing job ${job.id}: ${type} for ${platform}`);
  
  try {
    const scraper = scraperFactory.getScraper(platform);
    
    let result;
    switch (type) {
      case 'scrape_product':
        result = await scraper.scrapeProduct(productId, options);
        break;
      case 'scrape_category':
        result = await scraper.scrapeCategory(categoryUrl, options);
        break;
      case 'scrape_reviews':
        result = await scraper.scrapeReviews(productId, options);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
    
    // Update job progress
    await job.progress(100);
    
    logger.info(`Job ${job.id} completed: ${result.products?.length || 0} products`);
    
    return result;
  } catch (error) {
    logger.error(`Job ${job.id} failed:`, error);
    throw error;
  }
}

module.exports = { processScrapingJob };
```

## Error Handling Pattern

```javascript
const { logger } = require('../utils/logger');

/**
 * Custom scraper error
 */
class ScraperError extends Error {
  constructor(message, code, platform, url, retryable = false) {
    super(message);
    this.name = 'ScraperError';
    this.code = code;
    this.platform = platform;
    this.url = url;
    this.retryable = retryable;
  }
}

/**
 * Handle scraper errors with retry logic
 * @param {Error} error - Error object
 * @param {string} platform - Platform identifier
 * @param {string} url - URL being scraped
 * @returns {ScraperError}
 */
function handleScraperError(error, platform, url) {
  // Network errors - retryable
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return new ScraperError(
      'Network error',
      'NETWORK_ERROR',
      platform,
      url,
      true
    );
  }
  
  // Rate limit - retryable
  if (error.response?.status === 429) {
    return new ScraperError(
      'Rate limit exceeded',
      'RATE_LIMIT',
      platform,
      url,
      true
    );
  }
  
  // Not found - not retryable
  if (error.response?.status === 404) {
    return new ScraperError(
      'Resource not found',
      'NOT_FOUND',
      platform,
      url,
      false
    );
  }
  
  // Generic error
  return new ScraperError(
    error.message,
    'UNKNOWN_ERROR',
    platform,
    url,
    false
  );
}

module.exports = { ScraperError, handleScraperError };
```

## Testing Pattern

```javascript
/**
 * @jest-environment node
 */

const ExampleScraper = require('../../src/scrapers/platforms/example/example.scraper');
const { logger } = require('../../src/utils/logger');

// Mock logger
jest.mock('../../src/utils/logger');

describe('ExampleScraper', () => {
  let scraper;
  
  beforeEach(() => {
    scraper = new ExampleScraper();
    jest.clearAllMocks();
  });
  
  afterEach(async () => {
    // Cleanup
  });
  
  describe('scrapeCategory', () => {
    it('should scrape products from category', async () => {
      const categoryUrl = 'https://example.pk/category/phones';
      
      const result = await scraper.scrapeCategory(categoryUrl);
      
      expect(result.success).toBe(true);
      expect(result.products).toBeInstanceOf(Array);
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.metrics).toHaveProperty('duration');
    });
    
    it('should handle scraping errors', async () => {
      const invalidUrl = 'https://example.pk/invalid';
      
      await expect(scraper.scrapeCategory(invalidUrl))
        .rejects
        .toThrow();
    });
  });
  
  describe('extractProduct', () => {
    it('should extract product data correctly', async () => {
      // Test implementation
    });
  });
});
```

These patterns help GitHub Copilot understand our code structure and suggest better completions!

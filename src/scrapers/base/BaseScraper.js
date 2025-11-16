/**
 * Base Scraper Abstract Class
 * Foundation for all scraper implementations
 * @module scrapers/base/BaseScraper
 */

const { logger } = require('../../utils/logger');
const { retryWithBackoff, randomDelay, getRandomUserAgent } = require('../../utils/helpers');

/**
 * Abstract base class for all scrapers
 * @abstract
 */
class BaseScraper {
  /**
   * Create a base scraper
   * @param {Object} config - Scraper configuration
   * @param {string} config.name - Scraper name
   * @param {string} config.platformId - Platform ID
   * @param {Object} config.selectors - CSS/XPath selectors
   * @param {Object} config.rateLimit - Rate limiting config
   */
  constructor(config) {
    if (new.target === BaseScraper) {
      throw new TypeError('Cannot construct BaseScraper instances directly');
    }

    this.config = config;
    this.name = config.name || 'BaseScraper';
    this.platformId = config.platformId;
    this.selectors = config.selectors || {};
    this.rateLimit = config.rateLimit || { requestsPerMinute: 30 };
    this.logger = logger.child({ scraper: this.name });

    // Request tracking for rate limiting
    this.requestTimestamps = [];
  }

  /**
   * Initialize scraper
   * Override in child classes for custom initialization
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info(`Initializing ${this.name}`);
  }

  /**
   * Close scraper and cleanup resources
   * Override in child classes for custom cleanup
   * @returns {Promise<void>}
   */
  async close() {
    this.logger.info(`Closing ${this.name}`);
  }

  /**
   * Scrape data from URL
   * Must be implemented by child classes
   * @abstract
   * @param {string} url - URL to scrape
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>}
   */
  async scrape(url, options = {}) {
    throw new Error('scrape() must be implemented by child class');
  }

  /**
   * Extract data from page
   * Must be implemented by child classes
   * @abstract
   * @param {*} page - Page object (varies by scraper type)
   * @returns {Promise<Object>}
   */
  async extractData(page) {
    throw new Error('extractData() must be implemented by child class');
  }

  /**
   * Validate extracted data
   * Override in child classes for custom validation
   * @param {Object} data - Data to validate
   * @returns {Promise<Object>}
   */
  async validateData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data: must be an object');
    }
    return data;
  }

  /**
   * Wait for rate limit
   * @returns {Promise<void>}
   */
  async waitForRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => timestamp > oneMinuteAgo
    );

    // Check if we've exceeded rate limit
    if (this.requestTimestamps.length >= this.rateLimit.requestsPerMinute) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestTimestamp);

      if (waitTime > 0) {
        this.logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Add current timestamp
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Scrape with retry logic
   * @param {string} url - URL to scrape
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>}
   */
  async scrapeWithRetry(url, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const initialDelay = options.initialDelay || 1000;

    return retryWithBackoff(
      async () => {
        await this.waitForRateLimit();
        await randomDelay(1000, 3000); // Random delay between requests
        return await this.scrape(url, options);
      },
      maxRetries,
      initialDelay
    );
  }

  /**
   * Get random user agent
   * @returns {string}
   */
  getUserAgent() {
    return getRandomUserAgent();
  }

  /**
   * Log scraping start
   * @param {string} url - URL being scraped
   */
  logStart(url) {
    this.logger.info(`Starting scrape: ${url}`);
  }

  /**
   * Log scraping success
   * @param {string} url - URL that was scraped
   * @param {Object} data - Extracted data
   */
  logSuccess(url, data) {
    this.logger.info(`Successfully scraped: ${url}`, {
      dataKeys: Object.keys(data),
    });
  }

  /**
   * Log scraping error
   * @param {string} url - URL that failed
   * @param {Error} error - Error object
   */
  logError(url, error) {
    this.logger.error(`Failed to scrape: ${url}`, {
      error: error.message,
      stack: error.stack,
    });
  }

  /**
   * Get selector by key
   * @param {string} key - Selector key
   * @returns {Object|null}
   */
  getSelector(key) {
    return this.selectors[key] || null;
  }

  /**
   * Check if scraper can handle URL
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  canHandle(url) {
    // Override in child classes
    return false;
  }

  /**
   * Get scraper statistics
   * @returns {Object}
   */
  getStats() {
    return {
      name: this.name,
      platformId: this.platformId,
      recentRequests: this.requestTimestamps.length,
      rateLimit: this.rateLimit,
    };
  }
}

module.exports = BaseScraper;

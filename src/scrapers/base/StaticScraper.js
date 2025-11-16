/**
 * Static Scraper
 * For scraping static HTML pages using Cheerio
 * @module scrapers/base/StaticScraper
 */

const axios = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');
const { logger } = require('../../utils/logger');

/**
 * Static HTML scraper using Cheerio
 * @extends BaseScraper
 */
class StaticScraper extends BaseScraper {
  /**
   * Create a static scraper
   * @param {Object} config - Scraper configuration
   */
  constructor(config) {
    super(config);
    this.axiosInstance = null;
  }

  /**
   * Initialize scraper with axios instance
   * @returns {Promise<void>}
   */
  async initialize() {
    await super.initialize();

    this.axiosInstance = axios.create({
      timeout: this.config.timeout || 30000,
      headers: {
        'User-Agent': this.getUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
    });

    this.logger.info('StaticScraper initialized');
  }

  /**
   * Scrape URL and return Cheerio instance
   * @param {string} url - URL to scrape
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>}
   */
  async scrape(url, options = {}) {
    this.logStart(url);

    try {
      // Fetch HTML
      const response = await this.axiosInstance.get(url, {
        headers: options.headers || {},
      });

      // Load HTML into Cheerio
      const $ = cheerio.load(response.data);

      // Extract data
      const data = await this.extractData($, url);

      // Validate data
      const validated = await this.validateData(data);

      this.logSuccess(url, validated);
      return validated;
    } catch (error) {
      this.logError(url, error);
      throw error;
    }
  }

  /**
   * Extract text from selector
   * @param {cheerio.CheerioAPI} $ - Cheerio instance
   * @param {string} selector - CSS selector
   * @param {boolean} trim - Whether to trim whitespace
   * @returns {string}
   */
  extractText($, selector, trim = true) {
    const text = $(selector).text();
    return trim ? text.trim() : text;
  }

  /**
   * Extract attribute from selector
   * @param {cheerio.CheerioAPI} $ - Cheerio instance
   * @param {string} selector - CSS selector
   * @param {string} attribute - Attribute name
   * @returns {string}
   */
  extractAttribute($, selector, attribute) {
    return $(selector).attr(attribute) || '';
  }

  /**
   * Extract array of items
   * @param {cheerio.CheerioAPI} $ - Cheerio instance
   * @param {string} selector - CSS selector for items
   * @param {Function} extractFn - Function to extract data from each item
   * @returns {Array}
   */
  extractArray($, selector, extractFn) {
    const items = [];
    $(selector).each((index, element) => {
      const item = extractFn($(element), index);
      if (item) {
        items.push(item);
      }
    });
    return items;
  }

  /**
   * Check if element exists
   * @param {cheerio.CheerioAPI} $ - Cheerio instance
   * @param {string} selector - CSS selector
   * @returns {boolean}
   */
  elementExists($, selector) {
    return $(selector).length > 0;
  }

  /**
   * Close scraper and cleanup
   * @returns {Promise<void>}
   */
  async close() {
    await super.close();
    this.axiosInstance = null;
  }
}

module.exports = StaticScraper;

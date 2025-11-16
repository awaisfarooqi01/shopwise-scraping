/**
 * API Scraper
 * For extracting data from API endpoints
 * @module scrapers/base/ApiScraper
 */

const axios = require('axios');
const BaseScraper = require('./BaseScraper');

/**
 * API-based scraper
 * @extends BaseScraper
 */
class ApiScraper extends BaseScraper {
  /**
   * Create an API scraper
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
      baseURL: this.config.baseURL || '',
      timeout: this.config.timeout || 30000,
      headers: {
        'User-Agent': this.getUserAgent(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(this.config.headers || {}),
      },
    });

    // Add request interceptor for authentication if needed
    if (this.config.auth) {
      this.axiosInstance.interceptors.request.use((config) => {
        if (this.config.auth.type === 'bearer') {
          config.headers.Authorization = `Bearer ${this.config.auth.token}`;
        } else if (this.config.auth.type === 'basic') {
          const credentials = Buffer.from(
            `${this.config.auth.username}:${this.config.auth.password}`
          ).toString('base64');
          config.headers.Authorization = `Basic ${credentials}`;
        }
        return config;
      });
    }

    this.logger.info('ApiScraper initialized');
  }

  /**
   * Scrape API endpoint
   * @param {string} url - API endpoint URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>}
   */
  async scrape(url, options = {}) {
    this.logStart(url);

    try {
      const response = await this.axiosInstance({
        method: options.method || 'GET',
        url,
        params: options.params || {},
        data: options.data || {},
        headers: options.headers || {},
      });

      // Extract data from response
      const data = await this.extractData(response.data, url);

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
   * GET request
   * @param {string} url - URL
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>}
   */
  async get(url, params = {}) {
    return this.scrape(url, { method: 'GET', params });
  }

  /**
   * POST request
   * @param {string} url - URL
   * @param {Object} data - Request body
   * @returns {Promise<Object>}
   */
  async post(url, data = {}) {
    return this.scrape(url, { method: 'POST', data });
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

module.exports = ApiScraper;

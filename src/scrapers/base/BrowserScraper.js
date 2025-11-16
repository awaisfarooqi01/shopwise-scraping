/**
 * Browser Scraper
 * For scraping JavaScript-rendered pages using Playwright
 * @module scrapers/base/BrowserScraper
 */

const playwright = require('playwright');
const BaseScraper = require('./BaseScraper');
const { logger } = require('../../utils/logger');

/**
 * Browser-based scraper using Playwright
 * @extends BaseScraper
 */
class BrowserScraper extends BaseScraper {
  /**
   * Create a browser scraper
   * @param {Object} config - Scraper configuration
   */
  constructor(config) {
    super(config);
    this.browser = null;
    this.context = null;
    this.browserType = config.browserType || 'chromium'; // chromium, firefox, webkit
  }

  /**
   * Initialize browser
   * @returns {Promise<void>}
   */
  async initialize() {
    await super.initialize();

    const launchOptions = {
      headless: this.config.headless !== false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    };

    this.browser = await playwright[this.browserType].launch(launchOptions);

    this.context = await this.browser.newContext({
      userAgent: this.getUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });

    this.logger.info(`BrowserScraper initialized with ${this.browserType}`);
  }

  /**
   * Create a new page
   * @returns {Promise<playwright.Page>}
   */
  async newPage() {
    if (!this.context) {
      await this.initialize();
    }
    return await this.context.newPage();
  }

  /**
   * Scrape URL using browser
   * @param {string} url - URL to scrape
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>}
   */
  async scrape(url, options = {}) {
    this.logStart(url);

    const page = await this.newPage();

    try {
      // Set timeout
      page.setDefaultTimeout(this.config.timeout || 30000);

      // Navigate to URL
      await page.goto(url, {
        waitUntil: options.waitUntil || 'networkidle',
      });

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector);
      }

      // Extract data
      const data = await this.extractData(page, url);

      // Validate data
      const validated = await this.validateData(data);

      this.logSuccess(url, validated);
      return validated;
    } catch (error) {
      // Take screenshot on error for debugging
      if (this.config.screenshotOnError) {
        try {
          await page.screenshot({
            path: `logs/error-${Date.now()}.png`,
            fullPage: true,
          });
        } catch (screenshotError) {
          this.logger.warn('Failed to capture error screenshot', screenshotError);
        }
      }

      this.logError(url, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Extract text from selector
   * @param {playwright.Page} page - Playwright page
   * @param {string} selector - CSS selector
   * @returns {Promise<string>}
   */
  async extractText(page, selector) {
    try {
      const element = await page.$(selector);
      if (!element) return '';
      return (await element.textContent()) || '';
    } catch {
      return '';
    }
  }

  /**
   * Extract attribute from selector
   * @param {playwright.Page} page - Playwright page
   * @param {string} selector - CSS selector
   * @param {string} attribute - Attribute name
   * @returns {Promise<string>}
   */
  async extractAttribute(page, selector, attribute) {
    try {
      const element = await page.$(selector);
      if (!element) return '';
      return (await element.getAttribute(attribute)) || '';
    } catch {
      return '';
    }
  }

  /**
   * Extract array of elements
   * @param {playwright.Page} page - Playwright page
   * @param {string} selector - CSS selector
   * @param {Function} extractFn - Extraction function
   * @returns {Promise<Array>}
   */
  async extractArray(page, selector, extractFn) {
    const elements = await page.$$(selector);
    const items = [];

    for (const element of elements) {
      const item = await extractFn(element);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Check if element exists
   * @param {playwright.Page} page - Playwright page
   * @param {string} selector - CSS selector
   * @returns {Promise<boolean>}
   */
  async elementExists(page, selector) {
    try {
      const element = await page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  /**
   * Wait for navigation
   * @param {playwright.Page} page - Playwright page
   * @param {Function} action - Action to perform
   * @returns {Promise<void>}
   */
  async waitForNavigation(page, action) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      action(),
    ]);
  }

  /**
   * Scroll to bottom of page
   * @param {playwright.Page} page - Playwright page
   * @returns {Promise<void>}
   */
  async scrollToBottom(page) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  /**
   * Take screenshot
   * @param {playwright.Page} page - Playwright page
   * @param {string} path - Screenshot path
   * @returns {Promise<void>}
   */
  async screenshot(page, path) {
    await page.screenshot({ path, fullPage: true });
  }

  /**
   * Close browser and cleanup
   * @returns {Promise<void>}
   */
  async close() {
    await super.close();

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.logger.info('Browser closed');
  }
}

module.exports = BrowserScraper;

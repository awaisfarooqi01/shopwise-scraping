/**
 * Base Scraper Class
 * Abstract base class for all platform scrapers
 */

const playwright = require('playwright');
const { logger } = require('../utils/logger');
const config = require('../config/scraper-config');

class BaseScraper {
  constructor(platformConfig = {}) {
    this.config = { ...config, ...platformConfig };
    this.browser = null;
    this.context = null;
    this.page = null;
    this.stats = {
      pagesVisited: 0,
      productsScraped: 0,
      errors: 0,
      startTime: null,
      endTime: null,
    };
  }

  /**
   * Initialize browser instance
   */
  async initBrowser() {
    try {
      logger.info('🚀 Initializing browser...');

      this.browser = await playwright[this.config.browser.type].launch({
        headless: this.config.browser.headless,
        args: this.config.browser.args,
        timeout: this.config.browser.timeout,
      });

      this.context = await this.browser.newContext({
        userAgent: this.config.browser.userAgent,
        viewport: this.config.browser.viewport,
        locale: this.config.browser.locale,
        timezoneId: this.config.browser.timezoneId,
      });

      // Add anti-detection scripts to bypass bot detection
      await this.context.addInitScript(() => {
        // Hide webdriver flag
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Mock plugins array
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en', 'ur-PK'],
        });

        // Mock permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = parameters =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);
      });

      this.page = await this.context.newPage();

      // Set default timeout
      this.page.setDefaultTimeout(this.config.page.timeout);

      logger.info('✅ Browser initialized successfully');

      return this.page;
    } catch (error) {
      logger.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();

      logger.info('🔒 Browser closed');
    } catch (error) {
      logger.error('Error closing browser:', error);
    }
  }

  /**
   * Navigate to a URL
   * @param {string} url - URL to navigate to
   */
  async goto(url) {
    try {
      this.stats.pagesVisited++;

      logger.info(`📄 Navigating to: ${url}`);

      await this.page.goto(url, {
        waitUntil: this.config.page.waitUntil,
        timeout: this.config.page.timeout,
      });

      // Extra wait for dynamic content
      if (this.config.page.extraWait) {
        await this.page.waitForTimeout(this.config.page.extraWait);
      }

      logger.info('✅ Page loaded');

      return this.page;
    } catch (error) {
      logger.error(`❌ Failed to load page: ${url}`, error);

      // Take screenshot on error
      if (this.config.page.screenshotOnError) {
        await this.takeScreenshot('error');
      }

      throw error;
    }
  }

  /**
   * Extract text from element
   * @param {string} selector - CSS selector
   * @param {object} options - Extraction options
   */
  async extractText(selector, options = {}) {
    try {
      const { trim = true, timeout = 5000, required = false, multiple = false } = options;

      if (multiple) {
        const elements = await this.page.$$(selector);
        const texts = [];

        for (const element of elements) {
          let text = await element.textContent();
          if (trim) text = text?.trim();
          if (text) texts.push(text);
        }

        return texts;
      }

      const element = await this.page.$(selector);

      if (!element) {
        if (required) {
          throw new Error(`Required element not found: ${selector}`);
        }
        return null;
      }

      let text = await element.textContent();
      if (trim) text = text?.trim();

      return text;
    } catch (error) {
      logger.warn(`Failed to extract text from ${selector}:`, error.message);
      return null;
    }
  }

  /**
   * Extract attribute from element
   * @param {string} selector - CSS selector
   * @param {string} attribute - Attribute name
   * @param {object} options - Extraction options
   */
  async extractAttribute(selector, attribute, options = {}) {
    try {
      const { timeout = 5000, required = false, multiple = false } = options;

      if (multiple) {
        const elements = await this.page.$$(selector);
        const attrs = [];

        for (const element of elements) {
          const attr = await element.getAttribute(attribute);
          if (attr) attrs.push(attr);
        }

        return attrs;
      }

      const element = await this.page.$(selector);

      if (!element) {
        if (required) {
          throw new Error(`Required element not found: ${selector}`);
        }
        return null;
      }

      return await element.getAttribute(attribute);
    } catch (error) {
      logger.warn(`Failed to extract ${attribute} from ${selector}:`, error.message);
      return null;
    }
  }

  /**
   * Wait for selector
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in ms
   */
  async waitForSelector(selector, timeout = 10000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      logger.warn(`Selector not found: ${selector}`);
      return false;
    }
  }

  /**
   * Take screenshot
   * @param {string} name - Screenshot name
   */
  async takeScreenshot(name = 'screenshot') {
    try {
      const path = `${this.config.output.screenshotDir}/${name}-${Date.now()}.png`;
      await this.page.screenshot({ path, fullPage: true });
      logger.info(`📸 Screenshot saved: ${path}`);
      return path;
    } catch (error) {
      logger.error('Failed to take screenshot:', error);
      return null;
    }
  }

  /**
   * Save page HTML
   * @param {string} name - File name
   */
  async saveHtml(name = 'page') {
    try {
      const html = await this.page.content();
      const fs = require('fs');
      const path = `${this.config.output.htmlDir}/${name}-${Date.now()}.html`;

      fs.writeFileSync(path, html);
      logger.info(`💾 HTML saved: ${path}`);

      return path;
    } catch (error) {
      logger.error('Failed to save HTML:', error);
      return null;
    }
  }

  /**
   * Add random delay
   * @param {number} min - Minimum delay (ms)
   * @param {number} max - Maximum delay (ms)
   */
  async randomDelay(min = null, max = null) {
    min = min || this.config.rateLimit.randomDelay.min;
    max = max || this.config.rateLimit.randomDelay.max;

    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    logger.debug(`⏳ Waiting ${delay}ms...`);
    await this.page.waitForTimeout(delay);
  }

  /**
   * Get scraping statistics
   */
  getStats() {
    return {
      ...this.stats,
      duration: this.stats.endTime
        ? this.stats.endTime - this.stats.startTime
        : Date.now() - this.stats.startTime,
      successRate: this.stats.productsScraped / (this.stats.productsScraped + this.stats.errors),
    };
  }

  /**
   * Log statistics
   */
  logStats() {
    const stats = this.getStats();
    const duration = Math.round(stats.duration / 1000);

    logger.info('\n📊 Scraping Statistics:');
    logger.info(`   Pages Visited: ${stats.pagesVisited}`);
    logger.info(`   Products Scraped: ${stats.productsScraped}`);
    logger.info(`   Errors: ${stats.errors}`);
    logger.info(`   Duration: ${duration}s`);
    logger.info(`   Success Rate: ${(stats.successRate * 100).toFixed(2)}%\n`);
  }

  /**
   * Abstract method: Scrape single product
   * Must be implemented by child classes
   */
  async scrapeProduct(url) {
    throw new Error('scrapeProduct() must be implemented by child class');
  }

  /**
   * Abstract method: Scrape listing page
   * Must be implemented by child classes
   */
  async scrapeListing(url) {
    throw new Error('scrapeListing() must be implemented by child class');
  }
}

module.exports = BaseScraper;

/**
 * Utility Helper Functions
 * Common utilities for scraping service
 * @module utils/helpers
 */

const { URL } = require('url');

/**
 * Sanitize and validate URL
 * @param {string} url - URL to sanitize
 * @returns {string|null} - Sanitized URL or null if invalid
 */
function sanitizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch (error) {
    return null;
  }
}

/**
 * Clean text by removing extra whitespace and special characters
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with space
    .replace(/\t+/g, ' '); // Replace tabs with space
}

/**
 * Parse price from string
 * @param {string} priceString - Price string (e.g., "Rs. 1,500", "$100.50")
 * @returns {number|null} - Parsed price or null
 */
function parsePrice(priceString) {
  if (!priceString) {
    return null;
  }

  // Remove currency symbols and common words, then clean up
  const cleaned = priceString
    .replace(/Rs\.?/gi, '')      // Remove Rs or Rs.
    .replace(/PKR/gi, '')        // Remove PKR
    .replace(/[\$€£¥₹]/g, '')    // Remove currency symbols
    .replace(/,/g, '')           // Remove commas
    .trim();

  const price = parseFloat(cleaned);

  return !isNaN(price) && price > 0 ? price : null;
}

/**
 * Extract numbers from string
 * @param {string} text - Text containing numbers
 * @returns {number|null} - Extracted number or null
 */
function extractNumber(text) {
  if (!text) {
    return null;
  }

  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Random delay between min and max
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise<void>}
 */
async function randomDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(delay);
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise<*>}
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Generate random user agent
 * @returns {string}
 */
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  ];

  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate slug from text
 * @param {string} text - Text to slugify
 * @returns {string}
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add
 * @returns {string}
 */
function truncate(text, maxLength = 100, suffix = '...') {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Check if URL belongs to a specific domain
 * @param {string} url - URL to check
 * @param {string} domain - Domain to match
 * @returns {boolean}
 */
function isUrlFromDomain(url, domain) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes(domain);
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 * @param {string} url - URL
 * @returns {string|null}
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Calculate percentage
 * @param {number} value - Value
 * @param {number} total - Total
 * @param {number} decimals - Decimal places
 * @returns {number}
 */
function calculatePercentage(value, total, decimals = 2) {
  if (!total || total === 0) {
    return 0;
  }

  return parseFloat(((value / total) * 100).toFixed(decimals));
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = {
  sanitizeUrl,
  cleanText,
  parsePrice,
  extractNumber,
  sleep,
  randomDelay,
  retryWithBackoff,
  getRandomUserAgent,
  isValidEmail,
  slugify,
  truncate,
  isUrlFromDomain,
  extractDomain,
  calculatePercentage,
  formatBytes,
};

/**
 * Test Utilities
 * Basic tests for utility functions
 */

const {
  sanitizeUrl,
  cleanText,
  parsePrice,
  extractNumber,
  sleep,
  slugify,
  truncate,
  calculatePercentage,
} = require('../src/utils/helpers');

describe('Utility Helpers', () => {
  describe('sanitizeUrl', () => {
    test('should return valid URL', () => {
      const url = 'https://example.com/product';
      expect(sanitizeUrl(url)).toBe(url);
    });

    test('should return null for invalid URL', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
    });
  });

  describe('cleanText', () => {
    test('should remove extra whitespace', () => {
      const text = '  Hello    World  \n\t  ';
      expect(cleanText(text)).toBe('Hello World');
    });

    test('should return empty string for non-string input', () => {
      expect(cleanText(null)).toBe('');
      expect(cleanText(undefined)).toBe('');
    });
  });

  describe('parsePrice', () => {
    test('should parse price from string', () => {
      expect(parsePrice('Rs. 1,500')).toBe(1500);
      expect(parsePrice('PKR 2,500.50')).toBe(2500.50);
      expect(parsePrice('$100.99')).toBe(100.99);
    });

    test('should return null for invalid price', () => {
      expect(parsePrice('Not a price')).toBeNull();
      expect(parsePrice('')).toBeNull();
    });
  });

  describe('extractNumber', () => {
    test('should extract number from text', () => {
      expect(extractNumber('Product 123')).toBe(123);
      expect(extractNumber('Price: 500')).toBe(500);
    });

    test('should return null if no number found', () => {
      expect(extractNumber('No numbers here')).toBeNull();
    });
  });

  describe('sleep', () => {
    test('should delay execution', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });

  describe('slugify', () => {
    test('should create URL-friendly slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Product Name 123')).toBe('product-name-123');
    });
  });

  describe('truncate', () => {
    test('should truncate long text', () => {
      const text = 'This is a very long text that needs truncation';
      expect(truncate(text, 20)).toBe('This is a very lo...');
    });

    test('should not truncate short text', () => {
      const text = 'Short text';
      expect(truncate(text, 20)).toBe(text);
    });
  });

  describe('calculatePercentage', () => {
    test('should calculate percentage correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 200)).toBe(12.5);
    });

    test('should return 0 if total is 0', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });
  });
});

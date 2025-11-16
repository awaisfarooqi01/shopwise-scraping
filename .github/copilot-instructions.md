# GitHub Copilot Instructions for ShopWise Scraping Service

## Project Context

You are working on the **ShopWise Scraping Service**, a production-grade web scraping system for Pakistani e-commerce platforms. This service extracts product data from platforms like Daraz, PriceOye, Telemart, and others, then stores it in a shared MongoDB database with the ShopWise backend.

## Project Structure

- **Language**: JavaScript (Node.js 18+)
- **Architecture**: Modular, scalable scraping system with queue-based job processing
- **Key Technologies**: Playwright, Cheerio, Bull (Redis queues), Mongoose
- **Integration**: Direct MongoDB integration with ShopWise backend

## Coding Standards

### 1. Code Style

- Use **ESLint** and **Prettier** configurations
- Follow **Airbnb JavaScript Style Guide**
- Use `async/await` over Promise chains
- Prefer `const` over `let`, never use `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation

### 2. Naming Conventions

```javascript
// Classes: PascalCase
class ProductScraper { }

// Functions/Variables: camelCase
function extractProductData() { }
const productName = 'iPhone';

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 30000;

// Private properties: underscore prefix
class Scraper {
  constructor() {
    this._browser = null;
  }
}

// File names: kebab-case
// product-scraper.js, data-pipeline.js
```

### 3. File Organization

```javascript
/**
 * Module description
 * @module path/to/module
 */

// 1. External imports
const playwright = require('playwright');

// 2. Internal imports
const BaseScraper = require('../base/base-scraper');
const { logger } = require('../../utils/logger');

// 3. Constants
const DEFAULT_TIMEOUT = 30000;

// 4. Main class/function
class MyClass {
  // Implementation
}

// 5. Export
module.exports = MyClass;
```

### 4. Error Handling

```javascript
// Always use try-catch with async/await
async function scrapeProduct(url) {
  try {
    const data = await scraper.scrape(url);
    return data;
  } catch (error) {
    logger.error('Scraping failed', { error, url });
    throw new ScrapingError('Failed to scrape product', { 
      cause: error, 
      url 
    });
  }
}

// Use specific error classes
throw new NetworkError('Connection timeout');
throw new ValidationError('Invalid product data');
throw new BlockedError('IP blocked by platform');
```

### 5. Logging

```javascript
// Use winston logger, never console.log
const { logger } = require('../utils/logger');

logger.info('Scraping started', { url, platform });
logger.warn('Rate limit approaching', { remaining: 5 });
logger.error('Scraping failed', { error, url });
logger.debug('Extracted data', { data });
```

## Common Patterns

### Scraper Implementation

```javascript
class PlatformScraper extends BaseScraper {
  constructor(config) {
    super(config);
    this.timeout = config.timeout || 30000;
  }

  async scrape(url) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const data = await this.extractData(page);
      return await this.validateData(data);
    } finally {
      await page.close();
    }
  }

  async extractData(page) {
    // Implementation
  }
}
```

### Data Pipeline

```javascript
async function processData(rawData) {
  const cleaned = await cleaner.clean(rawData);
  const transformed = await transformer.transform(cleaned);
  const validated = await validator.validate(transformed);
  const enriched = await enricher.enrich(validated);
  return enriched;
}
```

### Retry Logic

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

## Database Integration

### Always Use Backend Models

```javascript
const Product = require('../models/product.model');
const SaleHistory = require('../models/sale-history.model');

// Follow backend schema exactly
const product = await Product.create({
  platform_id: platformId,
  name: productName,
  price: price,
  original_url: url,
  // ... match backend schema
});
```

### Data Validation

```javascript
const Joi = require('joi');

// Validate against backend schema before saving
const productSchema = Joi.object({
  platform_id: Joi.string().required(),
  name: Joi.string().min(3).required(),
  price: Joi.number().positive().required(),
  // ... match backend validation
});

const { error, value } = productSchema.validate(data);
if (error) throw new ValidationError(error.message);
```

## Anti-Bot Best Practices

### Always Implement

```javascript
// 1. Random delays
const delay = Math.random() * 2000 + 1000;
await page.waitForTimeout(delay);

// 2. User-Agent rotation
const ua = getRandomUserAgent();
await page.setExtraHTTPHeaders({ 'User-Agent': ua });

// 3. Rate limiting
await rateLimiter.waitIfNeeded();

// 4. Human-like behavior
await page.mouse.move(Math.random() * 1000, Math.random() * 800);
```

## Testing Requirements

### Test Structure

```javascript
describe('ProductScraper', () => {
  let scraper;

  beforeAll(() => {
    scraper = new ProductScraper(config);
  });

  describe('scrape()', () => {
    it('should extract product name', async () => {
      const data = await scraper.scrape(testUrl);
      expect(data.name).toBeDefined();
      expect(typeof data.name).toBe('string');
    });

    it('should handle missing data gracefully', async () => {
      const data = await scraper.scrape(incompleteUrl);
      expect(data.name).toBeDefined();
      expect(data.description).toBeUndefined();
    });
  });
});
```

## Documentation

### JSDoc Comments

```javascript
/**
 * Scrape product data from a URL
 * 
 * @param {string} url - The product page URL
 * @param {Object} [options] - Scraping options
 * @param {number} [options.timeout=30000] - Timeout in milliseconds
 * @param {boolean} [options.includeReviews=false] - Include reviews
 * @returns {Promise<Product>} Scraped product data
 * @throws {ScrapingError} If scraping fails
 * 
 * @example
 * const product = await scraper.scrape('https://daraz.pk/...', {
 *   timeout: 60000,
 *   includeReviews: true
 * });
 */
async scrape(url, options = {}) {
  // Implementation
}
```

## Configuration-Driven Development

### Platform Configurations

Always use JSON configs for platform-specific logic:

```json
{
  "platform_id": "daraz-pk",
  "selectors": {
    "product_name": {
      "selector": ".pdp-title",
      "type": "text",
      "required": true
    }
  },
  "rate_limiting": {
    "requests_per_minute": 30
  }
}
```

Avoid hardcoding platform logic in JavaScript files.

## Important Reminders

1. **Never commit sensitive data** (API keys, credentials)
2. **Always validate data** against backend schema
3. **Use rate limiting** on all platforms (30-60 req/min)
4. **Implement retry logic** for network operations
5. **Log extensively** for debugging
6. **Write tests** for new features
7. **Update documentation** when changing behavior
8. **Use TypeScript-style JSDoc** for better autocomplete
9. **Follow responsible scraping practices**
10. **Monitor and minimize platform impact**

## Quick Reference

### Common Imports

```javascript
const { logger } = require('../utils/logger');
const { retryWithBackoff } = require('../utils/retry');
const Product = require('../models/product.model');
const Platform = require('../models/platform.model');
```

### Common Patterns

```javascript
// Scraping with error handling
try {
  await rateLimiter.wait();
  const data = await scraper.scrape(url);
  const validated = await validator.validate(data);
  await Product.create(validated);
} catch (error) {
  logger.error('Operation failed', { error, url });
  throw error;
}
```

## Documentation Reference Guide

When working on specific features or need information, consult these documentation files:

### 📋 Planning & Architecture
- **`docs/SYSTEM_ARCHITECTURE.md`** - Complete system design, components, data flow diagrams, technology stack
- **`docs/IMPLEMENTATION_ROADMAP.md`** - Development phases, task breakdown, Phase 1-5 details, success metrics
- **`docs/FOLDER_STRUCTURE.md`** - Project directory organization, file purposes, naming conventions

### 💾 Database & Data Models
- **`docs/DATABASE_SCHEMA.md`** - MongoDB collections, field specifications, validation rules, indexes
- **`docs/CATEGORY_REFERENCE.md`** - Product category hierarchy, mapping guidelines, standardized categories
- **`docs/PLATFORM_REFERENCE.md`** - Supported platforms (PriceOye, Daraz, etc.), configurations, rate limits

### 🔄 Brand & Category Normalization (IMPORTANT)
- **`docs/BRAND_CATEGORY_API_INTEGRATION.md`** (~700 lines) - **PRIMARY GUIDE** for integrating with backend normalization APIs
  - Backend API client implementation
  - Normalization service with caching
  - Complete code examples
  - Migration strategy
  
- **`docs/CATEGORY_BRAND_NORMALIZATION_STRATEGY.md`** - Normalization strategy, implementation status, benefits
- **`docs/NORMALIZATION_DECISION_GUIDE.md`** - Quick comparison of approaches, decision matrix

### 🌐 Backend API Integration
- **`docs/backend-reference/BRAND_CATEGORY_API_REFERENCE.md`** - Quick reference for 31 backend APIs
  - Brand normalization endpoints (18 APIs)
  - Category mapping endpoints (13 APIs)
  - Request/response examples
  - Error codes and handling
  
- **`docs/backend-reference/README.md`** - Navigation guide, quick start, integration checklist
- **`docs/backend-reference/ShopWise_Brand_CategoryMapping_Postman_Collection.json`** - Postman collection for testing

### 🕷️ Scraping Best Practices
- **`docs/SCRAPING_GUIDELINES.md`** - Web scraping best practices, anti-detection, rate limiting, ethics
  - Stealth mode techniques
  - Proxy rotation
  - User-agent management
  - Error handling patterns

### 🔧 Development Workflow
- **`docs/DEVELOPMENT_WORKFLOW.md`** - Git workflow, code standards, PR process, branching strategy
- **`docs/SETUP_COMPLETE.md`** - Post-setup verification checklist, troubleshooting

### 📊 Implementation Summaries
- **`docs/COMPLETE_IMPLEMENTATION_SUMMARY.md`** - Full overview of Brand & Category system (backend + scraping)
- **`docs/SCRAPING_DOCS_UPDATE_SUMMARY.md`** - Documentation update summary for API integration
- **`docs/SESSION_SUMMARY.md`** - Latest session completion summary

### 📚 Quick Reference Index
- **`docs/DOCUMENTATION_INDEX.md`** - Master index of all documentation, organized by topic

### 🎯 Current Implementation Phase

**Phase 1.5: Backend API Integration** (PRIORITY)
- Status: Backend APIs Ready ✅ | Scraper Integration Pending 📋
- Primary Guide: `docs/BRAND_CATEGORY_API_INTEGRATION.md`
- API Reference: `docs/backend-reference/BRAND_CATEGORY_API_REFERENCE.md`

**Tasks for Phase 1.5:**
1. Create `services/backend-api-client.js` - HTTP client for backend APIs
2. Create `services/normalization-service.js` - Brand/category normalization with caching
3. Update `BaseScraper` class - Add normalization methods
4. Update platform scrapers - Integrate normalization calls
5. Write tests - Validate integration
6. Deploy - Staging then production

**Key APIs to Use:**
- `POST /api/v1/brands/normalize` - Normalize single brand (⭐⭐⭐ Most Used)
- `POST /api/v1/brands/normalize/batch` - Batch brand normalization (⭐⭐)
- `POST /api/v1/category-mappings/map` - Map single category (⭐⭐⭐ Most Used)
- `POST /api/v1/category-mappings/map/batch` - Batch category mapping (⭐⭐)

## When in Doubt

- **For API Integration:** Check `docs/BRAND_CATEGORY_API_INTEGRATION.md` first
- **For Scraping Techniques:** Check `docs/SCRAPING_GUIDELINES.md`
- **For Platform-Specific Logic:** Check `docs/PLATFORM_REFERENCE.md`
- **For Database Schema:** Check `docs/DATABASE_SCHEMA.md`
- **For Architecture Questions:** Check `docs/SYSTEM_ARCHITECTURE.md`
- **For Implementation Plan:** Check `docs/IMPLEMENTATION_ROADMAP.md`
- Look at existing platform scrapers for examples
- Follow patterns from the backend repository

---

## 🚀 GitHub Copilot Optimization

### Type Definitions & IntelliSense

This project uses **JSDoc type definitions** to provide IntelliSense without TypeScript:

- **Type Definitions:** `src/types.js` contains all JSDoc typedefs
- **JSConfig:** `jsconfig.json` enables type checking and path aliases
- **Code Patterns:** `docs/CODE_PATTERNS.md` has common implementation patterns

#### Using Types in Your Code

```javascript
/**
 * @typedef {import('./types').Product} Product
 * @typedef {import('./types').ScrapeOptions} ScrapeOptions
 */

/**
 * Scrape products from category
 * @param {string} categoryUrl - Category URL
 * @param {ScrapeOptions} options - Scrape options
 * @returns {Promise<Product[]>}
 */
async function scrapeCategory(categoryUrl, options) {
  // Copilot will now provide smart suggestions based on types!
}
```

### Path Aliases (IntelliSense Support)

Use these aliases for cleaner imports (configured in `jsconfig.json`):

```javascript
// Instead of: require('../../utils/logger')
const { logger } = require('@utils/logger');

// Instead of: require('../../../scrapers/base/StaticScraper')
const StaticScraper = require('@scrapers/base/StaticScraper');

// Available aliases:
// @config/* → src/config/*
// @utils/* → src/utils/*
// @scrapers/* → src/scrapers/*
// @services/* → src/services/*
// @models/* → src/models/*
// @jobs/* → src/jobs/*
// @pipeline/* → src/pipeline/*
```

### Code Snippets & Patterns

Common patterns are documented in `docs/CODE_PATTERNS.md`. Reference them when:
- Creating new platform scrapers
- Implementing normalization services
- Building pipeline stages
- Writing queue workers
- Handling errors
- Writing tests

### Copilot-Friendly Comments

Use descriptive comments to help Copilot understand context:

```javascript
// Normalize brand name using backend API with caching
const normalizedBrand = await normalizationService.normalizeBrand(rawBrand, 'priceoye');

// Extract product data from HTML using Cheerio selectors
const productName = cleanText(this.extractText($, element, this.selectors.productName));

// Retry scraping with exponential backoff (max 3 attempts)
const result = await retryWithBackoff(() => this.fetchAndParse(url), 3);
```

### JSDoc Best Practices

Always document:
- **Function parameters and return types**
- **Class properties**
- **Complex types using @typedef**
- **API response structures**

Example:
```javascript
/**
 * Extract product specifications from detail page
 * @param {import('cheerio').CheerioAPI} $ - Cheerio instance
 * @param {string} selector - CSS selector for specs table
 * @returns {Array<{key: string, value: string, category?: string}>} Specifications array
 * @throws {ScraperError} When specs section is not found
 */
async extractSpecifications($, selector) {
  // Implementation
}
```

### EditorConfig Support

`.editorconfig` ensures consistent formatting across editors. It configures:
- Indent: 2 spaces
- Line endings: LF
- Charset: UTF-8
- Max line length: 100 characters

---

## Important Notes

- **Web Scraping Ethics:** This project is for educational purposes. Always respect robots.txt, rate limits, and ToS
- **Data Quality:** Use backend normalization APIs for consistent brand/category data
- **Performance:** Implement caching for API calls (1-hour TTL recommended)
- **Error Handling:** Always handle API failures gracefully with fallbacks
- **Type Safety:** Use JSDoc typedefs for better IntelliSense and fewer bugs
- **Code Patterns:** Follow established patterns from `docs/CODE_PATTERNS.md`

---

**Remember**: This is a production system. Code quality, reliability, and ethical scraping are paramount.

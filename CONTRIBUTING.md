# Contributing to ShopWise Scraping Service

Thank you for considering contributing to the ShopWise Scraping Service! This document provides guidelines and best practices for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Adding New Platforms](#adding-new-platforms)
6. [Testing Requirements](#testing-requirements)
7. [Documentation](#documentation)
8. [Pull Request Process](#pull-request-process)
9. [Issue Reporting](#issue-reporting)

---

## Code of Conduct

### Our Standards

- **Be respectful**: Treat all contributors with respect
- **Be collaborative**: Work together to solve problems
- **Be patient**: Remember that everyone is learning
- **Be constructive**: Provide helpful feedback
- **Be inclusive**: Welcome diverse perspectives

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or deliberate disruption
- Publishing others' private information
- Any conduct that could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis >= 6.0
- Git
- Code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/shopwise-scraping.git
cd shopwise-scraping
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/shopwise/shopwise-scraping.git
```

4. Install dependencies:

```bash
npm install
npx playwright install chromium
```

5. Set up environment:

```bash
cp .env.example .env
# Edit .env with your local configuration
```

6. Verify setup:

```bash
npm test
```

---

## Development Workflow

### Branch Strategy

We use **Git Flow** branching model:

```
main          → Production-ready code
├─ develop    → Integration branch for features
   ├─ feature/feature-name     → New features
   ├─ bugfix/issue-description → Bug fixes
   ├─ hotfix/critical-bug      → Urgent production fixes
   └─ platform/platform-name   → New platform scrapers
```

### Creating a Branch

```bash
# Update develop branch
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/add-daraz-reviews

# Create platform branch
git checkout -b platform/add-shophive

# Create bugfix branch
git checkout -b bugfix/fix-price-parsing
```

### Development Cycle

1. **Create branch** from `develop`
2. **Make changes** with clear, atomic commits
3. **Write tests** for new functionality
4. **Run tests** to ensure nothing breaks
5. **Update documentation** as needed
6. **Commit** with descriptive messages
7. **Push** to your fork
8. **Create Pull Request** to `develop` branch

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```bash
feat(scraper): add Daraz review scraping support

Implements review extraction from Daraz product pages including:
- Review text and rating extraction
- Verified purchase detection
- Review date parsing

Closes #45

---

fix(pipeline): handle missing product images gracefully

Previously threw error when images array was empty.
Now defaults to empty array and continues processing.

Fixes #67

---

docs(readme): update installation instructions

Added missing step for Playwright browser installation
```

### Code Review Process

All contributions go through code review:

1. **Self-review**: Review your own code before submitting
2. **Automated checks**: CI runs tests and linters
3. **Peer review**: At least one maintainer reviews
4. **Address feedback**: Make requested changes
5. **Approval**: Code is approved and merged

---

## Coding Standards

### JavaScript Style Guide

We follow **Airbnb JavaScript Style Guide** with some modifications:

#### General Rules

```javascript
// ✅ GOOD: Use const for constants
const MAX_RETRIES = 3;

// ❌ BAD: Use var
var maxRetries = 3;

// ✅ GOOD: Use arrow functions
const multiply = (a, b) => a * b;

// ❌ BAD: Unnecessary function keyword
function multiply(a, b) {
  return a * b;
}

// ✅ GOOD: Destructuring
const { name, price } = product;

// ❌ BAD: Repetitive access
const name = product.name;
const price = product.price;
```

#### Async/Await

```javascript
// ✅ GOOD: Use async/await
async function scrapeProduct(url) {
  try {
    const page = await browser.newPage();
    const data = await page.evaluate(() => {...});
    return data;
  } catch (error) {
    logger.error('Scraping failed', { error });
    throw error;
  }
}

// ❌ BAD: Promise chains
function scrapeProduct(url) {
  return browser.newPage()
    .then(page => page.evaluate(() => {...}))
    .then(data => data)
    .catch(error => {
      logger.error('Scraping failed', { error });
      throw error;
    });
}
```

#### Error Handling

```javascript
// ✅ GOOD: Specific error handling
try {
  const data = await scraper.scrape(url);
} catch (error) {
  if (error instanceof NetworkError) {
    logger.warn('Network error, retrying...', { error });
    return await retry(() => scraper.scrape(url));
  } else if (error instanceof ValidationError) {
    logger.error('Invalid data format', { error, url });
    throw new ScrapingError('Data validation failed', { cause: error });
  } else {
    throw error;
  }
}

// ❌ BAD: Generic error swallowing
try {
  const data = await scraper.scrape(url);
} catch (error) {
  console.log('Error:', error);
  return null;
}
```

#### Naming Conventions

```javascript
// Classes: PascalCase
class ProductScraper { }

// Functions/Variables: camelCase
function extractProductData() { }
const productName = 'iPhone';

// Constants: UPPER_SNAKE_CASE
const MAX_CONCURRENT_PAGES = 5;
const DEFAULT_TIMEOUT = 30000;

// Private properties: underscore prefix
class Scraper {
  constructor() {
    this._browser = null;
  }
}

// File names: kebab-case
// product-scraper.js
// data-pipeline.js
// platform-config.js
```

### Code Organization

#### File Structure

```javascript
/**
 * Module description
 * 
 * @module scrapers/daraz
 */

// 1. External imports
const playwright = require('playwright');
const cheerio = require('cheerio');

// 2. Internal imports
const BaseScraper = require('../base/base-scraper');
const { logger } = require('../../utils/logger');

// 3. Constants
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;

// 4. Main class
class DarazScraper extends BaseScraper {
  constructor(config) {
    super(config);
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
  }

  /**
   * Scrape product data from Daraz
   * 
   * @param {string} url - Product URL
   * @returns {Promise<Object>} Scraped product data
   */
  async scrape(url) {
    // Implementation
  }

  // Private methods
  async _extractProductName(page) {
    // Implementation
  }
}

// 5. Exports
module.exports = DarazScraper;
```

#### Class Design

```javascript
// ✅ GOOD: Single Responsibility Principle
class ProductExtractor {
  extractName(html) { }
  extractPrice(html) { }
  extractImages(html) { }
}

class ProductValidator {
  validateName(name) { }
  validatePrice(price) { }
}

// ❌ BAD: God class
class ProductHandler {
  extract() { }
  validate() { }
  clean() { }
  transform() { }
  save() { }
  sendEmail() { }
  logMetrics() { }
}
```

### ESLint Configuration

Ensure your code passes ESLint:

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Prettier Formatting

Format code before committing:

```bash
npm run format
```

---

## Adding New Platforms

### Step-by-Step Guide

#### 1. Create Platform Configuration

Create `src/config/platforms/YOUR_PLATFORM.json`:

```json
{
  "platform_id": "example-pk",
  "name": "Example Shop Pakistan",
  "domain": "example.pk",
  "base_url": "https://www.example.pk",
  
  "requires_javascript": true,
  "anti_bot_protection": "moderate",
  
  "scraping_strategy": "browser",
  
  "rate_limiting": {
    "requests_per_minute": 30,
    "min_delay_ms": 1500,
    "max_delay_ms": 3000
  },
  
  "navigation": {
    "wait_for_selector": ".product-container",
    "wait_timeout": 30000,
    "scroll_to_load": false
  },
  
  "selectors": {
    "product_name": {
      "selector": "h1.product-title",
      "type": "text",
      "required": true
    },
    "price": {
      "selector": ".price-current",
      "type": "text",
      "required": true,
      "parser": "price"
    },
    "brand": {
      "selector": ".brand-name",
      "type": "text",
      "required": false
    },
    "description": {
      "selector": ".product-description",
      "type": "html",
      "required": false
    },
    "images": {
      "selector": ".product-image img",
      "type": "attribute",
      "attribute": "src",
      "multiple": true,
      "required": false
    },
    "rating": {
      "selector": ".rating-value",
      "type": "text",
      "parser": "float",
      "required": false
    },
    "review_count": {
      "selector": ".review-count",
      "type": "text",
      "parser": "int",
      "required": false
    },
    "availability": {
      "selector": ".stock-status",
      "type": "text",
      "transformer": "availability_status",
      "required": false
    }
  },
  
  "pagination": {
    "next_page_selector": "a.next-page",
    "max_pages": 50
  },
  
  "reviews": {
    "enabled": true,
    "reviews_url_pattern": "{product_url}/reviews",
    "selectors": {
      "review_text": ".review-content",
      "rating": ".review-stars",
      "reviewer_name": ".reviewer-name",
      "review_date": ".review-date",
      "verified_purchase": ".verified-badge"
    }
  }
}
```

#### 2. Create Platform Scraper (Optional)

If the universal scraper isn't sufficient, create a custom scraper:

`src/scrapers/platforms/example-pk.scraper.js`:

```javascript
/**
 * Example Shop Pakistan Scraper
 * 
 * @module scrapers/platforms/example-pk
 */

const BaseScraper = require('../base/base-scraper');
const { logger } = require('../../utils/logger');

class ExamplePkScraper extends BaseScraper {
  constructor(config) {
    super(config);
  }

  /**
   * Extract product data from Example.pk
   * Override if platform has unique structure
   */
  async extractData(page) {
    return await page.evaluate(() => {
      // Custom extraction logic
      return {
        name: document.querySelector('h1.product-title')?.textContent,
        price: document.querySelector('.price-current')?.textContent,
        // ... more fields
      };
    });
  }

  /**
   * Handle platform-specific quirks
   */
  async beforeScrape(page) {
    // Close popup if exists
    try {
      await page.click('.popup-close', { timeout: 2000 });
    } catch (error) {
      // Popup not found, continue
    }
  }
}

module.exports = ExamplePkScraper;
```

#### 3. Add Tests

Create test file `tests/unit/scrapers/platforms/example-pk.test.js`:

```javascript
const ExamplePkScraper = require('../../../../src/scrapers/platforms/example-pk.scraper');
const config = require('../../../../src/config/platforms/example-pk.json');
const fs = require('fs');
const path = require('path');

describe('Example.pk Scraper', () => {
  let scraper;

  beforeAll(() => {
    scraper = new ExamplePkScraper(config);
  });

  describe('Product Scraping', () => {
    it('should extract product name correctly', async () => {
      const html = fs.readFileSync(
        path.join(__dirname, '../../../fixtures/html/example-pk-product.html'),
        'utf-8'
      );

      const data = await scraper.parseHtml(html);
      
      expect(data.name).toBe('Samsung Galaxy S23 Ultra');
      expect(data.name).toBeTruthy();
    });

    it('should parse price correctly', async () => {
      const html = fs.readFileSync(
        path.join(__dirname, '../../../fixtures/html/example-pk-product.html'),
        'utf-8'
      );

      const data = await scraper.parseHtml(html);
      
      expect(data.price).toBe(349999);
      expect(typeof data.price).toBe('number');
    });

    it('should handle missing optional fields', async () => {
      const html = '<html><body><h1>Product</h1></body></html>';
      
      const data = await scraper.parseHtml(html);
      
      expect(data.brand).toBeUndefined();
      expect(data.description).toBeUndefined();
    });
  });
});
```

#### 4. Add HTML Fixture

Save sample HTML for testing:

`tests/fixtures/html/example-pk-product.html`

#### 5. Update Documentation

Create platform guide `docs/PLATFORM_GUIDES/example-pk.md`:

```markdown
# Example Shop Pakistan Scraper Guide

## Overview

Example.pk is a Pakistani e-commerce platform specializing in...

## Configuration

- **Rate Limit**: 30 requests/minute
- **Anti-Bot**: Moderate (requires browser automation)
- **JavaScript**: Required

## Selectors

### Product Page

| Field | Selector | Notes |
|-------|----------|-------|
| Name | `h1.product-title` | Required |
| Price | `.price-current` | Required |
| Images | `.product-image img[src]` | Multiple |

### Known Issues

- Popup appears on first page load
- Images lazy load on scroll
- Price format: "Rs. 12,345"

## Testing

```bash
npm run test:scraper -- example-pk https://example.pk/products/...
```

## Maintenance

Last updated: 2024-11-14
Selectors verified: Yes
```

#### 6. Test Locally

```bash
# Validate configuration
npm run validate:config -- example-pk

# Test scraper
npm run test:scraper -- example-pk https://example.pk/products/sample

# Run unit tests
npm test -- scrapers/platforms/example-pk
```

#### 7. Submit Pull Request

See [Pull Request Process](#pull-request-process) below.

---

## Testing Requirements

### Test Coverage

- **Minimum coverage**: 80%
- **Critical paths**: 100% coverage
- **New features**: Must include tests

### Test Types

#### 1. Unit Tests

Test individual functions in isolation:

```javascript
describe('ProductCleaner', () => {
  const cleaner = new ProductCleaner();

  it('should remove HTML tags from description', () => {
    const input = '<p>Great <strong>product</strong>!</p>';
    const output = cleaner.cleanDescription(input);
    expect(output).toBe('Great product!');
  });

  it('should normalize price string to number', () => {
    expect(cleaner.parsePrice('Rs. 12,345')).toBe(12345);
    expect(cleaner.parsePrice('PKR 1,234.50')).toBe(1234.5);
    expect(cleaner.parsePrice('Free')).toBe(0);
  });
});
```

#### 2. Integration Tests

Test multiple components together:

```javascript
describe('Product Scraping Pipeline', () => {
  it('should scrape, clean, and save product', async () => {
    const url = 'https://test.example.pk/product/123';
    const scraper = ScraperFactory.create('example-pk');
    
    const rawData = await scraper.scrape(url);
    const cleaned = await pipeline.process(rawData);
    const saved = await productRepository.save(cleaned);
    
    expect(saved._id).toBeDefined();
    expect(saved.name).toBe('Test Product');
  });
});
```

#### 3. E2E Tests

Test real scraping (use with caution):

```javascript
describe('Daraz E2E', () => {
  it('should scrape real product page', async () => {
    const url = 'https://www.daraz.pk/products/...';
    const scraper = new DarazScraper(config);
    
    const data = await scraper.scrape(url);
    
    expect(data.name).toBeTruthy();
    expect(data.price).toBeGreaterThan(0);
  }, 30000); // 30 second timeout
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- scrapers/daraz

# E2E tests (careful!)
npm run test:e2e
```

---

## Documentation

### Required Documentation

When adding features, update:

1. **README.md**: If changing setup/usage
2. **Code comments**: JSDoc for all public methods
3. **Platform guides**: For new platforms
4. **API docs**: If adding/changing APIs
5. **CHANGELOG.md**: Document changes

### JSDoc Format

```javascript
/**
 * Scrape product data from a URL
 * 
 * @param {string} url - The product page URL
 * @param {Object} [options] - Scraping options
 * @param {number} [options.timeout=30000] - Request timeout in ms
 * @param {boolean} [options.includeReviews=false] - Whether to scrape reviews
 * @returns {Promise<Product>} The scraped product data
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

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with `develop`

### PR Template

When creating a PR, fill out the template:

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made

- Added Daraz review scraping
- Updated product schema validation
- Fixed price parsing bug

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] Dependent changes merged

## Related Issues

Closes #123
Relates to #456
```

### Review Process

1. **Automated Checks**: CI runs tests and linters
2. **Code Review**: Maintainer reviews code
3. **Feedback**: Address review comments
4. **Approval**: Once approved, PR is merged
5. **Cleanup**: Delete branch after merge

---

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Scrape URL '...'
2. Check output
3. See error

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 11]
- Node.js version: [e.g., 18.17.0]
- Package version: [e.g., 1.2.0]

**Additional context**
Any other information.
```

### Feature Requests

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Additional context**
Any other context or screenshots.
```

---

## Questions?

- **Slack**: #shopwise-scraping
- **Email**: dev@shopwise.pk
- **Discussions**: GitHub Discussions

---

Thank you for contributing to ShopWise! 🎉

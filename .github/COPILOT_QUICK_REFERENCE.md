# GitHub Copilot Quick Reference

## 🚀 Type Definitions

```javascript
/**
 * Import and use types
 * @typedef {import('./types').Product} Product
 * @typedef {import('./types').ScrapeOptions} ScrapeOptions
 * @param {ScrapeOptions} options
 * @returns {Promise<Product[]>}
 */
```

## 📁 Path Aliases

```javascript
// Use these instead of relative paths:
require('@config/config')          // src/config/*
require('@utils/logger')            // src/utils/*
require('@scrapers/base/BaseScraper') // src/scrapers/*
require('@services/normalization-service') // src/services/*
require('@models/Product')          // src/models/*
require('@jobs/workers/scraping')   // src/jobs/*
require('@pipeline/stages/clean')   // src/pipeline/*
```

## ✨ Code Snippets

Type these and press **Tab**:

| Snippet | Description |
|---------|-------------|
| `scraper-platform` | Full platform scraper class |
| `extract-product` | Product extraction method |
| `normalize-brand` | Brand normalization call |
| `map-category` | Category mapping call |
| `try-log` | Try-catch with logging |
| `job-data` | Queue job data structure |
| `jsdoc-fn` | JSDoc function template |
| `jsdoc-typedef` | JSDoc type definition |
| `pipeline-stage` | Pipeline stage template |
| `test-suite` | Jest test suite |

## 💡 Copilot-Friendly Comments

```javascript
// Good: Descriptive intent
// Normalize brand using backend API with 24-hour cache
const brand = await normalizeBrand(raw, platform);

// Good: Explains algorithm
// Retry scraping with exponential backoff (max 3 attempts)
const result = await retryWithBackoff(() => fetch(url), 3);

// Bad: Obvious statement
// Get the logger
const logger = require('@utils/logger');
```

## 📖 JSDoc Patterns

### Function
```javascript
/**
 * Extract product data from HTML
 * @param {import('cheerio').CheerioAPI} $ - Cheerio instance
 * @param {string} selector - CSS selector
 * @returns {Promise<Product>} Extracted product
 * @throws {ScraperError} When product data is invalid
 */
```

### Class
```javascript
/**
 * PriceOye Platform Scraper
 * Scrapes phones and electronics from PriceOye.pk
 */
class PriceOyeScraper extends StaticScraper {
  // ...
}
```

### Typedef
```javascript
/**
 * @typedef {Object} CustomType
 * @property {string} id - Unique identifier
 * @property {number} value - Numeric value
 * @property {Date} createdAt - Creation timestamp
 */
```

## ⌨️ VS Code Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Space` | Trigger IntelliSense |
| `Ctrl+I` | Trigger Copilot suggestions |
| `Alt+\` | Inline Copilot suggestions |
| `Ctrl+Enter` | Open Copilot panel |
| `F12` | Go to definition |
| `Alt+F12` | Peek definition |
| `Shift+F12` | Find all references |

## 🔧 Debug Configs

Press **F5** or use Run menu:

1. **Launch Main Application** - Run `src/index.js`
2. **Debug Current File** - Debug any file
3. **Run Jest Tests** - Run all tests
4. **Debug Current Test** - Debug single test file
5. **Attach to Process** - Attach debugger

## 📦 Recommended Extensions

Install these for best experience:
- GitHub Copilot
- GitHub Copilot Chat
- ESLint
- Prettier
- Path IntelliSense
- Jest Runner

Click "Install All" when VS Code prompts!

## 🎯 Quick Start Checklist

- [ ] Install recommended extensions
- [ ] Read `.github/copilot-instructions.md`
- [ ] Browse `docs/CODE_PATTERNS.md`
- [ ] Check `src/types.js` for available types
- [ ] Try code snippets (type `scraper` + Tab)
- [ ] Use path aliases in imports
- [ ] Write JSDoc comments
- [ ] Let Copilot help!

---

**Pro Tip:** Write a descriptive comment about what you want to do, then let Copilot generate the code!

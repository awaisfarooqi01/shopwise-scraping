# PriceOye Scraping Strategy

**Date:** November 17, 2025  
**Target Platform:** PriceOye (https://priceoye.pk)  
**Phase:** 2 - Initial Implementation  
**Scope:** Mobiles Category (expandable to other categories)

---

## Executive Summary

This document outlines the complete scraping strategy for PriceOye, based on analysis of their website structure. The strategy focuses on scraping mobile phones initially, with architecture designed to easily expand to other categories.

---

## PriceOye Website Structure Analysis

### 1. URL Patterns

#### Category Pages
```
Pattern: https://priceoye.pk/{category}
Example: https://priceoye.pk/mobiles
Purpose: Shows all products in a category (all brands)
Features: Pagination, filtering, sorting
```

#### Brand-Specific Pages
```
Pattern: https://priceoye.pk/{category}/{brand}
Example: https://priceoye.pk/mobiles/samsung
Purpose: Shows products of specific brand in category
Features: Pagination, filtering, sorting
```

#### Product Pages
```
Pattern: https://priceoye.pk/{category}/{brand}/{product-slug}
Example: https://priceoye.pk/mobiles/samsung/samsung-galaxy-s25-ultra
Purpose: Individual product details
Features: Full specifications, reviews, price history
```

### 2. Site Structure

```
PriceOye
├── Categories
│   ├── Mobiles (1038 results)
│   ├── Smart Watches
│   ├── Wireless Earbuds
│   ├── Air Purifiers
│   ├── Personal Cares
│   ├── Mobiles Accessories
│   ├── Bluetooth Speakers
│   └── Power Banks
│
├── Mobiles Category
│   ├── Brands (in sidebar)
│   │   ├── Samsung
│   │   ├── Infinix
│   │   ├── Oppo
│   │   ├── Xiaomi
│   │   ├── Vivo
│   │   ├── Tecno
│   │   ├── Realme
│   │   ├── Honor
│   │   └── More Brands
│   │
│   └── Products (1038 total)
│       ├── Page 1 (products 1-20)
│       ├── Page 2 (products 21-40)
│       └── ... (paginated)
│
└── Brand Pages (e.g., Samsung)
    ├── Products (351 Samsung mobiles)
    └── Pagination
```

### 3. Observed Product Data Structure

From screenshots, each product card contains:
- **Product Image**
- **Product Name** (e.g., "Samsung Galaxy S25 Ultra")
- **Rating** (e.g., 4.8 ⭐ with review count "19 Reviews")
- **Current Price** (e.g., "Rs 52,499")
- **Original Price** (strikethrough, e.g., "Rs 60,000")
- **Discount Percentage** (e.g., "13% OFF")

### 4. Data Extraction Points

#### Listing Pages (Category/Brand)
```javascript
{
  productUrl: "https://priceoye.pk/mobiles/samsung/samsung-galaxy-s25-ultra",
  productName: "Samsung Galaxy S25 Ultra",
  currentPrice: 52499,
  originalPrice: 60000,
  discountPercent: 13,
  rating: 4.8,
  reviewCount: 19,
  imageUrl: "...",
  brand: "Samsung",
  category: "Mobiles"
}
```

#### Product Detail Pages
```javascript
{
  // Basic Info
  name: "Samsung Galaxy S25 Ultra",
  brand: "Samsung",
  category: "Mobiles",
  
  // Pricing
  currentPrice: 52499,
  originalPrice: 60000,
  discountPercent: 13,
  currency: "PKR",
  
  // Reviews
  averageRating: 4.8,
  reviewCount: 19,
  
  // Media
  images: [...],
  videos: [...],
  
  // Details
  description: "...",
  specifications: {
    "Display": "6.8 inch",
    "Processor": "Snapdragon 8 Gen 3",
    "RAM": "12GB",
    "Storage": "256GB",
    // ... more specs
  },
  
  // Variants (if available)
  variants: {
    "color": ["Black", "White", "Green"],
    "storage": ["128GB", "256GB", "512GB"]
  },
  
  // Availability
  availability: "in_stock",
  deliveryTime: "2-3 days"
}
```

---

## Scraping Strategy

### Phase 2.1: Single Product Scraping ✅ (Week 1, Days 1-2)

**Objective:** Scrape one product successfully and store in database

**Approach:**
1. Start with a specific product URL
2. Extract all product data
3. Normalize brand using existing service
4. Map category using existing service
5. Store in MongoDB
6. Verify data integrity

**Example Target:**
```
URL: https://priceoye.pk/mobiles/samsung/samsung-galaxy-s25-ultra
Expected Data: All fields per product schema
```

### Phase 2.2: Brand-Specific Scraping ✅ (Week 1, Days 3-4)

**Objective:** Scrape all products of a specific brand

**Approach:**
1. Start with brand page (e.g., /mobiles/samsung)
2. Extract product URLs from listing
3. Handle pagination (351 Samsung products ÷ 20 per page = ~18 pages)
4. Scrape each product
5. Store in database
6. Progress tracking

**Example Target:**
```
URL: https://priceoye.pk/mobiles/samsung
Expected: 351 Samsung mobile products
Pages: ~18 pages
```

### Phase 2.3: Category-Wide Scraping 🔄 (Week 2, Days 1-2)

**Objective:** Scrape all products in Mobiles category

**Approach:**
1. Start with category page (/mobiles)
2. Extract all product URLs
3. Handle pagination (1038 products ÷ 20 per page = ~52 pages)
4. Scrape each product
5. Batch processing
6. Error recovery

**Example Target:**
```
URL: https://priceoye.pk/mobiles
Expected: 1038 mobile products
Pages: ~52 pages
Brands: Samsung, Apple, Xiaomi, Vivo, Oppo, etc.
```

### Phase 2.4: Multi-Category Scraping 📋 (Week 2, Days 3-4)

**Objective:** Extend to other categories

**Approach:**
1. Implement category configuration
2. Scrape Smart Watches, Earbuds, etc.
3. Reuse scraping logic
4. Category-specific data handling

**Target Categories:**
```
- Mobiles ✅ (primary)
- Smart Watches
- Wireless Earbuds
- Air Purifiers
- Personal Cares
- Mobiles Accessories
- Bluetooth Speakers
- Power Banks
```

---

## Technical Implementation Strategy

### 1. Scraper Architecture

```
PriceOyeScraper (Main Class)
├── ListingScraper (Category/Brand Pages)
│   ├── extractProductUrls()
│   ├── handlePagination()
│   └── extractListingData()
│
├── ProductScraper (Individual Products)
│   ├── extractProductDetails()
│   ├── extractSpecifications()
│   ├── extractMedia()
│   └── extractReviews()
│
├── DataNormalizer (Integration Layer)
│   ├── normalizeBrand()
│   ├── mapCategory()
│   ├── parsePrice()
│   └── detectVariants()
│
└── DataStorage (Database Layer)
    ├── saveProduct()
    ├── updateProduct()
    └── checkDuplicate()
```

### 2. Technology Stack

#### Web Scraping
```javascript
// Playwright (Recommended for PriceOye)
// Reasons:
// - Handles JavaScript rendering
// - Better for dynamic content
// - Built-in browser automation
// - Network interception
// - Mobile viewport support

const { chromium } = require('playwright');

// Cheerio (For HTML parsing)
// Reasons:
// - Fast HTML parsing
// - jQuery-like syntax
// - Lightweight
// - Works with Playwright HTML

const cheerio = require('cheerio');
```

#### Queue Management
```javascript
// p-queue (Concurrency control)
const PQueue = require('p-queue');

const queue = new PQueue({
  concurrency: 3, // 3 concurrent requests
  interval: 1000, // 1 second interval
  intervalCap: 3  // Max 3 requests per interval
});
```

#### Error Handling & Retry
```javascript
// p-retry (Retry failed requests)
const pRetry = require('p-retry');

const result = await pRetry(
  () => scrapePage(url),
  {
    retries: 3,
    onFailedAttempt: error => {
      console.log(`Attempt ${error.attemptNumber} failed`);
    }
  }
);
```

### 3. HTML Selectors Strategy

Based on typical e-commerce structure, expected selectors:

#### Listing Page Selectors
```javascript
const SELECTORS = {
  // Product cards
  productCard: '.product-card, .product-item, [data-product-id]',
  productLink: 'a.product-link, .product-card a',
  productName: '.product-name, .product-title, h3',
  productPrice: '.price-current, .price-new, .current-price',
  productOriginalPrice: '.price-old, .price-original, .strike-price',
  productDiscount: '.discount, .sale-badge, .discount-percent',
  productRating: '.rating, .stars, [data-rating]',
  productReviewCount: '.review-count, .reviews',
  productImage: 'img.product-image, .product-img',
  
  // Pagination
  pagination: '.pagination, .page-numbers',
  nextPage: '.next-page, .pagination-next',
  pageNumber: '.page-number, .pagination a'
};
```

#### Product Detail Page Selectors
```javascript
const PRODUCT_SELECTORS = {
  // Basic Info
  productName: 'h1.product-title, .product-name',
  brand: '.brand-name, [data-brand]',
  category: '.breadcrumb, .category-path',
  
  // Pricing
  currentPrice: '.price-current, .selling-price',
  originalPrice: '.price-original, .mrp',
  discount: '.discount-percent, .save-amount',
  
  // Media
  mainImage: '.main-image, .product-image-main',
  thumbnails: '.image-thumbnails img, .product-gallery img',
  videos: 'video, .product-video',
  
  // Specifications
  specsTable: '.specifications-table, .product-specs',
  specRow: 'tr, .spec-row',
  specKey: '.spec-name, td:first-child',
  specValue: '.spec-value, td:last-child',
  
  // Description
  description: '.product-description, .description-content',
  
  // Reviews
  ratingValue: '.rating-value, [itemprop="ratingValue"]',
  reviewCount: '.review-count, [itemprop="reviewCount"]',
  
  // Availability
  stockStatus: '.stock-status, .availability',
  deliveryInfo: '.delivery-time, .shipping-info',
  
  // Variants
  colorOptions: '.color-options button, .color-swatch',
  storageOptions: '.storage-options button, .memory-variant'
};
```

### 4. Data Flow

```
1. Input: URL (category/brand/product)
   ↓
2. Fetch Page (Playwright)
   ↓
3. Parse HTML (Cheerio)
   ↓
4. Extract Data (Selectors)
   ↓
5. Normalize Data (NormalizationService)
   ├── Brand → Backend API
   ├── Category → Backend API
   ├── Price → parsePrice()
   └── Variants → detectVariants()
   ↓
6. Validate Data (Schema validation)
   ↓
7. Check Duplicates (MongoDB query)
   ↓
8. Store/Update Product (MongoDB)
   ↓
9. Log Results (Winston)
```

---

## Database Integration Strategy

### 1. Product Schema Mapping

```javascript
// PriceOye Scraped Data → Database Schema

{
  // Platform (Required)
  platform_id: ObjectId("...PriceOye..."),
  platform_name: "PriceOye",
  original_url: "https://priceoye.pk/mobiles/samsung/...",
  
  // Basic Info (Required)
  name: "Samsung Galaxy S25 Ultra",
  
  // Brand (Normalized via Backend API)
  brand: "Samsung", // Original
  brand_id: ObjectId("..."), // From normalization
  
  // Category (Mapped via Backend API)
  category_name: "Mobiles", // Original
  category_id: ObjectId("..."), // From mapping
  
  // Pricing (Required)
  price: 52499, // Current price
  sale_price: null, // If on sale
  currency: "PKR",
  sale_percentage: 13, // Discount
  
  // Reviews
  average_rating: 4.8,
  review_count: 19,
  
  // Media
  media: {
    images: [
      {
        url: "...",
        type: "main",
        alt_text: "Samsung Galaxy S25 Ultra"
      }
    ]
  },
  
  // Specifications (Key-Value pairs)
  specifications: {
    "Display": "6.8 inch",
    "Processor": "Snapdragon 8 Gen 3",
    "RAM": "12GB",
    "Storage": "256GB"
  },
  
  // Variants (if applicable)
  variants: {
    "color": ["Black", "White", "Green"],
    "storage": ["128GB", "256GB", "512GB"]
  },
  
  // Availability
  availability: "in_stock",
  delivery_time: "2-3 days",
  
  // Metadata (Auto-populated)
  platform_metadata: {
    original_category: "Mobiles",
    original_brand: "Samsung",
    original_category_path: "/mobiles"
  },
  
  mapping_metadata: {
    category_confidence: 0.95,
    brand_confidence: 1.0,
    category_source: "auto",
    brand_source: "exact_match",
    needs_review: false
  },
  
  // Timestamps (Auto)
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Brand Normalization Flow

```javascript
// Step 1: Extract brand from page
const scrapedBrand = "Samsung"; // or "SAMSUNG" or "samsung"

// Step 2: Normalize via Backend API
const normalized = await normalizationService.normalizeBrand(scrapedBrand);
// Returns:
// {
//   brand_id: ObjectId("..."),
//   canonical_name: "Samsung",
//   normalized_name: "samsung",
//   confidence: 1.0,
//   source: "exact_match"
// }

// Step 3: Store in product
product.brand = scrapedBrand; // Original
product.brand_id = normalized.brand_id; // Normalized
product.mapping_metadata.brand_confidence = normalized.confidence;
product.mapping_metadata.brand_source = normalized.source;
```

### 3. Category Mapping Flow

```javascript
// Step 1: Extract category from page
const scrapedCategory = "Mobiles";

// Step 2: Map via Backend API
const mapped = await normalizationService.mapCategory(scrapedCategory);
// Returns:
// {
//   category_id: ObjectId("..."),
//   category_name: "Electronics > Mobile Phones",
//   confidence: 0.95,
//   source: "auto"
// }

// Step 3: Store in product
product.category_name = scrapedCategory; // Original
product.category_id = mapped.category_id; // Mapped
product.platform_metadata.original_category = scrapedCategory;
product.mapping_metadata.category_confidence = mapped.confidence;
product.mapping_metadata.category_source = mapped.source;
```

### 4. Duplicate Detection

```javascript
// Check if product already exists
const existing = await Product.findOne({
  platform_id: priceOyePlatformId,
  original_url: productUrl
});

if (existing) {
  // Update existing product
  existing.price = newPrice;
  existing.availability = newAvailability;
  existing.updatedAt = new Date();
  await existing.save();
} else {
  // Create new product
  const product = new Product(productData);
  await product.save();
}
```

---

## Scraping Configuration

### 1. Scraper Settings

```javascript
const SCRAPER_CONFIG = {
  // Browser Settings
  browser: {
    headless: true,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  },
  
  // Rate Limiting
  rateLimit: {
    concurrent: 3, // Max 3 concurrent requests
    interval: 1000, // 1 second between batches
    requestsPerInterval: 3 // 3 requests per second max
  },
  
  // Retry Logic
  retry: {
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    backoff: 'exponential' // 2s, 4s, 8s
  },
  
  // Pagination
  pagination: {
    maxPages: null, // null = all pages
    productsPerPage: 20,
    delayBetweenPages: 1500 // 1.5 seconds
  },
  
  // Data Extraction
  extraction: {
    waitForSelectors: true,
    timeout: 10000,
    screenshotOnError: true
  }
};
```

### 2. Category Configuration

```javascript
const CATEGORIES = {
  mobiles: {
    url: '/mobiles',
    name: 'Mobiles',
    enabled: true,
    priority: 1,
    brands: [
      'samsung',
      'apple',
      'xiaomi',
      'vivo',
      'oppo',
      'infinix',
      'tecno',
      'realme',
      'honor'
    ]
  },
  smartWatches: {
    url: '/smart-watches',
    name: 'Smart Watches',
    enabled: false, // Enable later
    priority: 2
  },
  wirelessEarbuds: {
    url: '/wireless-earbuds',
    name: 'Wireless Earbuds',
    enabled: false,
    priority: 3
  }
  // ... more categories
};
```

### 3. Brand Configuration

```javascript
const BRANDS = {
  samsung: {
    url: '/mobiles/samsung',
    category: 'mobiles',
    enabled: true,
    expectedProducts: 351,
    priority: 1
  },
  apple: {
    url: '/mobiles/apple',
    category: 'mobiles',
    enabled: true,
    expectedProducts: 50,
    priority: 1
  },
  xiaomi: {
    url: '/mobiles/xiaomi',
    category: 'mobiles',
    enabled: true,
    expectedProducts: 200,
    priority: 2
  }
  // ... more brands
};
```

---

## Implementation Plan

### Week 1: Single Product & Brand Scraping

#### Day 1-2: Single Product Scraper
```
✅ Tasks:
   1. Set up Playwright
   2. Create PriceOyeScraper class
   3. Implement product detail scraper
   4. Extract all product fields
   5. Integrate normalization service
   6. Store in database
   7. Test with 5 different products

📁 Files to Create:
   - src/scrapers/priceoye-scraper.js
   - src/scrapers/base-scraper.js
   - src/scrapers/selectors/priceoye-selectors.js
   - src/utils/scraper-helpers.js

🧪 Tests:
   - tests/scrapers/priceoye-scraper.test.js
   - Test data extraction
   - Test normalization integration
   - Test database storage
```

#### Day 3-4: Brand Page Scraper
```
✅ Tasks:
   1. Implement listing page scraper
   2. Handle pagination
   3. Extract product URLs
   4. Batch process products
   5. Progress tracking
   6. Error recovery
   7. Test with Samsung brand (351 products)

📁 Files to Create:
   - src/scrapers/listing-scraper.js
   - src/scrapers/batch-processor.js
   - src/utils/progress-tracker.js

🧪 Tests:
   - Test pagination handling
   - Test URL extraction
   - Test batch processing
```

### Week 2: Category & Multi-Category Scraping

#### Day 1-2: Category Scraper
```
✅ Tasks:
   1. Extend to category pages
   2. Handle all brands in category
   3. Optimize performance
   4. Add queue management
   5. Implement rate limiting
   6. Test with Mobiles category (1038 products)

📁 Files to Update:
   - src/scrapers/priceoye-scraper.js
   - src/scrapers/batch-processor.js

🧪 Tests:
   - Test category scraping
   - Test rate limiting
   - Test queue management
```

#### Day 3-4: Multi-Category Support
```
✅ Tasks:
   1. Add category configuration
   2. Support multiple categories
   3. Category-specific handling
   4. Documentation
   5. Final testing

📁 Files to Create:
   - src/config/scraper-config.js
   - docs/SCRAPER_USAGE_GUIDE.md

🧪 Tests:
   - End-to-end tests
   - Performance tests
```

---

## Code Structure

### 1. File Organization

```
shopwise-scraping/
├── src/
│   ├── scrapers/
│   │   ├── base-scraper.js           # Base scraper class
│   │   ├── priceoye-scraper.js       # PriceOye main scraper
│   │   ├── listing-scraper.js        # Category/brand listings
│   │   ├── product-scraper.js        # Individual products
│   │   └── batch-processor.js        # Batch processing
│   │
│   ├── selectors/
│   │   └── priceoye-selectors.js     # CSS selectors
│   │
│   ├── config/
│   │   └── scraper-config.js         # Scraper configuration
│   │
│   └── utils/
│       ├── scraper-helpers.js        # Helper functions
│       ├── progress-tracker.js       # Progress tracking
│       └── html-parser.js            # HTML parsing utilities
│
├── tests/
│   └── scrapers/
│       ├── priceoye-scraper.test.js
│       └── batch-processor.test.js
│
└── docs/
    ├── PRICEOYE_SCRAPING_STRATEGY.md  # This document
    └── SCRAPER_USAGE_GUIDE.md         # Usage instructions
```

### 2. Class Structure

```javascript
// Base Scraper (Abstract)
class BaseScraper {
  constructor(config);
  async initBrowser();
  async closeBrowser();
  async fetchPage(url);
  async extractData(page, selectors);
  async saveProduct(productData);
}

// PriceOye Scraper (Concrete)
class PriceOyeScraper extends BaseScraper {
  async scrapeProduct(url);
  async scrapeBrand(brandSlug);
  async scrapeCategory(categorySlug);
  async scrapeAll();
}

// Listing Scraper (Helper)
class ListingScraper {
  async extractProductUrls(page);
  async handlePagination(page);
  async getPageCount(page);
}

// Product Scraper (Helper)
class ProductScraper {
  async extractBasicInfo(page);
  async extractPricing(page);
  async extractSpecifications(page);
  async extractMedia(page);
  async extractReviews(page);
}

// Batch Processor (Utility)
class BatchProcessor {
  constructor(queue);
  async processUrls(urls);
  async processWithRetry(url);
  getProgress();
  getErrors();
}
```

---

## Error Handling Strategy

### 1. Error Types

```javascript
class ScraperError extends Error {
  constructor(message, type, url, data) {
    super(message);
    this.type = type;
    this.url = url;
    this.data = data;
    this.timestamp = new Date();
  }
}

// Error Types
const ERROR_TYPES = {
  NETWORK_ERROR: 'Network request failed',
  TIMEOUT_ERROR: 'Request timeout',
  PARSE_ERROR: 'Failed to parse HTML',
  SELECTOR_ERROR: 'Selector not found',
  VALIDATION_ERROR: 'Data validation failed',
  DATABASE_ERROR: 'Database operation failed',
  RATE_LIMIT_ERROR: 'Rate limit exceeded'
};
```

### 2. Retry Logic

```javascript
async function scrapeWithRetry(url, maxRetries = 3) {
  return await pRetry(
    async () => {
      try {
        return await scrapePage(url);
      } catch (error) {
        // Log attempt
        logger.warn(`Retry attempt for ${url}`, {
          attempt: error.attemptNumber,
          retriesLeft: error.retriesLeft
        });
        
        // Don't retry on validation errors
        if (error.type === 'VALIDATION_ERROR') {
          throw new pRetry.AbortError(error);
        }
        
        throw error;
      }
    },
    {
      retries: maxRetries,
      factor: 2, // Exponential backoff
      minTimeout: 2000,
      maxTimeout: 10000,
      onFailedAttempt: error => {
        logger.error(`Failed attempt ${error.attemptNumber}`, {
          url,
          error: error.message
        });
      }
    }
  );
}
```

### 3. Error Logging

```javascript
// Log errors to file and database
async function logScraperError(error) {
  // File logging
  logger.error('Scraper error', {
    type: error.type,
    url: error.url,
    message: error.message,
    stack: error.stack,
    data: error.data
  });
  
  // Database logging (optional)
  await ScraperErrorLog.create({
    type: error.type,
    url: error.url,
    message: error.message,
    timestamp: error.timestamp,
    metadata: error.data
  });
}
```

---

## Performance Optimization

### 1. Concurrency Control

```javascript
const queue = new PQueue({
  concurrency: 3, // Max 3 simultaneous requests
  interval: 1000, // Rate limiting window
  intervalCap: 3 // Max requests per window
});

// Add tasks to queue
const results = await Promise.all(
  urls.map(url => queue.add(() => scrapeProduct(url)))
);
```

### 2. Caching Strategy

```javascript
// Cache listing pages
const listingCache = new Map();

async function getListingPage(url) {
  if (listingCache.has(url)) {
    return listingCache.get(url);
  }
  
  const data = await fetchPage(url);
  listingCache.set(url, data);
  
  return data;
}

// Clear cache after session
queue.on('idle', () => {
  listingCache.clear();
});
```

### 3. Database Optimization

```javascript
// Bulk insert products
async function bulkInsertProducts(products) {
  const operations = products.map(product => ({
    updateOne: {
      filter: { 
        platform_id: product.platform_id,
        original_url: product.original_url
      },
      update: { $set: product },
      upsert: true
    }
  }));
  
  return await Product.bulkWrite(operations);
}
```

---

## Testing Strategy

### 1. Unit Tests

```javascript
describe('PriceOyeScraper', () => {
  describe('Product Extraction', () => {
    it('should extract product name');
    it('should extract pricing correctly');
    it('should extract specifications');
    it('should handle missing data gracefully');
  });
  
  describe('Brand Normalization', () => {
    it('should normalize Samsung correctly');
    it('should normalize Apple correctly');
  });
  
  describe('Category Mapping', () => {
    it('should map Mobiles category');
  });
});
```

### 2. Integration Tests

```javascript
describe('PriceOye Integration', () => {
  it('should scrape single product end-to-end');
  it('should scrape brand page with pagination');
  it('should handle rate limiting');
  it('should store products in database');
});
```

### 3. Manual Testing Checklist

```
□ Scrape 1 product successfully
□ Scrape 10 products from one brand
□ Scrape entire brand page (Samsung, 351 products)
□ Handle pagination correctly
□ Handle network errors gracefully
□ Verify brand normalization accuracy
□ Verify category mapping accuracy
□ Check database storage correctness
□ Test rate limiting effectiveness
□ Monitor memory usage
□ Check for memory leaks
```

---

## Monitoring & Logging

### 1. Progress Tracking

```javascript
class ProgressTracker {
  constructor(total) {
    this.total = total;
    this.completed = 0;
    this.failed = 0;
    this.startTime = Date.now();
  }
  
  update(success = true) {
    if (success) {
      this.completed++;
    } else {
      this.failed++;
    }
    
    this.logProgress();
  }
  
  logProgress() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.completed / elapsed;
    const remaining = this.total - this.completed - this.failed;
    const eta = remaining / rate;
    
    console.log(`
      Progress: ${this.completed}/${this.total} (${this.getPercent()}%)
      Failed: ${this.failed}
      Rate: ${rate.toFixed(2)} products/sec
      ETA: ${this.formatTime(eta)}
    `);
  }
  
  getPercent() {
    return ((this.completed / this.total) * 100).toFixed(2);
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }
}
```

### 2. Logging Configuration

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/scraper-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/scraper-combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

---

## Compliance & Best Practices

### 1. Respect robots.txt

```javascript
// Check robots.txt before scraping
const robotsParser = require('robots-parser');

const robots = robotsParser(
  'https://priceoye.pk/robots.txt',
  await fetch('https://priceoye.pk/robots.txt').then(r => r.text())
);

if (!robots.isAllowed(url, 'ShopwiseScraper')) {
  throw new Error('URL disallowed by robots.txt');
}
```

### 2. Rate Limiting

```javascript
// Polite scraping - max 3 requests per second
const RATE_LIMIT = {
  maxConcurrent: 3,
  minInterval: 1000, // 1 second between batches
  respectRetryAfter: true
};
```

### 3. User Agent

```javascript
const USER_AGENT = 'Mozilla/5.0 (compatible; ShopwiseScraper/1.0; +https://shopwise.com/bot)';
```

### 4. Error Handling

```javascript
// Graceful degradation
try {
  await scrapePage(url);
} catch (error) {
  logger.error(`Failed to scrape ${url}`, { error });
  // Continue with next URL
  // Don't crash entire scraping session
}
```

---

## Next Steps

### Immediate Actions (Today)

1. **Install Dependencies**
   ```bash
   npm install playwright cheerio p-queue p-retry
   ```

2. **Create Base Files**
   - `src/scrapers/priceoye-scraper.js`
   - `src/selectors/priceoye-selectors.js`
   - `src/config/scraper-config.js`

3. **Test Single Product**
   - URL: `https://priceoye.pk/mobiles/samsung/samsung-galaxy-s25-ultra`
   - Extract all data
   - Verify normalization
   - Store in database

### This Week

- ✅ Day 1-2: Single product scraper
- ✅ Day 3-4: Brand page scraper (Samsung)

### Next Week

- 🔄 Day 1-2: Category scraper (Mobiles)
- 📋 Day 3-4: Multi-category support

---

## Success Metrics

### Phase 2.1 (Single Product)
- [ ] Successfully scrape 1 product
- [ ] 100% brand normalization accuracy
- [ ] 100% category mapping accuracy
- [ ] Product stored correctly in database
- [ ] All schema fields populated

### Phase 2.2 (Brand Scraping)
- [ ] Successfully scrape 351 Samsung products
- [ ] < 5% error rate
- [ ] Pagination handled correctly
- [ ] Average < 10 seconds per product
- [ ] All products normalized and stored

### Phase 2.3 (Category Scraping)
- [ ] Successfully scrape 1038 mobile products
- [ ] < 3% error rate
- [ ] Memory usage < 500MB
- [ ] No crashes or hangs
- [ ] Complete in < 3 hours

---

## Conclusion

This strategy provides a comprehensive, phased approach to scraping PriceOye, starting with single products and scaling to full category scraping. The architecture is designed to be:

- ✅ **Scalable** - Easy to add new categories
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Reliable** - Robust error handling and retry logic
- ✅ **Performant** - Optimized for speed and memory
- ✅ **Compliant** - Respects robots.txt and rate limits

**Ready to begin implementation!**

---

**Document Version:** 1.0  
**Last Updated:** November 17, 2025  
**Author:** AI Assistant  
**Status:** READY FOR IMPLEMENTATION

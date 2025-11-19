# PriceOye Scraper Usage Guide

Complete guide for using the PriceOye web scraper to collect product data.

---

## Quick Start

### 1. Prerequisites

- Node.js installed
- MongoDB running
- Backend API running (for normalization)
- Dependencies installed: `npm install`

### 2. Environment Setup

Ensure `.env` is configured:
```env
MONGODB_URI=mongodb://localhost:27017/shopwise
BACKEND_API_URL=http://localhost:5000
BACKEND_API_KEY=your_api_key_here
```

### 3. Test Single Product

```bash
node tests/test-single-product.js
```

This will:
- Scrape one product
- Normalize brand and category
- Store in database
- Display results

---

## Scraper Structure

```
src/scrapers/
├── base-scraper.js              # Base class for all scrapers
├── priceoye/
│   ├── priceoye-scraper.js      # Main PriceOye scraper
│   └── selectors.js             # CSS selectors
└── ...

src/config/
└── scraper-config.js            # Configuration

src/models/
├── Product.js                   # Product schema
└── Platform.js                  # Platform schema
```

---

## Usage Examples

### Example 1: Scrape Single Product

```javascript
const PriceOyeScraper = require('./src/scrapers/priceoye/priceoye-scraper');

const scraper = new PriceOyeScraper();
await scraper.initialize();

const product = await scraper.scrapeProduct(
  'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra'
);

console.log(product);
await scraper.cleanup();
```

### Example 2: Scrape Entire Brand (Samsung)

```javascript
const scraper = new PriceOyeScraper();
await scraper.initialize();

// Scrapes all Samsung mobiles (~351 products)
const products = await scraper.scrapeBrand('samsung');

console.log(`Scraped ${products.length} Samsung products`);
await scraper.cleanup();
```

### Example 3: Scrape Category (Mobiles)

```javascript
const scraper = new PriceOyeScraper();
await scraper.initialize();

// Scrapes all mobiles (~1038 products)
const products = await scraper.scrapeCategory('mobiles');

console.log(`Scraped ${products.length} mobile products`);
await scraper.cleanup();
```

---

## Configuration

### Rate Limiting

Edit `src/config/scraper-config.js`:

```javascript
rateLimit: {
  concurrent: 3,              // 3 simultaneous requests
  minInterval: 1000,          // 1 second between requests
  paginationDelay: 1500,      // 1.5s between pages
  randomDelay: {min: 500, max: 1500}
}
```

### Categories to Scrape

```javascript
categories: {
  mobiles: {
    enabled: true,            // Enable/disable
    priority: 1,              // Scraping priority
  },
  smartWatches: {
    enabled: false,           // Disabled for now
  }
}
```

### Brands to Scrape

```javascript
brands: {
  samsung: {
    enabled: true,
    priority: 1,
    expectedProducts: 351,
  },
  apple: {
    enabled: true,
    priority: 1,
  }
}
```

---

## Data Extraction

The scraper extracts the following data:

### Basic Information
- Product name
- Brand (normalized via Backend API)
- Category (mapped via Backend API)
- Description

### Pricing
- Current price
- Original price (if on sale)
- Discount percentage
- Currency (PKR)

### Reviews/Ratings
- Average rating (1-5)
- Review count
- Positive percentage

### Media
- Product images (up to 10)
- Alt text
- Image type (main/gallery)

### Specifications
- Key-value pairs (e.g., "Display": "6.8 inch")
- Extracted from product tables/lists

### Variants
- Color options
- Storage options
- Other variants

### Availability
- In stock / Out of stock
- Limited stock
- Pre-order

### Delivery
- Delivery time
- Shipping cost

---

## Data Normalization

### Brand Normalization

```javascript
// Original: "SAMSUNG" or "samsung" or "Samsung"
// Normalized: "Samsung"
// brand_id: ObjectId (from backend API)

{
  brand: "Samsung",              // Canonical name
  brand_id: ObjectId("..."),     // Database reference
  platform_metadata: {
    original_brand: "SAMSUNG"    // Original scraped value
  },
  mapping_metadata: {
    brand_source: "exact_match",
    brand_confidence: 1.0
  }
}
```

### Category Mapping

```javascript
// Original: "Mobiles"
// Mapped: "Electronics > Mobile Phones"

{
  category_name: "Mobiles",         // Original
  category_id: ObjectId("..."),     // Mapped category
  platform_metadata: {
    original_category: "Mobiles"
  },
  mapping_metadata: {
    category_source: "auto",
    category_confidence: 0.95
  }
}
```

---

## Database Storage

### Product Schema

```javascript
{
  // Platform
  platform_id: ObjectId,
  platform_name: "PriceOye",
  original_url: "https://priceoye.pk/...",
  
  // Basic Info
  name: "Samsung Galaxy S23 Ultra",
  brand: "Samsung",
  brand_id: ObjectId,
  category_name: "Mobiles",
  category_id: ObjectId,
  
  // Pricing
  price: 52499,
  sale_price: null,
  sale_percentage: 13,
  currency: "PKR",
  
  // Reviews
  average_rating: 4.8,
  review_count: 19,
  
  // Media
  media: {
    images: [{url, type, alt_text}],
    videos: []
  },
  
  // Specs
  specifications: Map {
    "Display" => "6.8 inch",
    "Processor" => "Snapdragon 8 Gen 3",
    ...
  },
  
  // Metadata
  platform_metadata: {...},
  mapping_metadata: {...},
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Duplicate Handling

- Products are identified by `platform_id` + `original_url`
- If product exists: Updates price, availability, ratings
- If product is new: Creates new record

---

## Error Handling

### Automatic Retry

Failed requests are automatically retried with exponential backoff:

```
Attempt 1: Fails → Wait 2s
Attempt 2: Fails → Wait 4s
Attempt 3: Fails → Wait 8s
Attempt 4: Give up
```

### Error Types

- `NETWORK_ERROR`: Network issues (retried)
- `TIMEOUT_ERROR`: Page load timeout (retried)
- `PARSE_ERROR`: HTML parsing failed (logged, skipped)
- `VALIDATION_ERROR`: Invalid data (logged, skipped)

### Error Logging

Errors are logged to:
- `logs/scraper-error.log` - Error details
- `logs/scraper.log` - All logs
- Console output

---

## Progress Tracking

The scraper tracks:
- Pages visited
- Products scraped successfully
- Errors encountered
- Scraping duration
- Success rate

Example output:
```
📊 Scraping Statistics:
   Pages Visited: 18
   Products Scraped: 340
   Errors: 11
   Duration: 1847s
   Success Rate: 96.87%
```

---

## Performance

### Speed
- ~10-15 seconds per product (including normalization)
- 3 products scraped concurrently
- ~200-250 products per hour

### Memory
- Memory limit: 500MB
- Automatic browser restart after 100 products
- Garbage collection every 60s

### Best Practices
1. Start with single product to test
2. Test with one brand (~50-100 products)
3. Then scrape full category if successful
4. Monitor logs for errors
5. Check database for data quality

---

## Troubleshooting

### Issue: Browser hangs

**Solution:**
- Reduce `concurrent` in config
- Increase `timeout` values
- Check memory usage

### Issue: Selectors not working

**Solution:**
- HTML structure may have changed
- Update selectors in `selectors.js`
- Test with real page HTML
- Use browser DevTools to inspect

### Issue: Brand normalization fails

**Solution:**
- Ensure backend API is running
- Check `BACKEND_API_URL` in `.env`
- Verify backend has brand data
- Check backend logs

### Issue: Products not saving

**Solution:**
- Check MongoDB connection
- Verify required fields are present
- Check validation errors in logs
- Ensure platform exists in DB

---

## Next Steps

1. **Test Single Product** ✅
   ```bash
   node tests/test-single-product.js
   ```

2. **Scrape Samsung Brand** (351 products)
   ```bash
   node tests/test-brand-scraping.js samsung
   ```

3. **Scrape All Mobiles** (1038 products)
   ```bash
   node tests/test-category-scraping.js mobiles
   ```

4. **Expand to Other Categories**
   - Smart Watches
   - Wireless Earbuds
   - etc.

---

## Important Notes

### ⚠️ Legal & Ethical
- Respect robots.txt
- Use rate limiting (don't overload server)
- Scrape responsibly
- Cache responses when possible

### ⚠️ Maintenance
- Website structure may change
- Selectors may need updates
- Monitor for breaking changes
- Keep backup of working selectors

### ⚠️ Data Quality
- Validate scraped data
- Check normalization accuracy
- Review flagged products
- Monitor error logs

---

## Support

For issues or questions:
1. Check logs: `logs/scraper-error.log`
2. Review configuration: `src/config/scraper-config.js`
3. Update selectors: `src/scrapers/priceoye/selectors.js`
4. Check documentation: `docs/PRICEOYE_SCRAPING_STRATEGY.md`

---

**Last Updated:** November 18, 2025  
**Version:** 1.0  
**Status:** Ready for Testing

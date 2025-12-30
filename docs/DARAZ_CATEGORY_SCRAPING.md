# Daraz Category Scraping Guide

## Overview

The Daraz scraper now supports **category-level scraping** similar to the PriceOye scraper. This allows you to scrape entire categories or search queries, extracting all product URLs and then scraping each product with reviews.

## Key Features

✅ **Query-based category scraping** - Works with Daraz's search/catalog URLs  
✅ **Pagination support** - Automatically handles multiple listing pages  
✅ **Product limit controls** - Set max pages and max products  
✅ **Review scraping integration** - Optionally scrape reviews for each product  
✅ **Duplicate detection** - Skips already-scraped products and reviews  
✅ **Anti-bot measures** - Random delays and human-like behavior  
✅ **Comprehensive logging** - Track progress and errors

## Usage

### Basic Example

```javascript
const DarazScraper = require('./src/scrapers/daraz/daraz-scraper');

const scraper = new DarazScraper();
await scraper.initialize();

// Scrape a category
const products = await scraper.scrapeCategoryByUrl('https://www.daraz.pk/catalog?q=iphone+15');

console.log(`Scraped ${products.length} products`);
```

### Advanced Example with Options

```javascript
const products = await scraper.scrapeCategoryByUrl('https://www.daraz.pk/catalog?q=Smart+Phones', {
  maxPages: 5, // Scrape first 5 listing pages
  maxProducts: 50, // Stop after 50 products
  includeReviews: true, // Scrape reviews for each product
  maxReviewPages: 3, // Max 3 review pages per product
  name: 'Smart Phones', // Category name (for logging)
});
```

## Method Signature

### `scrapeCategoryByUrl(url, options)`

Scrapes an entire category or search query from Daraz.

**Parameters:**

| Parameter                | Type      | Default    | Description                                   |
| ------------------------ | --------- | ---------- | --------------------------------------------- |
| `url`                    | `string`  | _required_ | Category or search URL                        |
| `options.maxPages`       | `number`  | `10`       | Maximum listing pages to scrape               |
| `options.maxProducts`    | `number`  | `null`     | Maximum products to scrape (null = all)       |
| `options.includeReviews` | `boolean` | `true`     | Whether to scrape reviews                     |
| `options.maxReviewPages` | `number`  | `5`        | Maximum review pages per product              |
| `options.name`           | `string`  | `null`     | Category name (auto-detected if not provided) |

**Returns:** `Promise<Array>` - Array of scraped products (saved to database)

## Category URL Formats

Daraz uses query-based category URLs:

### Search Query Format

```
https://www.daraz.pk/catalog?q={search_query}
```

**Examples:**

- `https://www.daraz.pk/catalog?q=iphone+15`
- `https://www.daraz.pk/catalog?q=Smart+Phones`
- `https://www.daraz.pk/catalog?q=Wireless+Earbuds`
- `https://www.daraz.pk/catalog?q=Power+Banks`

### Path-based Categories (also supported)

```
https://www.daraz.pk/{category}/{subcategory}/
```

**Examples:**

- `https://www.daraz.pk/mobiles/`
- `https://www.daraz.pk/electronics/audio/`

## Workflow

The `scrapeCategoryByUrl()` method follows this workflow:

```
1. Extract category name from URL (or use provided name)
   ↓
2. Call scrapeListingPage() to get all product URLs
   - Handles pagination (up to maxPages)
   - Deduplicates URLs
   - Stops when maxProducts limit reached
   ↓
3. Loop through each product URL:
   a. Call scrapeProduct() to extract product data
   b. Save product to database (with brand/category normalization)
   c. If includeReviews=true, call scrapeReviews()
   d. Save reviews to database (with duplicate detection)
   e. Random delay (2-4 seconds)
   ↓
4. Return array of saved products
```

## Listing Page Scraping

The underlying `scrapeListingPage()` method handles pagination:

### Features

- ✅ Automatic pagination (clicks "Next" button)
- ✅ Waits for products to load on each page
- ✅ Extracts product URLs using CSS selectors
- ✅ Deduplicates URLs across pages
- ✅ Respects maxPages and maxProducts limits

### Implementation Details

```javascript
// Selectors used for listing pages
this.selectors.listing = {
  productCard: '.gridItem', // Product card container
  productLink: 'a[href*="/products/"]', // Product link
  pagination: {
    nextButton: '[aria-label="Next"]', // Next page button
    currentPage: '.ant-pagination-item-active', // Active page number
  },
};
```

## Error Handling

The scraper handles errors gracefully:

- **Individual product failures** - Logs error but continues with next product
- **Review scraping failures** - Logs warning but product is still saved
- **Listing page failures** - Returns empty array
- **Network timeouts** - Uses 15-second timeout with retry logic

Failed products are tracked and reported in the final summary:

```
✅ Category scraping complete: iPhone 15
📊 Results:
   - Total products found: 20
   - Successfully scraped: 18
   - Failed: 2

⚠️  Failed products:
   - https://www.daraz.pk/products/xxx: Connection timeout
   - https://www.daraz.pk/products/yyy: Missing required field: price
```

## Anti-Bot Measures

The scraper implements several anti-detection techniques:

1. **Random delays** - 2-4 seconds between products
2. **Rate limiting** - Configurable via platform settings
3. **Human-like scrolling** - Simulates real user behavior
4. **User-Agent rotation** - Uses realistic browser signatures
5. **Pagination delays** - 2-second wait after clicking next page

## Testing

### Test Single Category

```bash
node tests/test-daraz-category.js
```

This will scrape the "iPhone 15" category with:

- Max 2 listing pages
- Max 5 products
- Reviews enabled (max 3 pages per product)

### Test Multiple Categories

```bash
node tests/test-daraz-category.js multiple
```

This will test 3 different categories (Smart Phones, Wireless Earbuds, Power Banks) with 3 products each.

## Performance Considerations

### Scraping Time Estimates

| Products | With Reviews | Without Reviews |
| -------- | ------------ | --------------- |
| 10       | ~15-20 min   | ~5-7 min        |
| 50       | ~1.5-2 hours | ~25-30 min      |
| 100      | ~3-4 hours   | ~50-60 min      |

**Note:** Times vary based on:

- Number of reviews per product
- Network speed
- Anti-bot delays
- Server response times

### Optimization Tips

1. **Disable reviews for initial scraping**

   ```javascript
   {
     includeReviews: false;
   }
   ```

2. **Limit review pages**

   ```javascript
   {
     maxReviewPages: 1;
   } // Only first page of reviews
   ```

3. **Use product limits for testing**

   ```javascript
   {
     maxProducts: 10;
   } // Test with 10 products first
   ```

4. **Scrape in batches**
   ```javascript
   // Instead of maxProducts: 100, do multiple runs:
   // Run 1: products 1-25
   // Run 2: products 26-50
   // Run 3: products 51-75
   // Run 4: products 76-100
   ```

## Database Integration

### Products are saved with:

- ✅ **Brand normalization** - Mapped to canonical brand names
- ✅ **Category mapping** - Mapped to standardized categories
- ✅ **Duplicate detection** - Upsert by `original_url`
- ✅ **Variant handling** - Color/size variants stored correctly
- ✅ **Specifications** - Key-value specs extracted

### Reviews are saved with:

- ✅ **Duplicate detection** - Uses `reviewer_name + text fingerprint`
- ✅ **Date parsing** - Handles relative dates ("2 days ago")
- ✅ **Sentiment placeholder** - Ready for ML sentiment analysis
- ✅ **Verified purchase flag** - Tracked from Daraz data

## Comparison with PriceOye Scraper

| Feature                   | PriceOye                  | Daraz                              |
| ------------------------- | ------------------------- | ---------------------------------- |
| **Category URL Format**   | Path-based                | Query-based                        |
| **Pagination**            | Infinite scroll           | Button-based                       |
| **Product URL Pattern**   | `/category/brand/product` | `/products/product-name-iXXX.html` |
| **Review Pagination**     | AJAX load more            | Button-based with page wrapping    |
| **Data Source**           | JavaScript variable       | HTML parsing                       |
| **Typical Response Time** | Fast (~2s)                | Moderate (~3-5s)                   |

## Common Issues & Solutions

### Issue: "No products found"

**Cause:** Category URL invalid or products not loaded  
**Solution:**

- Check URL format (should be `catalog?q=...`)
- Increase timeout: `{ timeout: 30000 }`
- Check if category exists on Daraz

### Issue: "Rate limit hit"

**Cause:** Too many requests too fast  
**Solution:**

- Increase delays: `randomDelay(3000, 6000)`
- Reduce batch size: `maxProducts: 10`
- Use proxy rotation (if available)

### Issue: "Reviews not loading"

**Cause:** Pagination detection failing  
**Solution:**

- Reduce review pages: `maxReviewPages: 1`
- Check if product has reviews on Daraz
- Enable debug logging: `logger.level = 'debug'`

### Issue: "Duplicate products/reviews"

**Cause:** Re-running scraper on same category  
**Solution:**

- This is expected behavior (MongoDB upsert)
- Check counts: "X saved, Y skipped"
- No action needed (duplicates are automatically handled)

## Future Enhancements

Potential improvements for future versions:

1. **Parallel product scraping** - Use Bull queues to scrape multiple products concurrently
2. **Resume from failure** - Save progress and resume if interrupted
3. **Incremental updates** - Only scrape new/updated products
4. **Price history tracking** - Track price changes over time
5. **Stock availability monitoring** - Track in-stock/out-of-stock status
6. **Advanced filtering** - Filter by price range, rating, brand
7. **Export to CSV/JSON** - Export scraped data to files

## Related Documentation

- **Product Scraping:** `docs/SCRAPING_GUIDELINES.md`
- **Review Scraping:** See conversation summary for review implementation details
- **Database Schema:** `docs/DATABASE_SCHEMA.md`
- **PriceOye Scraper:** `src/scrapers/priceoye/priceoye-scraper.js`

## Example Output

```
🏷️  Scraping Daraz category: iPhone 15
📍 URL: https://www.daraz.pk/catalog?q=iphone+15
⚙️  Options: maxPages=2, maxProducts=5, includeReviews=true

📋 Scraping listing page: https://www.daraz.pk/catalog?q=iphone+15
   📄 Scraping page 1...
   ✅ Found 24 products on page 1
   📄 Scraping page 2...
   ✅ Found 24 products on page 2
   📊 Total unique product URLs: 48

📊 Found 48 products to scrape (limited to 5)

[1/5] 🔍 Scraping: https://www.daraz.pk/products/apple-iphone-15-pro-max-256gb-i123456.html
   📦 Found product data in JavaScript: Apple iPhone 15 Pro Max 256GB
   🏷️  Normalizing brand: Apple
   ✅ Brand normalized: Apple (ID: 692eb8c6ac1679df1d60ed19)
   📂 Mapping category: Mobile Phones
   ✅ Category mapped: Mobile Phones (ID: 692eb8c6ac1679df1d60ed20)
   💾 Product saved: 692eb8c6ac1679df1d60ed21
   ✅ Product saved: Apple iPhone 15 Pro Max 256GB
   💬 Scraping reviews (max 3 pages)...
   📊 Review Summary: 15 total reviews, 5★: 12, 4★: 2, 3★: 1
   💾 Reviews: 15 saved, 0 skipped

[2/5] 🔍 Scraping: https://www.daraz.pk/products/...

================================================================================
✅ Category scraping complete: iPhone 15
📊 Results:
   - Total products found: 48
   - Successfully scraped: 5
   - Failed: 0
================================================================================
```

## Summary

The Daraz category scraping feature provides a powerful way to extract entire product categories with reviews. It follows the same patterns as the PriceOye scraper while adapting to Daraz's unique URL structure and pagination system.

**Key Takeaways:**

- Use `scrapeCategoryByUrl()` for category-level scraping
- Configure options to control scope and speed
- Reviews are optional but recommended for complete data
- Duplicate detection ensures clean database
- Anti-bot measures prevent IP blocking
- Comprehensive error handling ensures robustness

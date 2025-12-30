# Quick Start Guide: Daraz Category Scraping

## ✅ Implementation Complete!

Your Daraz scraper now supports **category-level scraping** just like PriceOye!

---

## 🚀 Quick Test (5 minutes)

Run this command to test with a small category:

```powershell
cd "e:\University Work\FYP\code\shopwise-scraping"
node tests/test-daraz-category.js
```

**What it does:**

- Scrapes "iPhone 15" category from Daraz
- Extracts 5 products (max)
- Includes reviews (max 3 pages per product)
- Saves to database
- Total time: ~5-10 minutes

**Expected output:**

```
🚀 Starting Daraz Category Scraping Test
📦 Connecting to database...
✅ Database connected

🔧 Initializing scraper...
✅ Scraper initialized

🏷️  Scraping Daraz category: iPhone 15
📍 URL: https://www.daraz.pk/catalog?q=iphone+15
⚙️  Options: maxPages=2, maxProducts=5, includeReviews=true

📋 Scraping listing page...
   📄 Scraping page 1...
   ✅ Found 24 products on page 1
   📊 Total unique product URLs: 24

📊 Found 24 products to scrape (limited to 5)

[1/5] 🔍 Scraping: https://www.daraz.pk/products/...
   ✅ Product saved: Apple iPhone 15 Pro Max
   💬 Scraping reviews...
   💾 Reviews: 12 saved, 0 skipped

[2/5] 🔍 Scraping: ...

================================================================================
✅ Category scraping complete: iPhone 15
📊 Results:
   - Total products found: 24
   - Successfully scraped: 5
   - Failed: 0
================================================================================

✅ Test completed successfully!
```

---

## 🎯 Test Multiple Categories

```powershell
node tests/test-daraz-category.js multiple
```

This tests 3 different categories quickly (no reviews, 3 products each).

---

## 📚 Usage in Your Code

### Basic Usage

```javascript
const DarazScraper = require('./src/scrapers/daraz/daraz-scraper');
const databaseService = require('./src/services/database-service');

async function scrapeCategory() {
  const scraper = new DarazScraper();

  await databaseService.connect();
  await scraper.initialize();

  // Scrape entire category
  const products = await scraper.scrapeCategoryByUrl('https://www.daraz.pk/catalog?q=iphone+15');

  console.log(`Scraped ${products.length} products`);

  await scraper.close();
  await databaseService.disconnect();
}
```

### With Custom Options

```javascript
const products = await scraper.scrapeCategoryByUrl('https://www.daraz.pk/catalog?q=Smart+Phones', {
  maxPages: 5, // Scrape first 5 pages
  maxProducts: 50, // Stop after 50 products
  includeReviews: true, // Include reviews
  maxReviewPages: 3, // Max 3 review pages per product
  name: 'Smart Phones', // Custom name for logging
});
```

### Quick Scraping (No Reviews)

```javascript
// Faster scraping without reviews
const products = await scraper.scrapeCategoryByUrl(
  'https://www.daraz.pk/catalog?q=Wireless+Earbuds',
  {
    maxPages: 2,
    maxProducts: 20,
    includeReviews: false, // Skip reviews
  }
);
```

---

## 🔗 Category URL Formats

### Query-based (Most Common)

```
https://www.daraz.pk/catalog?q=iphone+15
https://www.daraz.pk/catalog?q=Smart+Phones
https://www.daraz.pk/catalog?q=Wireless+Earbuds
```

### Path-based (Also Works)

```
https://www.daraz.pk/mobiles/
https://www.daraz.pk/electronics/
```

---

## ⚙️ Configuration Options

| Option           | Type    | Default | Description                   |
| ---------------- | ------- | ------- | ----------------------------- |
| `maxPages`       | number  | 10      | Max listing pages to scrape   |
| `maxProducts`    | number  | null    | Max products (null = all)     |
| `includeReviews` | boolean | true    | Scrape reviews?               |
| `maxReviewPages` | number  | 5       | Max review pages per product  |
| `name`           | string  | null    | Category name (auto-detected) |

---

## ⏱️ Performance Estimates

| Scenario                  | Time         |
| ------------------------- | ------------ |
| 5 products with reviews   | ~5-10 min    |
| 20 products with reviews  | ~20-30 min   |
| 50 products with reviews  | ~1-1.5 hours |
| 100 products (no reviews) | ~45-60 min   |

---

## 📖 Full Documentation

- **Complete Guide:** `docs/DARAZ_CATEGORY_SCRAPING.md`
- **Implementation Summary:** `docs/DARAZ_CATEGORY_IMPLEMENTATION_SUMMARY.md`
- **Code Examples:** `examples/daraz-category-scraping-examples.js`

---

## 🆚 Comparison with PriceOye

Both scrapers now support category scraping! Key differences:

| Feature        | PriceOye        | Daraz         |
| -------------- | --------------- | ------------- |
| **URL Format** | Path-based      | Query-based   |
| **Pagination** | Infinite scroll | Button clicks |
| **Speed**      | Faster          | Slower        |

**Usage is identical:**

```javascript
// PriceOye
await priceoye.scrapeCategoryOrBrandByUrl('https://priceoye.pk/mobiles/samsung');

// Daraz
await daraz.scrapeCategoryByUrl('https://www.daraz.pk/catalog?q=samsung');
```

---

## ✨ Features

✅ **Automatic pagination** - Handles multiple listing pages  
✅ **Product extraction** - Gets all product URLs from listings  
✅ **Full product details** - Name, price, specs, images, variants  
✅ **Review scraping** - Optional review extraction with pagination  
✅ **Duplicate detection** - Skips already-scraped products/reviews  
✅ **Brand normalization** - Maps to canonical brand names  
✅ **Category mapping** - Maps to standardized categories  
✅ **Error handling** - Continues on individual failures  
✅ **Anti-bot measures** - Random delays, human-like behavior  
✅ **Progress logging** - Detailed status updates

---

## 🎯 Next Steps

1. **Run the test:**

   ```powershell
   node tests/test-daraz-category.js
   ```

2. **Check database:**
   - Verify products were saved
   - Check reviews were saved
   - Validate brand/category normalization

3. **Test with your own categories:**
   - Modify test script URLs
   - Adjust maxPages/maxProducts
   - Test different category types

4. **Integrate into production:**
   - Use in your scraping scripts
   - Schedule regular category updates
   - Monitor for rate limiting

---

## 🐛 Troubleshooting

**Issue:** "No products found"

- Check URL format (should be `catalog?q=...`)
- Verify category exists on Daraz

**Issue:** "Rate limit hit"

- Reduce maxProducts
- Increase delays
- Use proxy rotation

**Issue:** "Reviews not loading"

- Reduce maxReviewPages
- Check if product has reviews
- Enable debug logging

---

## 📞 Support

- **Documentation:** `docs/DARAZ_CATEGORY_SCRAPING.md`
- **Examples:** `examples/daraz-category-scraping-examples.js`
- **Test Script:** `tests/test-daraz-category.js`

---

**Ready to test? Run:**

```powershell
node tests/test-daraz-category.js
```

Good luck! 🚀

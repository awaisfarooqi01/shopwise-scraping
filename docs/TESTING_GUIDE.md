# Testing Guide

Complete guide for testing the ShopWise scraping system.

## Quick Start

```bash
# Test single product with reviews
npm run test:reviews

# Test entire brand scraping
npm run test:brand

# Test brand scraping with cleanup (removes existing data first)
npm run test:brand:clean
```

---

## Test Suites

### 1. Single Product + Reviews Test

**Command:** `npm run test:reviews`

**File:** `tests/test-reviews-and-schema.js`

**Tests:**
- ✅ Clean HTML descriptions (no HTML tags)
- ✅ Schema validation (all required fields)
- ✅ Review scraping with pagination
- ✅ Sentiment analysis flags
- ✅ positive_percent = -1 (awaiting analysis)

**Sample Product:**
- Samsung Galaxy S23 Ultra
- URL: https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra

**Expected Results:**
- Product saved with complete data
- Reviews scraped (if available)
- All schema validations pass
- `positive_percent` set to `-1`

---

### 2. Brand Scraping Test

**Command:** `npm run test:brand`

**File:** `tests/test-brand-scraping.js`

**Tests:**
- ✅ Scrape entire brand catalog
- ✅ Validate all products against schema
- ✅ Scrape reviews for all products
- ✅ Check data quality across products
- ✅ Brand normalization
- ✅ Category mapping

**Sample Brand:**
- Nothing Phones
- URL: https://priceoye.pk/mobiles/nothing

**Features:**
- Scrapes all products in brand
- Validates schema for each product
- Tracks success/failure rates
- Generates comprehensive report
- Tests data consistency

**Flags:**
- `--clean` : Remove existing data before scraping

---

## Understanding Test Results

### Product Schema Validation

The test checks these **required fields**:

```javascript
✅ Required Fields:
- name
- brand
- brand_id
- category_name
- category_id
- subcategory_name
- subcategory_id
- price
- currency
- platform_id
- platform_name
- original_url
- average_rating
- review_count
- positive_percent (-1 for unanalyzed)
- availability
- media.images
- specifications
- is_active
```

### Review Schema Validation

```javascript
✅ Required Fields:
- product_id
- platform_id
- platform_name
- reviewer_name
- rating
- review_date
- sentiment_analysis.needs_analysis
- is_active
```

---

## positive_percent Field Explained

### The Problem
We can't calculate accurate positive percentage until reviews are analyzed for sentiment.

### The Solution
Use `-1` as a special indicator value:

```javascript
// During scraping (before sentiment analysis)
positive_percent: -1  // "Not yet analyzed"

// After sentiment analysis
positive_percent: 85  // "85% positive reviews"
```

### Frontend Usage

```javascript
// Check if sentiment analysis is pending
if (product.positive_percent === -1) {
  return "Analysis pending...";
}

// Show actual percentage
return `${product.positive_percent}% positive reviews`;
```

### Workflow

```
1. Scraper runs
   └─> Sets positive_percent = -1
   └─> Sets sentiment_analysis.needs_analysis = true

2. Sentiment Analysis Job runs (background)
   └─> Analyzes review text
   └─> Calculates sentiment (positive/negative/neutral)
   └─> Updates sentiment_analysis fields
   └─> Sets needs_analysis = false

3. Update Product Job runs
   └─> Calculates positive_percent from analyzed reviews
   └─> Updates product.positive_percent
   └─> Now shows actual percentage (e.g., 85%)
```

---

## Test Output Examples

### Successful Product Test

```
✅ TEST 1: Clean Description
   PASSED: Description is clean text
   Sample: The Samsung Galaxy S23 Ultra is a flagship...

✅ TEST 2: Schema Fields
   ✅ positive_percent: -1
   ✅ subcategory_name: Mobile Phones
   ✅ brand_id: 507f1f77bcf86cd799439011
   ✅ category_id: 507f1f77bcf86cd799439012

✅ TEST 3 & 4: Review Scraping & Pagination
   Total reviews scraped: 147
   Product review count: 150
   PASSED: Reviews were scraped

   Sample Review:
     Reviewer: Ahmad Hassan
     Rating: 5/5
     Date: 11/15/2024
     Verified: Yes
     Text: Excellent phone, amazing camera quality...
```

### Brand Scraping Report

```
📈 FINAL SUMMARY REPORT
==================================================

📊 Product Statistics:
  Total products found: 8
  Successfully scraped: 8
  Failed to scrape: 0
  Success rate: 100.0%

📋 Schema Validation:
  Passed: 8
  Failed: 0
  Pass rate: 100.0%

💬 Reviews Statistics:
  Total reviews scraped: 342
  Products with reviews: 6
  Average reviews per product: 57.0

🖼️  Media Statistics:
  Products with images: 8
  Coverage: 100.0%

📋 Specification Statistics:
  Products with specs: 8
  Coverage: 100.0%

✅ DATA QUALITY CHECKS
==================================================
✅ All products have clean descriptions
✅ All products have positive_percent = -1
✅ Schema validation pass rate > 90%
✅ Image coverage > 80%
✅ Specification coverage > 80%

💡 NEXT STEPS
==================================================
1. ✅ Products scraped and saved to database
2. ⏳ Run sentiment analysis on reviews
3. ⏳ After analysis, positive_percent will be updated
4. ✅ Frontend ready to check analysis status
```

---

## Common Issues & Solutions

### Issue: "Review elements not found"

**Cause:** Reviews page structure changed or JavaScript not loaded

**Solution:**
- Check if URL is correct
- Wait longer for JavaScript to load
- Update selectors in `src/scrapers/priceoye/selectors.js`

### Issue: "positive_percent is undefined"

**Cause:** Old database documents or schema mismatch

**Solution:**
```javascript
// Update existing products
db.products.updateMany(
  { positive_percent: { $exists: false } },
  { $set: { positive_percent: -1 } }
);
```

### Issue: "HTML tags in description"

**Cause:** `cleanHtmlDescription()` not working

**Solution:**
- Check `priceoye-scraper.js` line 240
- Verify Cheerio is parsing correctly
- Test HTML cleaning function separately

---

## Database Queries for Testing

### Check Products Awaiting Analysis

```javascript
// MongoDB
db.products.find({ 
  positive_percent: -1 
}).count()

// Mongoose
Product.countDocuments({ positive_percent: -1 })
```

### Check Reviews Needing Analysis

```javascript
// MongoDB
db.reviews.find({ 
  "sentiment_analysis.needs_analysis": true 
}).count()

// Mongoose
Review.countDocuments({ 
  "sentiment_analysis.needs_analysis": true 
})
```

### Get All Nothing Brand Products

```javascript
// MongoDB
db.products.find({ 
  brand: "Nothing" 
})

// Mongoose
Product.find({ brand: "Nothing" })
```

### Get Products with Analyzed Reviews

```javascript
// MongoDB
db.products.find({ 
  positive_percent: { $gte: 0, $lte: 100 } 
})

// Mongoose
Product.find({ 
  positive_percent: { $gte: 0, $lte: 100 } 
})
```

---

## Manual Testing Checklist

Before deploying, manually verify:

- [ ] Single product scraping works
- [ ] Reviews are scraped correctly
- [ ] `positive_percent` is set to `-1`
- [ ] Brand scraping completes successfully
- [ ] No HTML in descriptions
- [ ] All required fields present
- [ ] Images are scraped
- [ ] Specifications are extracted
- [ ] Database documents valid
- [ ] No duplicate products
- [ ] Reviews linked to correct products

---

## Performance Benchmarks

**Single Product:**
- Time: 10-30 seconds
- Reviews: Up to 400+ reviews
- Success rate: 95%+

**Brand Scraping (Nothing - 8 products):**
- Time: 5-10 minutes
- Products: 8
- Reviews: 300-400 total
- Success rate: 95%+

**Large Brand (Samsung - 50+ products):**
- Time: 30-60 minutes
- Products: 50+
- Reviews: 5000+ total
- Success rate: 90%+

---

## Next Steps After Testing

1. ✅ **Deploy Scraper**
   - Products saved with `positive_percent = -1`
   - Reviews marked for analysis

2. ⏳ **Run Sentiment Analysis**
   - Analyze review text
   - Update sentiment fields
   - Mark as analyzed

3. ⏳ **Update Product Stats**
   - Calculate positive percentage
   - Update `positive_percent` field
   - Now shows actual value

4. ✅ **Frontend Integration**
   - Check `positive_percent === -1` for pending
   - Display percentage when available
   - Show "Analysis pending" badge

---

## Support & Debugging

### Enable Debug Logging

```bash
# Set log level in .env
LOG_LEVEL=debug
```

### Take Screenshots on Error

```javascript
// In config
screenshotOnError: true
```

### Test Individual Functions

```javascript
// Test HTML cleaning
const scraper = new PriceOyeScraper();
const clean = scraper.cleanHtmlDescription('<p>Test</p>');
console.log(clean); // Should be: "Test"
```

---

## Documentation References

- [Product Schema](./PRODUCT_SCHEMA.md)
- [Review Schema](./REVIEW_SCHEMA.md)
- [Positive Percent Convention](./POSITIVE_PERCENT_CONVENTION.md)
- [Scraper Config](../src/config/scraper-config.js)
- [Selectors](../src/scrapers/priceoye/selectors.js)

---

**Last Updated:** November 22, 2024  
**Version:** 1.0.0

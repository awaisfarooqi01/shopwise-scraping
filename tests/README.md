# Scraper Tests

Comprehensive test suite for validating scraper functionality, schema compliance, and data quality.

## Available Tests

### 1. Single Product Test
**File:** `test-reviews-and-schema.js`

Tests a single product with reviews:
```bash
npm run test:reviews
```

**What it tests:**
- ✅ Product scraping
- ✅ Clean HTML descriptions
- ✅ Schema field validation
- ✅ Review scraping with pagination
- ✅ positive_percent = -1 (unanalyzed)
- ✅ Sentiment analysis flags

### 2. Brand Scraping Test
**File:** `test-brand-scraping.js`

Tests scraping entire brand catalog:
```bash
# Normal run (keeps existing data)
npm run test:brand

# Clean run (removes existing data first)
npm run test:brand:clean
```

**What it tests:**
- ✅ Multiple product scraping
- ✅ Data consistency across products
- ✅ Success/failure rate tracking
- ✅ Schema validation for all products
- ✅ Review scraping for all products
- ✅ Data quality metrics
- ✅ Error reporting

## Test Configuration

### Environment Variables
Create a `.env` file in project root:
```env
MONGODB_URI=mongodb://localhost:27017/shopwise_db
LOG_LEVEL=info
```

### Test Targets
- **Single Product:** Samsung Galaxy S23 Ultra
- **Brand:** Nothing Phones (8 products)

## Understanding Test Output

### Success Indicators
```
✅ Schema validation: PASSED
✅ Description is clean text
✅ positive_percent = -1 (awaiting sentiment analysis)
✅ Reviews: 147 scraped
✅ Review schema: PASSED
```

### Warning Indicators
```
⚠️  No images found
⚠️  No specifications found
⚠️  WARNING: No reviews found
```

### Error Indicators
```
❌ Schema validation: FAILED
❌ Description contains HTML tags
❌ positive_percent = 50 (invalid value)
```

## Key Metrics Tracked

### Product Metrics
- Total products scraped
- Success rate (%)
- Schema validation pass rate (%)
- Image coverage (%)
- Specification coverage (%)

### Review Metrics
- Total reviews scraped
- Products with reviews
- Average reviews per product
- Reviews needing sentiment analysis

### Quality Checks
- All products have clean descriptions
- All products have positive_percent = -1
- Schema validation pass rate > 90%
- Image coverage > 80%
- Specification coverage > 80%

## positive_percent Field Convention

### What is it?
A field in the Product model that shows the percentage of positive reviews.

### Why -1?
We use `-1` as a special value meaning "sentiment analysis not yet performed".

### Workflow
```
Scraping → positive_percent = -1
             ↓
Sentiment Analysis → Analyze reviews
             ↓
Update Product → positive_percent = 85% (actual value)
```

### Frontend Usage
```javascript
if (product.positive_percent === -1) {
  // Show "Analysis pending" badge
  return <Badge>Analyzing reviews...</Badge>
}

// Show actual percentage
return <Badge>{product.positive_percent}% Positive</Badge>
```

## Sample Test Reports

### Product Test Report
```
📊 VERIFICATION RESULTS
==================================================

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
   PASSED: Reviews were scraped
```

### Brand Test Report
```
📈 FINAL SUMMARY REPORT
==================================================

📊 Product Statistics:
  Total products found: 8
  Successfully scraped: 8
  Failed to scrape: 0
  Success rate: 100.0%

💬 Reviews Statistics:
  Total reviews scraped: 342
  Products with reviews: 6
  Average reviews per product: 57.0

✅ DATA QUALITY CHECKS
   ✅ All products have clean descriptions
   ✅ All products have positive_percent = -1
   ✅ Schema validation pass rate > 90%
   ✅ Image coverage > 80%
   ✅ Specification coverage > 80%
```

## Troubleshooting

### Test Fails to Connect to MongoDB
```bash
# Check MongoDB is running
mongosh

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/shopwise_db
```

### Reviews Not Scraping
```bash
# Product might have no reviews
# Or reviews page structure changed
# Check screenshot in data/screenshots/
```

### Schema Validation Fails
```bash
# Update Product model if schema changed
# Or update test validation function
```

## Adding New Tests

1. Create test file in `tests/` directory
2. Follow naming convention: `test-*.js`
3. Add script to `package.json`:
   ```json
   "test:mytest": "node tests/test-mytest.js"
   ```
4. Document in this README

## Related Documentation

- [Testing Guide](../docs/TESTING_GUIDE.md) - Complete testing documentation
- [Product Schema](../docs/PRODUCT_SCHEMA.md) - Product model specification
- [Review Schema](../docs/REVIEW_SCHEMA.md) - Review model specification
- [Positive Percent Convention](../docs/POSITIVE_PERCENT_CONVENTION.md) - Field usage guide

## Notes

- Tests use real scraping (not mocked)
- Tests write to database (use test database if concerned)
- Use `--clean` flag to remove existing data before test
- Tests can take 5-10 minutes for full brand scraping
- Screenshots saved on error for debugging

---

**Need Help?** Check the [Testing Guide](../docs/TESTING_GUIDE.md) for detailed information.

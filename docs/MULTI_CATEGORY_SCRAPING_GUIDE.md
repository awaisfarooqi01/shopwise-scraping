# Multi-Category Scraping Guide

## Overview
The PriceOye scraper now supports scraping products from **any category**, not just mobiles.

---

## ✅ **Supported Categories**

- `mobiles` - Mobile phones (default)
- `smart-watches` - Smart watches
- `tablets` - Tablets
- `headphones` - Headphones
- `accessories` - Phone accessories
- `power-banks` - Power banks
- And any future categories added to PriceOye

---

## 📝 **Usage Examples**

### **1. Scrape Brand in Different Categories**

```javascript
const PriceOyeScraper = require('./src/scrapers/priceoye/priceoye-scraper');

const scraper = new PriceOyeScraper();
await scraper.initialize();

// Scrape mobiles (default - backwards compatible)
await scraper.scrapeBrand('samsung');
// URL: https://priceoye.pk/mobiles/samsung

// Scrape smart watches
await scraper.scrapeBrand('samsung', 'smart-watches');
// URL: https://priceoye.pk/smart-watches/samsung

// Scrape tablets
await scraper.scrapeBrand('apple', 'tablets');
// URL: https://priceoye.pk/tablets/apple

// Scrape headphones
await scraper.scrapeBrand('samsung', 'headphones');
// URL: https://priceoye.pk/headphones/samsung
```

### **2. Scrape Brand with Direct URL** (Category auto-detected)

```javascript
// Category is automatically detected from the URL
await scraper.scrapeBrand('https://priceoye.pk/smart-watches/samsung');
// Detects: category = 'smart-watches'
```

---

## 🔍 **How It Works**

### **A. Dynamic Category Detection**

The scraper automatically detects the category from the current page URL:

```javascript
// Example URL: https://priceoye.pk/smart-watches/samsung/galaxy-watch-5
const categoryMatch = currentUrl.match(/\/(mobiles|smart-watches|tablets|...)\/[a-z0-9-]+/i);
const category = categoryMatch ? categoryMatch[1] : 'mobiles';
// Result: category = 'smart-watches'
```

### **B. Dynamic URL Pattern Matching**

The scraper uses the detected category to find product links:

```javascript
// Uses detected category in selectors
const linkSelectors = [
  `a[href*="/${category}/"]`,  // e.g., a[href*="/smart-watches/"]
  '.product-card a'
];

// Matches product URLs for any category
// ✅ /mobiles/samsung/galaxy-s23
// ✅ /smart-watches/samsung/galaxy-watch-5
// ✅ /tablets/apple/ipad-pro
// ❌ /smart-watches/pricelist (excluded)
```

---

## 🎯 **Command Line Usage**

### **CLI Examples**

```bash
# Scrape mobiles (default)
node src/cli.js brand samsung

# Scrape smart watches
node src/cli.js brand samsung smart-watches

# Scrape tablets
node src/cli.js brand apple tablets

# Scrape by direct URL
node src/cli.js url https://priceoye.pk/smart-watches/samsung
```

---

## 📊 **Test Examples**

### **Test Scraping Smart Watches**

```javascript
// tests/test-smart-watches-scraping.js
const scraper = new PriceOyeScraper();
await scraper.initialize();

try {
  // Scrape all Samsung smart watches
  const products = await scraper.scrapeBrand('samsung', 'smart-watches');
  
  console.log(`✅ Scraped ${products.length} smart watches`);
  
  products.forEach(p => {
    console.log(`- ${p.name} (${p.price} PKR)`);
  });
} catch (error) {
  console.error('❌ Error:', error.message);
}

await scraper.close();
```

---

## ⚠️ **Important Notes**

### **1. Category Must Exist on PriceOye**

Make sure the category exists on PriceOye.pk:
- ✅ Valid: `https://priceoye.pk/smart-watches/samsung`
- ❌ Invalid: `https://priceoye.pk/invalid-category/samsung`

### **2. Brand Must Have Products in That Category**

Some brands may not have products in certain categories:
- ✅ `samsung` in `mobiles` - Many products
- ✅ `samsung` in `smart-watches` - Has products
- ⚠️ `xiaomi` in `tablets` - May have 0 products

### **3. Backwards Compatibility**

Old code without category parameter still works (defaults to `mobiles`):

```javascript
// Old code - still works ✅
await scraper.scrapeBrand('samsung');

// New code - more flexible ✅
await scraper.scrapeBrand('samsung', 'smart-watches');
```

---

## 🔧 **Brand & Category Auto-Creation**

### **How It Works**

1. **Brand Not Found**: 
   - Scraper calls backend API with `autoLearn = true`
   - Backend creates brand automatically
   - Returns `brand_id` and `canonical_name`

2. **Category Not Mapped**:
   - Scraper logs warning with instructions
   - Product saved with `category_id = null`
   - Metadata flag: `category_mapping_missing = true`
   - Admin can create mapping later via API

### **Create Category Mapping**

```bash
# API endpoint: POST /api/v1/category-mappings

curl -X POST http://localhost:3000/api/v1/category-mappings \
  -H "Content-Type: application/json" \
  -d '{
    "platform_id": "6919ddac3af87bff38a68140",
    "platform_category": "Smart Watches",
    "category_id": "6919ddac3af87bff38a68158",
    "subcategory_id": "6919ddac3af87bff38a6816c"
  }'
```

---

## 🐛 **Error Handling**

### **1. 404 - Page Not Found**

```javascript
// Automatically detected and skipped
// ✅ Logs warning: "⚠️  Page not found (404 error)"
// ✅ Continues to next product
// ❌ Does NOT crash the entire scrape
```

### **2. Missing Brand**

```javascript
// ✅ Brand auto-created via backend API
// ✅ Product saved with brand_id
// ✅ Original brand name preserved if canonical_name missing
```

### **3. Missing Category Mapping**

```javascript
// ✅ Logged with helpful instructions
// ✅ Product saved with metadata flags
// ✅ Admin notified to create mapping
```

---

## 📈 **Performance Tips**

### **1. Scrape Multiple Categories in Parallel**

```javascript
const categories = ['mobiles', 'smart-watches', 'tablets'];

await Promise.all(
  categories.map(category =>
    scraper.scrapeBrand('samsung', category)
  )
);
```

### **2. Rate Limiting**

```javascript
// Add delay between categories
for (const category of categories) {
  await scraper.scrapeBrand('samsung', category);
  await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec delay
}
```

---

## ✅ **Summary**

**What Changed:**
- ✅ `scrapeBrand()` now accepts `categorySlug` parameter
- ✅ Dynamic category detection from URLs
- ✅ Supports all PriceOye categories (not just mobiles)
- ✅ Backwards compatible (defaults to `mobiles`)
- ✅ Auto-creates missing brands
- ✅ Gracefully handles missing category mappings
- ✅ Detects and skips 404 pages

**Benefits:**
- 🚀 Scrape any product category
- 🔧 Flexible and extensible
- 🛡️ Robust error handling
- 📊 Better data coverage

---

## 📞 **Need Help?**

Check these docs:
- `SCRAPER_FIXES_COMPLETE.md` - Complete fixes summary
- `SCRAPER_COMMANDS.md` - Command reference
- `QUICKSTART.md` - Getting started

**Last Updated**: November 23, 2025

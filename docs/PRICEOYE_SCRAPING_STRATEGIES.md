# PriceOye Scraping Strategies

## 📊 **Site Structure Analysis**

PriceOye has a hierarchical structure:

```
PriceOye Homepage
├── Categories (e.g., Mobiles, Laptops, Tablets)
│   ├── https://priceoye.pk/mobiles/ (All mobiles)
│   ├── https://priceoye.pk/laptops/ (All laptops)
│   └── ...
│
└── Brand Pages within Categories
    ├── https://priceoye.pk/mobiles/samsung/ (Samsung mobiles)
    ├── https://priceoye.pk/mobiles/apple/ (Apple mobiles)
    ├── https://priceoye.pk/laptops/dell/ (Dell laptops)
    └── ...
```

---

## 🎯 **RECOMMENDED STRATEGY: Brand-Based Scraping**

### **✅ Strategy #1: Scrape by Category → Brand → Products** (RECOMMENDED)

**Workflow:**
1. Start with category page (e.g., `/mobiles/`)
2. Extract all brand links from category page
3. For each brand, scrape all products
4. Save products with proper category + brand mapping

**Pros:**
- ✅ **Automatic brand mapping** - Brand is part of the URL
- ✅ **Better organization** - Natural hierarchy
- ✅ **Easier resume** - Can restart from specific brand if interrupted
- ✅ **Better rate limiting** - Can pause between brands
- ✅ **Cleaner logs** - Easy to track progress

**Cons:**
- ⚠️ Requires parsing category pages to find brand links
- ⚠️ Need to handle pagination within each brand

**Code Structure:**
```javascript
async scrapeCategoryByBrands(categoryUrl) {
  // 1. Visit category page (e.g., https://priceoye.pk/mobiles/)
  // 2. Extract all brand links
  const brandLinks = await this.extractBrandLinks(categoryUrl);
  
  // 3. For each brand
  for (const brandLink of brandLinks) {
    // 4. Scrape all products for this brand
    await this.scrapeBrandProducts(brandLink);
  }
}
```

**Example URLs:**
```
Category: https://priceoye.pk/mobiles/
Brands:
  - https://priceoye.pk/mobiles/samsung/
  - https://priceoye.pk/mobiles/apple/
  - https://priceoye.pk/mobiles/xiaomi/
  - https://priceoye.pk/mobiles/infinix/
  - ... (all brands)
```

---

### **Strategy #2: Scrape Entire Category at Once**

**Workflow:**
1. Visit category page (e.g., `/mobiles/`)
2. Handle pagination to get ALL products
3. Extract brand from each product listing

**Pros:**
- ✅ Simpler initial implementation
- ✅ Gets all products in one go

**Cons:**
- ❌ **No automatic brand context** - Must parse brand from product name or details
- ❌ **Harder to resume** - If interrupted, must restart entire category
- ❌ **More memory intensive** - Large product lists
- ❌ **Pagination complexity** - Category pages may have 100+ pages

**Not Recommended** - Use Strategy #1 instead.

---

### **Strategy #3: Sitemap-Based Scraping**

**Workflow:**
1. Download PriceOye sitemap (if available)
2. Parse sitemap for product URLs
3. Scrape each product directly

**Pros:**
- ✅ Most complete - Gets ALL products
- ✅ No need to navigate category/brand pages

**Cons:**
- ❌ **No sitemap found** (checked: https://priceoye.pk/sitemap.xml - 404)
- ❌ No brand/category context from URL alone
- ❌ Hard to organize scraping runs

**Not Applicable** - PriceOye doesn't seem to have a public sitemap.

---

### **Strategy #4: Search-Based Scraping**

**Workflow:**
1. Use search functionality to find products
2. Scrape search results

**Cons:**
- ❌ Incomplete - May not get all products
- ❌ Unreliable - Search may change
- ❌ No hierarchical organization

**Not Recommended** - Use Strategy #1 instead.

---

## 🏆 **IMPLEMENTATION PLAN: Brand-Based Scraping**

### **Phase 1: Category Page Parsing**

```javascript
/**
 * Extract all brand links from a category page
 * @param {string} categoryUrl - e.g., https://priceoye.pk/mobiles/
 * @returns {Array} Array of {brand, url}
 */
async extractBrandLinks(categoryUrl) {
  await this.page.goto(categoryUrl);
  
  // Extract brand sections/filters
  const brands = await this.page.evaluate(() => {
    // Option 1: Brand filter sidebar
    const brandElements = document.querySelectorAll('.brand-filter a');
    
    // Option 2: Brand section/grid
    // const brandElements = document.querySelectorAll('.brands-grid a');
    
    return Array.from(brandElements).map(el => ({
      brand: el.textContent.trim(),
      url: el.href,
      slug: el.href.split('/').filter(Boolean).pop()
    }));
  });
  
  return brands;
}
```

### **Phase 2: Brand Products Scraping**

```javascript
/**
 * Scrape all products for a specific brand in a category
 * @param {Object} brandInfo - {brand, url, slug}
 * @returns {Array} Scraped products
 */
async scrapeBrandProducts(brandInfo) {
  logger.info(`🏷️  Scraping ${brandInfo.brand} products...`);
  
  const products = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    // Visit brand page with pagination
    const pageUrl = `${brandInfo.url}?page=${page}`;
    await this.page.goto(pageUrl);
    
    // Extract product links from listing
    const productLinks = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product-card a'))
        .map(a => a.href);
    });
    
    if (productLinks.length === 0) {
      hasMore = false;
      break;
    }
    
    // Scrape each product
    for (const productUrl of productLinks) {
      const product = await this.scrapeProduct(productUrl);
      if (product) {
        // Brand is already in context!
        product.brand = brandInfo.brand;
        products.push(product);
      }
    }
    
    page++;
  }
  
  logger.info(`✅ ${brandInfo.brand}: Scraped ${products.length} products`);
  return products;
}
```

### **Phase 3: Main Orchestrator**

```javascript
/**
 * Scrape entire PriceOye site by category and brand
 */
async scrapeFullSite() {
  const categories = [
    { name: 'Mobiles', url: 'https://priceoye.pk/mobiles/' },
    { name: 'Laptops', url: 'https://priceoye.pk/laptops/' },
    { name: 'Tablets', url: 'https://priceoye.pk/tablets/' },
    { name: 'Smart Watches', url: 'https://priceoye.pk/smart-watches/' },
    // ... add all categories
  ];
  
  for (const category of categories) {
    logger.info(`📂 Scraping category: ${category.name}`);
    
    // 1. Get all brands for this category
    const brands = await this.extractBrandLinks(category.url);
    logger.info(`   Found ${brands.length} brands`);
    
    // 2. Scrape each brand
    for (const brand of brands) {
      await this.scrapeBrandProducts(brand);
      
      // Rate limiting: wait between brands
      await this.page.waitForTimeout(2000);
    }
  }
}
```

---

## 📋 **COMPARISON TABLE**

| Strategy | Pros | Cons | Recommended |
|----------|------|------|-------------|
| **Brand-Based** | ✅ Auto brand mapping<br>✅ Easy resume<br>✅ Better organization | ⚠️ Parse category pages | ✅ **YES** |
| **Category-Only** | ✅ Simple | ❌ No brand context<br>❌ Hard to resume | ❌ No |
| **Sitemap** | ✅ Complete | ❌ No sitemap available | ❌ N/A |
| **Search** | - | ❌ Incomplete<br>❌ Unreliable | ❌ No |

---

## 🔧 **IMPLEMENTATION CONSIDERATIONS**

### **1. Rate Limiting**
```javascript
// Between products: 1-2 seconds
await this.page.waitForTimeout(1500);

// Between brands: 2-3 seconds
await this.page.waitForTimeout(2500);

// Between categories: 5 seconds
await this.page.waitForTimeout(5000);
```

### **2. Resume Capability**
```javascript
// Save progress after each brand
await this.saveProgress({
  category: currentCategory,
  brand: currentBrand,
  productsScraped: count,
  lastProductUrl: lastUrl
});

// On restart, skip completed brands
const progress = await this.loadProgress();
if (progress) {
  // Resume from last brand
}
```

### **3. Error Handling**
```javascript
// If a brand fails, continue to next brand
try {
  await this.scrapeBrandProducts(brand);
} catch (error) {
  logger.error(`Failed to scrape ${brand.name}:`, error);
  // Save failed brand for retry later
  await this.saveFailedBrand(brand);
  continue; // Don't stop entire scraping
}
```

### **4. Database Optimization**
```javascript
// Batch insert products per brand
const products = await this.scrapeBrandProducts(brand);
await Product.insertMany(products, { ordered: false }); // ordered: false = continue on duplicates
```

---

## 🎯 **NEXT STEPS**

1. ✅ **Implement `extractBrandLinks()`** - Parse category pages
2. ✅ **Implement `scrapeBrandProducts()`** - Scrape all products for a brand
3. ✅ **Add progress tracking** - Resume capability
4. ✅ **Add rate limiting** - Respect PriceOye servers
5. ✅ **Test with one category** - Validate strategy works
6. ✅ **Scale to all categories** - Full site scraping

---

## 📊 **ESTIMATED METRICS**

Assuming:
- **Categories:** 10 (Mobiles, Laptops, Tablets, etc.)
- **Brands per category:** 20 average
- **Products per brand:** 50 average
- **Total products:** ~10,000

**Scraping Time Estimate:**
- Product scrape time: 10 seconds (page load + extraction + reviews)
- Products: 10,000 × 10s = 100,000s = ~28 hours
- Rate limiting overhead: +30% = ~36 hours total

**Recommendation:** Run scraper overnight or over a weekend.

---

## 💡 **TIPS**

1. **Start Small:** Test with ONE brand first (e.g., Samsung mobiles)
2. **Monitor:** Watch logs and database to ensure quality
3. **Validate:** Check a few products manually to verify data accuracy
4. **Optimize:** Once stable, can reduce wait times slightly
5. **Schedule:** Use cron jobs for periodic updates (weekly/monthly)

---

## 🚀 **READY TO IMPLEMENT?**

Use the **Brand-Based Strategy (#1)** for best results!

Next: Implement `extractBrandLinks()` and `scrapeBrandProducts()` methods.

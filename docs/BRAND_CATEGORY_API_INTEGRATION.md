# Brand & Category Normalization - Implementation Guide

**Last Updated:** November 16, 2025  
**Backend APIs:** Ready ✅  
**Status:** Ready for Integration

---

## 🎯 Overview

This guide explains how the scraping service integrates with the backend's Brand & Category Mapping APIs to ensure consistent data across all platforms.

**Backend Implementation:**
- ✅ Brand normalization API (fuzzy matching + learning)
- ✅ Category mapping API (auto-mapping + confidence scoring)
- ✅ 31 endpoints ready for integration
- ✅ Postman collection available

---

## 📊 Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Platform      │      │    Scraping      │      │    Backend      │
│   (PriceOye)    │─────▶│    Service       │─────▶│    API          │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                  │                          │
                                  │                          │
                         Extract Brand/Category    POST /brands/normalize
                         "Samsng Mobile"          POST /category-mappings/map
                                  │                          │
                                  ▼                          ▼
                         ┌──────────────────┐      ┌─────────────────┐
                         │  Normalized Data │◀─────│  Matched Brand  │
                         │  brand_id: xxx   │      │  category_id    │
                         │  category_id     │      │  confidence     │
                         └──────────────────┘      └─────────────────┘
```

---

## 🔧 Integration Points

### 1. Brand Normalization

**When scraping a product, extract the brand name and normalize it:**

```javascript
// In your scraper
const scrapedBrand = "Samsng Mobile"; // Extracted from platform

// Call backend normalization API
const normalizedBrand = await normalizeBrand(scrapedBrand);

// Use the result
if (normalizedBrand.brand_id) {
  product.brand_id = normalizedBrand.brand_id;
  product.brand = normalizedBrand.normalized; // "Samsung"
} else {
  // No match found, use original or flag for review
  product.brand = scrapedBrand;
  product.mapping_metadata.needs_review = true;
}
```

**Backend API:**
```http
POST /api/v1/brands/normalize
Content-Type: application/json

{
  "brand_name": "Samsng Mobile",
  "auto_learn": true
}

Response:
{
  "success": true,
  "data": {
    "result": {
      "brand_id": "6919ddac3af87bff38a68197",
      "confidence": 0.857,
      "source": "fuzzy_match",
      "needs_review": true,
      "original": "Samsng Mobile",
      "normalized": "Samsung"
    }
  }
}
```

---

### 2. Category Mapping

**When scraping a product, extract the platform category and map it:**

```javascript
// In your scraper
const platformCategory = "Mobiles"; // Extracted from PriceOye
const platformId = "6919ddac3af87bff38a68140"; // PriceOye ID

// Call backend category mapping API
const mappedCategory = await mapCategory(platformId, platformCategory);

// Use the result
if (mappedCategory.category_id) {
  product.category_id = mappedCategory.category_id;
  product.subcategory_id = mappedCategory.subcategory_id;
  product.category_name = mappedCategory.category_name;
} else {
  // No mapping found, flag for review
  product.mapping_metadata.needs_review = true;
  product.mapping_metadata.unmapped_category = platformCategory;
}
```

**Backend API:**
```http
POST /api/v1/category-mappings/map
Content-Type: application/json

{
  "platform_id": "6919ddac3af87bff38a68140",
  "platform_category": "Mobiles",
  "auto_create": true,
  "min_confidence": 0.7
}

Response:
{
  "success": true,
  "data": {
    "result": {
      "category_id": "6919ddac3af87bff38a68158",
      "subcategory_id": "6919ddac3af87bff38a68167",
      "confidence": 1.0,
      "source": "existing_mapping",
      "needs_review": false
    }
  }
}
```

---

## 🛠️ Implementation

### Step 1: Create API Client

Create a client to interact with backend APIs:

```javascript
// src/services/backend-api/client.js

const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

class BackendAPIClient {
  constructor() {
    this.baseURL = config.backend.apiUrl || 'http://localhost:5000/api/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add request/response interceptors for logging
    this.setupInterceptors();
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`API Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('API Response Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Normalize a brand name
   * @param {string} brandName - Brand name to normalize
   * @param {boolean} autoLearn - Auto-learn if confidence >= 0.9
   * @returns {Promise<Object>} Normalized brand data
   */
  async normalizeBrand(brandName, autoLearn = true) {
    try {
      const response = await this.client.post('/brands/normalize', {
        brand_name: brandName,
        auto_learn: autoLearn,
      });
      
      return response.data.data.result;
    } catch (error) {
      logger.error(`Brand normalization failed for "${brandName}":`, error.message);
      
      // Return fallback response
      return {
        brand_id: null,
        confidence: 0,
        source: 'error',
        needs_review: true,
        original: brandName,
        normalized: null,
        error: error.message,
      };
    }
  }

  /**
   * Batch normalize brand names
   * @param {Array<string>} brandNames - Array of brand names
   * @param {boolean} autoLearn - Auto-learn high confidence matches
   * @returns {Promise<Object>} Batch normalization results
   */
  async normalizeBrandsBatch(brandNames, autoLearn = false) {
    try {
      const response = await this.client.post('/brands/normalize/batch', {
        brand_names: brandNames,
        auto_learn: autoLearn,
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('Batch brand normalization failed:', error.message);
      throw error;
    }
  }

  /**
   * Map platform category to our category system
   * @param {string} platformId - Platform ObjectId
   * @param {string} platformCategory - Platform category name
   * @param {boolean} autoCreate - Auto-create mapping if match found
   * @param {number} minConfidence - Minimum confidence to auto-create
   * @returns {Promise<Object>} Category mapping result
   */
  async mapCategory(platformId, platformCategory, autoCreate = true, minConfidence = 0.7) {
    try {
      const response = await this.client.post('/category-mappings/map', {
        platform_id: platformId,
        platform_category: platformCategory,
        auto_create: autoCreate,
        min_confidence: minConfidence,
      });
      
      return response.data.data.result;
    } catch (error) {
      logger.error(`Category mapping failed for "${platformCategory}":`, error.message);
      
      // Return fallback response
      return {
        category_id: null,
        subcategory_id: null,
        confidence: 0,
        source: 'error',
        needs_review: true,
        original_category: platformCategory,
        error: error.message,
      };
    }
  }

  /**
   * Batch map categories
   * @param {string} platformId - Platform ObjectId
   * @param {Array<Object>} categories - Array of category objects
   * @param {boolean} autoCreate - Auto-create mappings
   * @returns {Promise<Object>} Batch mapping results
   */
  async mapCategoriesBatch(platformId, categories, autoCreate = true) {
    try {
      const response = await this.client.post('/category-mappings/map/batch', {
        platform_id: platformId,
        categories: categories,
        auto_create: autoCreate,
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('Batch category mapping failed:', error.message);
      throw error;
    }
  }

  /**
   * Get all brands (for caching)
   * @param {number} limit - Maximum brands to fetch
   * @returns {Promise<Array>} List of brands
   */
  async getAllBrands(limit = 1000) {
    try {
      const response = await this.client.get('/brands', {
        params: { limit, page: 1 },
      });
      
      return response.data.data.brands;
    } catch (error) {
      logger.error('Failed to fetch brands:', error.message);
      return [];
    }
  }

  /**
   * Get platform category mappings (for caching)
   * @param {string} platformId - Platform ObjectId
   * @returns {Promise<Array>} List of mappings
   */
  async getPlatformMappings(platformId) {
    try {
      const response = await this.client.get(`/category-mappings/platform/${platformId}`);
      
      return response.data.data.mappings;
    } catch (error) {
      logger.error(`Failed to fetch mappings for platform ${platformId}:`, error.message);
      return [];
    }
  }
}

module.exports = new BackendAPIClient();
```

---

### Step 2: Create Normalization Service

Wrapper service with caching:

```javascript
// src/services/normalization/normalization.service.js

const backendAPI = require('../backend-api/client');
const logger = require('../../utils/logger');
const NodeCache = require('node-cache');

class NormalizationService {
  constructor() {
    // Cache for 1 hour
    this.brandCache = new NodeCache({ stdTTL: 3600 });
    this.categoryCache = new NodeCache({ stdTTL: 3600 });
    
    // Initialize cache
    this.initializeCache();
  }

  async initializeCache() {
    try {
      // Fetch and cache all brands
      const brands = await backendAPI.getAllBrands();
      brands.forEach(brand => {
        this.brandCache.set(brand.normalized_name, brand);
        // Also cache by name
        this.brandCache.set(brand.name.toLowerCase(), brand);
        // Cache aliases
        brand.aliases.forEach(alias => {
          this.brandCache.set(alias.toLowerCase(), brand);
        });
      });
      
      logger.info(`Initialized brand cache with ${brands.length} brands`);
    } catch (error) {
      logger.error('Failed to initialize cache:', error);
    }
  }

  /**
   * Normalize brand with caching
   */
  async normalizeBrand(brandName) {
    if (!brandName || typeof brandName !== 'string') {
      return {
        brand_id: null,
        confidence: 0,
        source: 'invalid_input',
        needs_review: true,
        original: brandName,
        normalized: null,
      };
    }

    // Check cache first
    const normalized = brandName.toLowerCase().trim();
    const cached = this.brandCache.get(normalized);
    
    if (cached) {
      logger.debug(`Brand cache hit: "${brandName}" → "${cached.name}"`);
      return {
        brand_id: cached._id,
        confidence: 1.0,
        source: 'cache',
        needs_review: false,
        original: brandName,
        normalized: cached.name,
      };
    }

    // Call API
    logger.debug(`Brand cache miss: "${brandName}", calling API`);
    const result = await backendAPI.normalizeBrand(brandName);
    
    // Cache the result if successful
    if (result.brand_id && result.confidence >= 0.8) {
      this.brandCache.set(normalized, {
        _id: result.brand_id,
        name: result.normalized,
        normalized_name: result.normalized.toLowerCase(),
      });
    }
    
    return result;
  }

  /**
   * Map category with caching
   */
  async mapCategory(platformId, platformCategory) {
    if (!platformCategory || typeof platformCategory !== 'string') {
      return {
        category_id: null,
        confidence: 0,
        source: 'invalid_input',
        needs_review: true,
        original_category: platformCategory,
      };
    }

    // Check cache
    const cacheKey = `${platformId}:${platformCategory.toLowerCase()}`;
    const cached = this.categoryCache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Category cache hit: "${platformCategory}"`);
      return cached;
    }

    // Call API
    logger.debug(`Category cache miss: "${platformCategory}", calling API`);
    const result = await backendAPI.mapCategory(platformId, platformCategory);
    
    // Cache successful mappings
    if (result.category_id && result.confidence >= 0.7) {
      this.categoryCache.set(cacheKey, result);
    }
    
    return result;
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.brandCache.flushAll();
    this.categoryCache.flushAll();
    logger.info('Caches cleared');
  }

  /**
   * Refresh cache
   */
  async refreshCache() {
    this.clearCache();
    await this.initializeCache();
  }
}

module.exports = new NormalizationService();
```

---

### Step 3: Update Product Scraper

Integrate normalization into your scraper:

```javascript
// src/scrapers/priceoye/priceoye.scraper.js

const BaseScraper = require('../base/base.scraper');
const normalizationService = require('../../services/normalization/normalization.service');
const logger = require('../../utils/logger');

class PriceOyeScraper extends BaseScraper {
  constructor() {
    super('PriceOye');
    this.platformId = '6919ddac3af87bff38a68140'; // From backend seeder
  }

  async scrapeProduct(url) {
    try {
      // 1. Scrape product data
      const rawProduct = await this.extractProductData(url);
      
      // 2. Normalize brand
      const brandResult = await normalizationService.normalizeBrand(
        rawProduct.brand
      );
      
      // 3. Map category
      const categoryResult = await normalizationService.mapCategory(
        this.platformId,
        rawProduct.category
      );
      
      // 4. Build product object
      const product = {
        platform_id: this.platformId,
        name: rawProduct.name,
        
        // Normalized brand
        brand_id: brandResult.brand_id,
        brand: brandResult.normalized || rawProduct.brand,
        
        // Mapped category
        category_id: categoryResult.category_id,
        subcategory_id: categoryResult.subcategory_id,
        category_name: categoryResult.category_name,
        subcategory_name: categoryResult.subcategory_name,
        
        // Price and other data
        price: rawProduct.price,
        description: rawProduct.description,
        specifications: rawProduct.specifications,
        media: rawProduct.media,
        
        // Original platform data (preserved)
        platform_metadata: {
          original_brand: rawProduct.brand,
          original_category: rawProduct.category,
          original_url: url,
        },
        
        // Mapping metadata
        mapping_metadata: {
          brand_confidence: brandResult.confidence,
          brand_source: brandResult.source,
          category_confidence: categoryResult.confidence,
          category_source: categoryResult.source,
          needs_review: brandResult.needs_review || categoryResult.needs_review,
          scraped_at: new Date(),
        },
        
        // Standard fields
        original_url: url,
        platform_name: 'PriceOye',
        is_active: true,
      };
      
      // Log normalization results
      logger.info('Product normalized:', {
        name: product.name,
        brand: {
          original: rawProduct.brand,
          normalized: product.brand,
          confidence: brandResult.confidence,
        },
        category: {
          original: rawProduct.category,
          mapped: product.category_name,
          confidence: categoryResult.confidence,
        },
      });
      
      return product;
    } catch (error) {
      logger.error('Product scraping failed:', error);
      throw error;
    }
  }

  async extractProductData(url) {
    // Your existing scraping logic
    // Returns raw product data from platform
  }
}

module.exports = PriceOyeScraper;
```

---

## 📋 Best Practices

### 1. Error Handling

Always handle API errors gracefully:

```javascript
try {
  const result = await normalizationService.normalizeBrand(brandName);
  
  if (result.error) {
    // API call failed, use original data
    product.brand = brandName;
    product.mapping_metadata.needs_review = true;
    product.mapping_metadata.error = result.error;
  }
} catch (error) {
  logger.error('Normalization error:', error);
  // Continue with original data
}
```

### 2. Caching Strategy

- ✅ Cache successful matches (confidence >= 0.8)
- ✅ Cache for 1 hour (configurable)
- ✅ Refresh cache periodically
- ✅ Clear cache when needed

### 3. Batch Operations

For bulk scraping, use batch endpoints:

```javascript
// Collect brands from multiple products
const brands = products.map(p => p.brand);

// Normalize in batch
const results = await backendAPI.normalizeBrandsBatch(brands);

// Apply results
products.forEach((product, index) => {
  const result = results.results[index];
  product.brand_id = result.brand_id;
  product.brand = result.normalized || product.brand;
});
```

### 4. Confidence Thresholds

```javascript
const MIN_AUTO_ACCEPT = 0.9;  // Auto-accept without review
const MIN_ACCEPTABLE = 0.7;   // Accept but flag for review
const NEEDS_MANUAL = 0.7;     // Below this, needs manual review

if (result.confidence >= MIN_AUTO_ACCEPT) {
  // Use automatically
  product.mapping_metadata.needs_review = false;
} else if (result.confidence >= MIN_ACCEPTABLE) {
  // Use but flag for review
  product.mapping_metadata.needs_review = true;
} else {
  // Flag for manual review
  product.mapping_metadata.needs_review = true;
  product.mapping_metadata.manual_review_required = true;
}
```

---

## 🔍 Monitoring & Review

### Products Needing Review

Query products that need manual review:

```javascript
const needsReview = await Product.find({
  'mapping_metadata.needs_review': true,
  'mapping_metadata.brand_confidence': { $lt: 0.9 },
}).limit(100);

logger.info(`Found ${needsReview.length} products needing review`);
```

### Review Queue Dashboard

Build a dashboard showing:
- Products with low confidence scores
- Unmapped categories
- Unmatched brands
- Recent normalizations

---

## 📊 Testing

### Test Cases

```javascript
// Test 1: Exact match
const result1 = await normalizationService.normalizeBrand('Samsung');
expect(result1.confidence).toBe(1.0);
expect(result1.source).toBe('exact_match');

// Test 2: Fuzzy match
const result2 = await normalizationService.normalizeBrand('Samsng');
expect(result2.confidence).toBeGreaterThan(0.8);
expect(result2.normalized).toBe('Samsung');

// Test 3: No match
const result3 = await normalizationService.normalizeBrand('UnknownBrand123');
expect(result3.brand_id).toBeNull();
expect(result3.needs_review).toBe(true);

// Test 4: Category mapping
const result4 = await normalizationService.mapCategory(
  platformId,
  'Mobiles'
);
expect(result4.category_id).toBeDefined();
expect(result4.confidence).toBeGreaterThan(0.7);
```

---

## 🚀 Migration Strategy

### Phase 1: Setup (Week 1)
1. ✅ Backend APIs ready
2. [ ] Create API client in scraping service
3. [ ] Create normalization service with caching
4. [ ] Add configuration for backend URL

### Phase 2: Integration (Week 2)
1. [ ] Update PriceOye scraper
2. [ ] Test normalization with sample products
3. [ ] Monitor confidence scores
4. [ ] Adjust thresholds

### Phase 3: Optimization (Week 3)
1. [ ] Implement batch operations
2. [ ] Add caching layer
3. [ ] Create review dashboard
4. [ ] Performance tuning

### Phase 4: Scale (Week 4)
1. [ ] Add other platforms (Daraz, Telemart)
2. [ ] Bulk product migration
3. [ ] Monitor and refine mappings
4. [ ] Production deployment

---

## 📚 Related Documentation

**Backend Documentation:**
- [Phase 5 Summary](../../shopwise-backend/docs/PHASE_5_COMPLETION_SUMMARY.md)
- [API Testing Guide](../../shopwise-backend/docs/API_TESTING_GUIDE.md)
- [Postman Collection](../../shopwise-backend/docs/ShopWise_Brand_CategoryMapping_Postman_Collection.json)

**Scraping Documentation:**
- [Category Reference](./CATEGORY_REFERENCE.md)
- [Platform Reference](./PLATFORM_REFERENCE.md)
- [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)

---

## 🎯 Next Steps

1. **Setup API Client**
   - Create `src/services/backend-api/client.js`
   - Add configuration for backend URL
   - Test connectivity

2. **Create Normalization Service**
   - Implement caching layer
   - Add error handling
   - Write tests

3. **Update Scrapers**
   - Modify product extraction
   - Add normalization calls
   - Test with sample products

4. **Monitor & Optimize**
   - Track confidence scores
   - Review flagged products
   - Refine mappings

---

**Status:** Ready for Implementation 🚀  
**Backend APIs:** 31 endpoints available  
**Documentation:** Complete ✅

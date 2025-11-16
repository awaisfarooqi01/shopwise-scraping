# Category & Brand Normalization Strategy

> Solutions for handling inconsistent categories and brands across different e-commerce platforms

---

## ✅ **IMPLEMENTED SOLUTION: Backend API Integration**

**Status:** ✅ **FULLY IMPLEMENTED** (Phases 5 & 6 Complete)  
**Implementation Date:** January 2025  
**Backend Version:** v1.0  
**Documentation:** See [BRAND_CATEGORY_API_INTEGRATION.md](BRAND_CATEGORY_API_INTEGRATION.md)

### Quick Summary

The ShopWise backend now provides **centralized Brand & Category Mapping APIs** that handle all normalization logic. The scraping service integrates with these APIs instead of implementing its own normalization logic.

**Key Features:**
- ✅ **31 API Endpoints** (18 Brand + 13 Category Mapping)
- ✅ **Fuzzy Brand Matching** (85%+ confidence with Levenshtein distance)
- ✅ **Auto-learning** from corrections
- ✅ **Batch Operations** for performance
- ✅ **Confidence Scoring** for quality tracking
- ✅ **Admin Review Queue** for manual verification

**Architecture:**
```
Scraper → Backend API Client → Brand/Category APIs → MongoDB (brands, category_mappings)
```

For complete integration guide, see: **[BRAND_CATEGORY_API_INTEGRATION.md](BRAND_CATEGORY_API_INTEGRATION.md)**

---

## 📊 Original Problem Analysis

### Current Schema
- **Categories**: Hierarchical structure with pre-defined categories (Electronics, Fashion, etc.)
- **Brands**: ✅ **NOW**: Separate Brand collection with fuzzy matching and aliases
- **Challenge**: Each platform uses different category names and brand naming conventions

---

## 🎯 Problem Statement

### Category Mapping Problem
Different platforms use different category names:
```javascript
// PriceOye
"Mobiles" → ?

// Daraz
"Mobile & Accessories" → ?

// Telemart
"Smartphones" → ?

// Our System
"Electronics > Mobile Phones" → ✓
```

### Brand Normalization Problem
Different platforms use different brand formats:
```javascript
// Different representations of same brand
"Samsung"
"SAMSUNG"
"Samsung Official"
"Samsung Electronics"
"samsung"
```

---

## 🏆 **IMPLEMENTED SOLUTION: Hybrid Backend API Approach**

### Why This Solution?

The **Hybrid Backend API Approach** was selected and fully implemented because it provides:

1. ✅ **Centralized Logic**: All normalization logic in one place (backend)
2. ✅ **Consistent Results**: All scrapers use same normalization
3. ✅ **Self-Improving**: Auto-learning from corrections
4. ✅ **Quality Control**: Admin review queue for uncertain matches
5. ✅ **Performance**: Batch operations and caching support
6. ✅ **Future-Proof**: Easy to add new platforms without scraper changes

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SCRAPING SERVICE LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│  Scraper → Extract Data → Call Backend APIs → Store Product    │
│                                ↓                                │
│                    Backend API Client                           │
│                    Normalization Service (with cache)           │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICE LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│  Brand APIs (18 endpoints)                                      │
│  - POST /brands/normalize          (fuzzy matching)             │
│  - POST /brands/normalize/batch    (bulk processing)            │
│  - GET  /brands/search             (search brands)              │
│  - GET  /brands/top                (popular brands)             │
│  - POST /brands/learn              (learn from corrections)     │
│                                                                  │
│  Category Mapping APIs (13 endpoints)                           │
│  - POST /category-mappings/map              (auto-mapping)      │
│  - POST /category-mappings/map/batch        (bulk mapping)      │
│  - GET  /category-mappings/platform/:id     (platform mappings) │
│  - GET  /category-mappings/unmapped/:id     (needs review)      │
│  - POST /category-mappings/learn            (learn corrections) │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  brands collection                                              │
│  - Canonical brand names, aliases, fuzzy matching               │
│  - Learning history, popularity scores                          │
│                                                                  │
│  category_mappings collection                                   │
│  - Platform-specific category mappings                          │
│  - Confidence scores, verification status                       │
│                                                                  │
│  products collection                                            │
│  - brand_id (ObjectId reference)                                │
│  - category_id (ObjectId reference)                             │
│  - platform_metadata (original values)                          │
│  - mapping_metadata (confidence, needs_review)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features Implemented

#### 1. **Brand Normalization with Fuzzy Matching**
```javascript
// POST /api/v1/brands/normalize
{
  "brand_name": "Samsng",        // Typo
  "auto_learn": true
}

// Response:
{
  "brand_id": "6919ddac3af87bff38a68197",
  "normalized_name": "Samsung",  // Corrected!
  "confidence": 0.857,           // 85.7% confidence
  "match_type": "fuzzy",
  "needs_review": false
}
```

**Algorithm:**
- Exact match (100% confidence)
- Case-insensitive match (95% confidence)
- Levenshtein distance fuzzy matching (60-90% confidence)
- Auto-create new brand if no match (50% confidence, flagged for review)

#### 2. **Category Auto-Mapping**
```javascript
// POST /api/v1/category-mappings/map
{
  "platform_id": "6919ddac3af87bff38a68190",
  "platform_category": "Mobile Phones",
  "auto_create": true
}

// Response:
{
  "category_id": "6919ddac3af87bff38a68180",
  "mapping_id": "...",
  "confidence": 0.95,
  "needs_verification": false
}
```

#### 3. **Batch Processing**
```javascript
// POST /api/v1/brands/normalize/batch
{
  "brands": [
    { "brand_name": "Samsung", "auto_learn": true },
    { "brand_name": "Apple", "auto_learn": true },
    { "brand_name": "Xiaomi", "auto_learn": true },
    { "brand_name": "OnePlus", "auto_learn": true }
  ]
}

// Response: Array of normalized brands
```

#### 4. **Learning from Corrections**
```javascript
// POST /api/v1/brands/learn
{
  "incorrect_name": "SAMSNG",
  "correct_brand_id": "6919ddac3af87bff38a68197",
  "platform_id": "6919ddac3af87bff38a68190"
}

// System learns: "SAMSNG" → Samsung (adds to aliases)
```

---

## 📋 Integration Guide for Scrapers

### Quick Start

1. **Install Backend API Client** (see [BRAND_CATEGORY_API_INTEGRATION.md](BRAND_CATEGORY_API_INTEGRATION.md))
2. **Configure Backend URL** in environment variables
3. **Update Scraper Pipeline** to call normalization APIs
4. **Enable Caching** for performance

### Example Scraper Integration

```javascript
// scraper/priceoye-scraper.js
const BackendAPIClient = require('../services/backend-api-client');
const NormalizationService = require('../services/normalization-service');

class PriceOyeScraper {
  constructor() {
    this.apiClient = new BackendAPIClient();
    this.normalizationService = new NormalizationService(this.apiClient);
  }

  async scrapeProduct(url) {
    // 1. Extract raw data
    const rawProduct = await this.extractProductData(url);
    
    // 2. Normalize brand (with caching)
    const brandResult = await this.normalizationService.normalizeBrand(
      rawProduct.brand,
      this.platformId
    );
    
    // 3. Map category (with caching)
    const categoryResult = await this.normalizationService.mapCategory(
      this.platformId,
      rawProduct.category
    );
    
    // 4. Build product object
    const product = {
      name: rawProduct.name,
      price: rawProduct.price,
      
      // Normalized data
      brand_id: brandResult.brand_id,
      brand: brandResult.normalized_name,
      category_id: categoryResult.category_id,
      
      // Original platform data
      platform_metadata: {
        original_brand: rawProduct.brand,
        original_category: rawProduct.category,
        original_price: rawProduct.price
      },
      
      // Mapping quality indicators
      mapping_metadata: {
        brand_confidence: brandResult.confidence,
        category_confidence: categoryResult.confidence,
        needs_review: brandResult.needs_review || categoryResult.needs_review
      }
    };
    
    return product;
  }
}
```

---

## 🚀 Migration Plan for Existing Scrapers

### Phase 1: API Client Setup (Week 1)
- ✅ Create `services/backend-api-client.js`
- ✅ Create `services/normalization-service.js`
- ✅ Add caching layer (NodeCache or Redis)
- ✅ Configure environment variables

### Phase 2: Update Base Scraper (Week 2)
- Update `BaseScraper` to include normalization methods
- Add helper methods for brand/category normalization
- Update product schema to include new fields

### Phase 3: Update Platform Scrapers (Week 3-4)
- Update PriceOye scraper
- Update Daraz scraper
- Update Telemart scraper
- Test normalization accuracy

### Phase 4: Data Migration (Week 5)
- Migrate existing products to use brand_id
- Backfill mapping_metadata
- Verify data quality

---

## 📊 Benefits for Scraping Service

### 1. **Simplified Scraper Code**
- No need to implement fuzzy matching logic
- No need to maintain brand/category mappings
- Focus on extraction, not normalization

### 2. **Consistent Results**
- All scrapers use same normalization
- Centralized learning improves all platforms
- Reduced duplicate brands

### 3. **Performance**
- Batch API calls for multiple products
- Local caching reduces API calls
- Fast lookups with confidence scores

### 4. **Quality Tracking**
- Know which products need review
- Confidence scores for data quality
- Admin can verify uncertain mappings

### 5. **Easy Maintenance**
- Update mappings without redeploying scrapers
- Add new platforms without code changes
- Learn from corrections automatically

---

## 🔗 Related Documentation

- **[BRAND_CATEGORY_API_INTEGRATION.md](BRAND_CATEGORY_API_INTEGRATION.md)** - Complete integration guide
- **Backend API Docs** - Available in `shopwise-backend/docs/`
  - `API_IMPLEMENTATION_PROGRESS.md` - All 31 endpoints documented
  - `PHASE_5_COMPLETION_SUMMARY.md` - Implementation details
  - `ShopWise_Brand_CategoryMapping_Postman_Collection.json` - Postman collection

---

## 📝 Original Strategy Analysis (Historical)

The sections below document the original options considered before implementing the backend API solution.

---

## 💡 Solution Options (Original Analysis)

### Overview
Create a mapping collection that translates platform-specific categories/brands to our standardized ones.

### Architecture

```javascript
// New Collections

// 1. Category Mapping Collection
category_mappings: {
  _id: ObjectId,
  platform_id: ObjectId,                    // Which platform
  platform_category: String,                // Their category name
  platform_category_path: String,           // Their full path
  our_category_id: ObjectId,                // Our category reference
  our_subcategory_id: ObjectId,             // Our subcategory reference
  confidence: Number,                       // Mapping confidence (0-1)
  is_verified: Boolean,                     // Manually verified?
  created_at: Date,
  updated_at: Date
}

// 2. Brand Normalization Collection
brands: {
  _id: ObjectId,
  name: String,                             // Canonical brand name
  aliases: [String],                        // Alternative names
  logo_url: String,
  website: String,
  country: String,
  is_verified: Boolean,
  product_count: Number,                    // Cached count
  created_at: Date,
  updated_at: Date
}

// 3. Brand Mapping Collection (optional)
brand_mappings: {
  _id: ObjectId,
  platform_id: ObjectId,
  platform_brand_name: String,              // What platform calls it
  brand_id: ObjectId,                       // Our canonical brand
  is_verified: Boolean,
  created_at: Date
}
```

### Modified Product Schema
```javascript
// Products Collection (Updated)
products: {
  // ... existing fields ...
  
  // Platform's original data (preserved)
  platform_metadata: {
    original_category: String,              // "Mobiles"
    original_category_path: String,         // "Electronics > Mobiles"
    original_brand: String,                 // "SAMSUNG Official"
  },
  
  // Our normalized data
  brand_id: ObjectId,                       // Reference to brands collection
  brand: String,                            // Denormalized for quick access
  category_id: ObjectId,                    // Our category
  subcategory_id: ObjectId,                 // Our subcategory
  
  // ... rest of fields ...
}
```

### Pros ✅
- **Preserves original data**: Can always reference platform's original category/brand
- **Flexible**: Easy to add new mappings without code changes
- **Searchable**: Can search by both platform names and our names
- **Maintainable**: Update mappings in database, not code
- **Trackable**: Know which mappings are verified vs auto-generated
- **Historical**: Keep track of category/brand changes

### Cons ❌
- **More complex**: Additional collections to manage
- **Initial setup**: Need to create initial mappings
- **Maintenance**: Mappings need to be updated when platforms change

### Implementation Steps
1. Create Brand collection and seeders
2. Create CategoryMapping collection
3. Create BrandMapping collection
4. Build mapping service in scraping service
5. Update scrapers to use mapping service
6. Create admin interface to manage mappings

---

## **OPTION 2: Rule-Based Normalization** (Simpler)

### Overview
Use algorithmic rules and keyword matching to map categories and brands.

### Architecture

```javascript
// Mapping Service in Scraping Project
class CategoryMapper {
  static rules = {
    'mobile': ['category_id': 'electronics', 'subcategory': 'mobile_phones'],
    'phone': ['category_id': 'electronics', 'subcategory': 'mobile_phones'],
    'smartphone': ['category_id': 'electronics', 'subcategory': 'mobile_phones'],
    'laptop': ['category_id': 'electronics', 'subcategory': 'laptops'],
    // ... more rules
  };
  
  static mapCategory(platformCategory) {
    const normalized = platformCategory.toLowerCase();
    
    for (const [keyword, mapping] of Object.entries(this.rules)) {
      if (normalized.includes(keyword)) {
        return mapping;
      }
    }
    
    return null; // Unmapped
  }
}

class BrandNormalizer {
  static brandVariations = {
    'Samsung': ['samsung', 'SAMSUNG', 'Samsung Official', 'Samsung Electronics'],
    'Apple': ['apple', 'APPLE', 'Apple Inc', 'Apple Official'],
    // ... more brands
  };
  
  static normalize(platformBrand) {
    const cleaned = platformBrand.trim().toLowerCase();
    
    for (const [canonical, variations] of Object.entries(this.brandVariations)) {
      if (variations.some(v => cleaned.includes(v.toLowerCase()))) {
        return canonical;
      }
    }
    
    return platformBrand; // Return original if no match
  }
}
```

### Pros ✅
- **Simple**: No additional database collections
- **Fast**: In-memory matching
- **Easy to implement**: Just mapping dictionaries
- **Lightweight**: Minimal database overhead

### Cons ❌
- **Rigid**: Rules hardcoded in code
- **Limited**: Can't handle complex scenarios
- **No history**: Can't track what was mapped
- **Hard to maintain**: Need code deployment to update rules
- **No verification**: Can't mark mappings as verified

---

## **OPTION 3: Hybrid Approach** (Best of Both Worlds ⭐⭐)

### Overview
Combine rule-based normalization with database mappings for flexibility.

### Architecture

```javascript
// 1. Brands Collection (Canonical brands)
brands: {
  _id: ObjectId,
  name: String,                             // "Samsung"
  normalized_name: String,                  // "samsung" (for matching)
  aliases: [String],                        // ["SAMSUNG", "Samsung Official"]
  logo_url: String,
  website: String,
  country: String,
  is_verified: Boolean,
  product_count: Number,
  popularity_score: Number,                 // For ranking
  created_at: Date,
  updated_at: Date
}

// 2. Category Mappings (Platform-specific overrides)
category_mappings: {
  _id: ObjectId,
  platform_id: ObjectId,
  platform_category: String,
  our_category_id: ObjectId,
  our_subcategory_id: ObjectId,
  mapping_type: String,                     // 'auto', 'manual', 'rule'
  confidence: Number,
  is_verified: Boolean,
  created_at: Date
}

// 3. Products (Enhanced)
products: {
  // ... existing fields ...
  
  brand_id: ObjectId,                       // Reference to brands
  brand: String,                            // Denormalized canonical name
  
  platform_metadata: {
    original_category: String,
    original_category_path: String,
    original_brand: String,
  },
  
  mapping_metadata: {
    category_confidence: Number,            // How confident in mapping
    brand_confidence: Number,
    needs_review: Boolean,                  // Flag for manual review
  }
}
```

### Mapping Flow

```javascript
// Pseudo-code for hybrid approach
async function mapProduct(scrapedProduct, platformId) {
  // 1. Try database mapping first (highest priority)
  const dbMapping = await CategoryMapping.findOne({
    platform_id: platformId,
    platform_category: scrapedProduct.category
  });
  
  if (dbMapping && dbMapping.is_verified) {
    return {
      category_id: dbMapping.our_category_id,
      subcategory_id: dbMapping.our_subcategory_id,
      confidence: 1.0,
      source: 'database_verified'
    };
  }
  
  // 2. Try rule-based mapping (medium priority)
  const ruleMapping = CategoryMapper.mapCategory(scrapedProduct.category);
  
  if (ruleMapping) {
    return {
      ...ruleMapping,
      confidence: 0.8,
      source: 'rule_based'
    };
  }
  
  // 3. Try fuzzy matching (low priority)
  const fuzzyMapping = await fuzzyMatchCategory(scrapedProduct.category);
  
  if (fuzzyMapping && fuzzyMapping.confidence > 0.6) {
    return {
      ...fuzzyMapping,
      source: 'fuzzy_match',
      needs_review: true  // Flag for manual verification
    };
  }
  
  // 4. No mapping found - flag for manual review
  return {
    category_id: null,
    subcategory_id: null,
    confidence: 0,
    source: 'unmapped',
    needs_review: true
  };
}
```

### Brand Normalization Flow

```javascript
async function normalizeBrand(platformBrand, platformId) {
  const cleaned = platformBrand.trim();
  
  // 1. Direct exact match
  let brand = await Brand.findOne({ 
    $or: [
      { name: cleaned },
      { aliases: cleaned }
    ]
  });
  
  if (brand) {
    return {
      brand_id: brand._id,
      brand_name: brand.name,
      confidence: 1.0,
      source: 'exact_match'
    };
  }
  
  // 2. Case-insensitive match
  brand = await Brand.findOne({ 
    normalized_name: cleaned.toLowerCase() 
  });
  
  if (brand) {
    // Add this variation to aliases
    await brand.updateOne({ 
      $addToSet: { aliases: cleaned } 
    });
    
    return {
      brand_id: brand._id,
      brand_name: brand.name,
      confidence: 0.9,
      source: 'case_insensitive'
    };
  }
  
  // 3. Fuzzy matching (Levenshtein distance)
  const fuzzyMatch = await findSimilarBrand(cleaned);
  
  if (fuzzyMatch && fuzzyMatch.similarity > 0.85) {
    return {
      brand_id: fuzzyMatch.brand._id,
      brand_name: fuzzyMatch.brand.name,
      confidence: fuzzyMatch.similarity,
      source: 'fuzzy_match',
      needs_review: true
    };
  }
  
  // 4. Create new brand (auto-generated)
  const newBrand = await Brand.create({
    name: cleaned,
    normalized_name: cleaned.toLowerCase(),
    aliases: [],
    is_verified: false,
    product_count: 1
  });
  
  return {
    brand_id: newBrand._id,
    brand_name: newBrand.name,
    confidence: 0.5,
    source: 'auto_created',
    needs_review: true
  };
}
```

### Pros ✅
- **Flexible**: Combines best of both approaches
- **Smart fallback**: Multiple strategies
- **Auto-learning**: Can improve over time
- **Trackable**: Know how each mapping was made
- **Reviewable**: Flag uncertain mappings
- **Scalable**: Grows with platform additions

### Cons ❌
- **Most complex**: Requires more development
- **More code**: Multiple mapping strategies
- **Performance**: Multiple lookups per product

---

## 🏆 **FINAL RECOMMENDATION**

### ✅ Use Backend API Integration (Implemented)

The **Backend API Integration** approach is the recommended and **implemented solution** because:

1. ✅ **Production Ready**: Fully tested with 11 endpoint tests
2. ✅ **Self-Improving**: Auto-learning from corrections
3. ✅ **Quality Control**: Admin review queue for uncertain matches
4. ✅ **User-Friendly**: Search by any brand variation
5. ✅ **SEO Friendly**: Canonical brand names
6. ✅ **Analytics Ready**: Track brand popularity and confidence scores
7. ✅ **Future-Proof**: Easy to add new platforms

### Getting Started

1. **Read the integration guide**: [BRAND_CATEGORY_API_INTEGRATION.md](BRAND_CATEGORY_API_INTEGRATION.md)
2. **Set up API client**: Copy implementation examples
3. **Update your scraper**: Add normalization calls
4. **Test integration**: Verify normalization accuracy
5. **Monitor quality**: Review confidence scores and flagged products

---

## 📈 Implementation Status

### Backend (✅ Complete)
- ✅ Brand & Category models
- ✅ 31 API endpoints (18 Brand + 13 Category)
- ✅ Fuzzy matching with Levenshtein distance
- ✅ Auto-learning from corrections
- ✅ Admin review queue
- ✅ Batch processing
- ✅ Statistics and analytics
- ✅ Comprehensive testing (11 endpoints verified)

### Scraping Service (📋 Pending)
- 📋 Backend API client implementation
- 📋 Normalization service with caching
- 📋 Update base scraper classes
- 📋 Update platform scrapers
- 📋 Configuration management
- 📋 Integration testing

---

## 🎯 Next Steps for Scraping Team

1. **Review Integration Guide**: Read [BRAND_CATEGORY_API_INTEGRATION.md](BRAND_CATEGORY_API_INTEGRATION.md)
2. **Implement API Client**: Use provided examples
3. **Add Caching Layer**: NodeCache or Redis
4. **Update Scrapers**: Integrate normalization calls
5. **Test & Validate**: Verify normalization accuracy
6. **Monitor Quality**: Track confidence scores

---

**Last Updated:** January 2025  
**Status:** Backend Implementation Complete ✅  
**Next Phase:** Scraper Integration 📋

### Phase 1: Brand Collection

#### 1.1 Create Brand Model
```javascript
// src/models/brand.model.js
const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  normalized_name: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  aliases: [{
    type: String,
    trim: true
  }],
  logo_url: String,
  website: String,
  country: String,
  description: String,
  is_verified: {
    type: Boolean,
    default: false
  },
  product_count: {
    type: Number,
    default: 0
  },
  popularity_score: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'brands'
});

// Indexes
brandSchema.index({ name: 'text' });
brandSchema.index({ normalized_name: 1 });
brandSchema.index({ aliases: 1 });
brandSchema.index({ product_count: -1 });
brandSchema.index({ popularity_score: -1 });
```

#### 1.2 Create Brand Seeder
```javascript
// Seed popular Pakistani brands
const popularBrands = [
  {
    name: 'Samsung',
    normalized_name: 'samsung',
    aliases: ['SAMSUNG', 'Samsung Official', 'Samsung Electronics'],
    country: 'South Korea',
    is_verified: true
  },
  {
    name: 'Apple',
    normalized_name: 'apple',
    aliases: ['APPLE', 'Apple Inc', 'Apple Official'],
    country: 'USA',
    is_verified: true
  },
  // ... more brands
];
```

#### 1.3 Update Product Model
```javascript
// Add to product model
brand_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Brand',
  index: true
},
brand: {
  type: String,
  trim: true,
  index: true
},
platform_metadata: {
  original_category: String,
  original_category_path: String,
  original_brand: String,
  original_subcategory: String
},
mapping_metadata: {
  category_confidence: Number,
  brand_confidence: Number,
  category_source: String,
  brand_source: String,
  needs_review: Boolean
}
```

### Phase 2: Category Mapping Collection

```javascript
// src/models/category-mapping.model.js
const categoryMappingSchema = new mongoose.Schema({
  platform_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    required: true
  },
  platform_category: {
    type: String,
    required: true,
    trim: true
  },
  platform_category_path: String,
  
  our_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  our_subcategory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  
  mapping_type: {
    type: String,
    enum: ['manual', 'auto', 'rule', 'fuzzy'],
    default: 'auto'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  verified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  usage_count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'category_mappings'
});

// Compound index for fast lookups
categoryMappingSchema.index({ 
  platform_id: 1, 
  platform_category: 1 
}, { unique: true });
```

### Phase 3: Mapping Services

#### 3.1 Brand Normalization Service
```javascript
// src/services/brand-normalization.service.js
class BrandNormalizationService {
  async normalizeBrand(platformBrand, platformId) {
    // Implementation from hybrid approach above
  }
  
  async findOrCreateBrand(brandName) {
    // Find or create brand
  }
  
  async mergeBrands(sourceBrandId, targetBrandId) {
    // Merge duplicate brands
  }
  
  async updateBrandAliases(brandId, newAlias) {
    // Add new alias to brand
  }
}
```

#### 3.2 Category Mapping Service
```javascript
// src/services/category-mapping.service.js
class CategoryMappingService {
  async mapCategory(platformCategory, platformId) {
    // Implementation from hybrid approach above
  }
  
  async createMapping(platformId, platformCategory, ourCategoryId, ourSubcategoryId) {
    // Create new mapping
  }
  
  async getUnmappedCategories(platformId) {
    // Find products with unmapped categories
  }
}
```

### Phase 4: Scraper Integration

```javascript
// In scraper pipeline
async function processCategoryAndBrand(scrapedProduct, platformId) {
  // Map category
  const categoryMapping = await CategoryMappingService.mapCategory(
    scrapedProduct.category,
    platformId
  );
  
  // Normalize brand
  const brandMapping = await BrandNormalizationService.normalizeBrand(
    scrapedProduct.brand,
    platformId
  );
  
  return {
    // Our normalized data
    category_id: categoryMapping.category_id,
    subcategory_id: categoryMapping.subcategory_id,
    brand_id: brandMapping.brand_id,
    brand: brandMapping.brand_name,
    
    // Platform's original data
    platform_metadata: {
      original_category: scrapedProduct.category,
      original_category_path: scrapedProduct.categoryPath,
      original_brand: scrapedProduct.brand
    },
    
    // Mapping quality indicators
    mapping_metadata: {
      category_confidence: categoryMapping.confidence,
      brand_confidence: brandMapping.confidence,
      category_source: categoryMapping.source,
      brand_source: brandMapping.source,
      needs_review: categoryMapping.needs_review || brandMapping.needs_review
    }
  };
}
```

---

## 🔍 **Benefits for Users**

### 1. Brand Search
```javascript
// Users can search by any brand variation
GET /api/products?brand=samsung
GET /api/products?brand=SAMSUNG
GET /api/products?brand=Samsung%20Official
// All return same results (Samsung products)
```

### 2. Brand Filtering
```javascript
// Get all brands with product counts
GET /api/brands?sort=product_count
// Response:
[
  { name: "Samsung", product_count: 1523, logo_url: "..." },
  { name: "Apple", product_count: 892, logo_url: "..." },
  ...
]
```

### 3. Brand Auto-complete
```javascript
// Smart suggestions
GET /api/brands/autocomplete?q=sam
// Response:
["Samsung", "Samsonite", "Sam Edelman"]
```

### 4. Cross-Platform Brand Comparison
```javascript
// Compare same brand across platforms
GET /api/products/compare?brand=Samsung&platforms=priceoye,daraz
```

---

## 📊 Database Changes Summary

### New Collections (3)
1. ✅ **brands** - Canonical brand information
2. ✅ **category_mappings** - Platform category to our category mappings
3. ⚠️ **brand_mappings** - Optional, only if needed for complex scenarios

### Modified Collections (1)
1. **products** - Add brand_id, platform_metadata, mapping_metadata

### Indexes to Add
- brands: name (text), normalized_name, aliases, product_count
- category_mappings: (platform_id + platform_category) compound unique
- products: brand_id

---

## 🎯 Migration Strategy

### Step 1: Create New Collections
- Deploy brand model
- Deploy category_mapping model
- Run brand seeder (popular brands)

### Step 2: Update Product Schema
- Add new fields (brand_id, platform_metadata, mapping_metadata)
- Keep existing brand field for backward compatibility

### Step 3: Migrate Existing Data
```javascript
// Migration script
async function migrateBrands() {
  const products = await Product.find({});
  
  for (const product of products) {
    if (product.brand) {
      const brandMapping = await BrandNormalizationService.normalizeBrand(
        product.brand,
        product.platform_id
      );
      
      await product.updateOne({
        brand_id: brandMapping.brand_id,
        'platform_metadata.original_brand': product.brand,
        'mapping_metadata.brand_confidence': brandMapping.confidence
      });
    }
  }
}
```

### Step 4: Update Scrapers
- Integrate mapping services into scraper pipeline
- Test with each platform

### Step 5: Create Admin Interface
- View unmapped categories
- Manually create/verify mappings
- Merge duplicate brands

---

## ⚠️ Important Considerations

### Data Quality
- Monitor mapping confidence scores
- Regularly review flagged products (needs_review: true)
- Periodically clean up auto-created brands

### Performance
- Cache frequently used mappings
- Index properly for fast lookups
- Consider Redis cache for popular brands

### Maintenance
- Monthly review of unmapped categories
- Quarterly brand cleanup (merge duplicates)
- Update mappings when platforms change structure

---

**Recommendation**: Implement **Hybrid Approach** with **Brand Collection** first, then add **Category Mappings** as needed.

This provides:
- ✅ Best user experience (searchable brands, filters)
- ✅ Data quality (canonical names)
- ✅ Flexibility (handle platform differences)
- ✅ Scalability (auto-learning system)
- ✅ Maintainability (trackable mappings)

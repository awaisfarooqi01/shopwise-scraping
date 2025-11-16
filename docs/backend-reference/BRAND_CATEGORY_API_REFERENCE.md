# Brand & Category Mapping API Reference

> Quick reference guide for ShopWise Backend Brand & Category Mapping APIs

**Backend Base URL:** `http://localhost:5000/api/v1`  
**Total Endpoints:** 31 (18 Brand + 13 Category Mapping)  
**Authentication:** Required for Admin endpoints (JWT Bearer token)

---

## 🎯 Quick Links

- **[Brand APIs](#brand-apis)** - 18 endpoints for brand normalization
- **[Category Mapping APIs](#category-mapping-apis)** - 13 endpoints for category mapping
- **[Most Used by Scrapers](#most-used-endpoints)** - Top 6 endpoints
- **[Integration Examples](#integration-examples)** - Code samples
- **[Error Codes](#error-codes)** - Common errors

---

## 🏷️ Brand APIs

### Public Endpoints (9)

#### 1. Get All Brands
```http
GET /api/v1/brands
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `sort` (string: 'name', 'product_count', 'popularity_score', 'created_at')
- `country` (string)
- `is_verified` (boolean)

**Response:**
```json
{
  "data": {
    "brands": [
      {
        "_id": "6919ddac3af87bff38a68197",
        "name": "Samsung",
        "normalized_name": "samsung",
        "aliases": ["SAMSUNG", "Samsung Official"],
        "logo_url": "https://example.com/samsung-logo.png",
        "country": "South Korea",
        "is_verified": true,
        "product_count": 1523,
        "popularity_score": 0.95,
        "created_at": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 36,
      "page": 1,
      "limit": 20,
      "pages": 2
    }
  }
}
```

---

#### 2. Search Brands ⭐
```http
GET /api/v1/brands/search?q=samsung
```

**Query Parameters:**
- `q` (string, required, min: 2 chars)
- `limit` (number, default: 10, max: 50)

**Response:**
```json
{
  "data": {
    "brands": [
      {
        "_id": "...",
        "name": "Samsung",
        "normalized_name": "samsung",
        "logo_url": "...",
        "product_count": 1523
      }
    ],
    "count": 1
  }
}
```

---

#### 3. Normalize Brand ⭐⭐⭐ (MOST USED)
```http
POST /api/v1/brands/normalize
```

**Request Body:**
```json
{
  "brand_name": "Samsng",
  "platform_id": "6919ddac3af87bff38a68190",
  "auto_learn": true
}
```

**Response:**
```json
{
  "data": {
    "brand_id": "6919ddac3af87bff38a68197",
    "normalized_name": "Samsung",
    "confidence": 0.857,
    "match_type": "fuzzy",
    "needs_review": false,
    "original_name": "Samsng"
  }
}
```

**Match Types:**
- `exact` - 100% confidence
- `case_insensitive` - 95% confidence
- `alias` - 100% confidence
- `fuzzy` - 60-90% confidence (Levenshtein distance)
- `created` - 50% confidence (new brand auto-created)

---

#### 4. Batch Normalize Brands ⭐⭐
```http
POST /api/v1/brands/normalize/batch
```

**Request Body:**
```json
{
  "brands": [
    { "brand_name": "Samsung", "auto_learn": true },
    { "brand_name": "Apple", "auto_learn": true },
    { "brand_name": "Xiaomi", "auto_learn": true }
  ]
}
```

**Response:**
```json
{
  "data": {
    "results": [
      {
        "brand_id": "...",
        "normalized_name": "Samsung",
        "confidence": 1.0,
        "match_type": "exact"
      },
      // ... more results
    ],
    "stats": {
      "total": 3,
      "exact_matches": 3,
      "fuzzy_matches": 0,
      "created": 0
    }
  }
}
```

---

#### 5. Get Top Brands
```http
GET /api/v1/brands/top?limit=10&sort=product_count
```

**Query Parameters:**
- `limit` (number, default: 10, max: 100)
- `sort` (string: 'product_count', 'popularity_score')

---

#### 6. Get Brand Statistics
```http
GET /api/v1/brands/statistics
```

**Response:**
```json
{
  "data": {
    "total_brands": 36,
    "verified_brands": 20,
    "unverified_brands": 16,
    "total_aliases": 58,
    "brands_with_products": 30,
    "brands_without_products": 6,
    "top_countries": [
      { "_id": "China", "count": 12 },
      { "_id": "USA", "count": 8 }
    ]
  }
}
```

---

### Admin Endpoints (9)

#### 7. Create Brand (Admin)
```http
POST /api/v1/brands/admin
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "OnePlus",
  "aliases": ["One Plus", "OnePlus Official"],
  "country": "China",
  "website": "https://www.oneplus.com",
  "logo_url": "https://example.com/oneplus-logo.png",
  "is_verified": true
}
```

---

#### 8. Update Brand (Admin)
```http
PUT /api/v1/brands/admin/:id
Authorization: Bearer <token>
```

---

#### 9. Delete Brand (Admin)
```http
DELETE /api/v1/brands/admin/:id
Authorization: Bearer <token>
```

---

#### 10. Add Alias (Admin)
```http
POST /api/v1/brands/admin/:id/alias
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "alias": "Samsung Electronics"
}
```

---

#### 11. Merge Brands (Admin)
```http
POST /api/v1/brands/admin/merge
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "source_brand_id": "...",
  "target_brand_id": "..."
}
```

---

#### 12. Learn from Correction (Admin) ⭐
```http
POST /api/v1/brands/admin/learn
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "incorrect_name": "SAMSNG",
  "correct_brand_id": "6919ddac3af87bff38a68197",
  "platform_id": "6919ddac3af87bff38a68190"
}
```

---

## 🗂️ Category Mapping APIs

### Public Endpoints (7)

#### 1. Get All Mappings
```http
GET /api/v1/category-mappings
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `platform_id` (ObjectId)
- `is_verified` (boolean)

---

#### 2. Get Platform Mappings
```http
GET /api/v1/category-mappings/platform/:platformId
```

**Response:**
```json
{
  "data": {
    "mappings": [
      {
        "_id": "...",
        "platform_id": "...",
        "platform_category": "Mobiles",
        "platform_category_path": "Electronics > Mobiles",
        "category_id": "...",
        "category": {
          "name": "Mobile Phones"
        },
        "confidence": 0.95,
        "is_verified": true
      }
    ]
  }
}
```

---

#### 3. Map Category ⭐⭐⭐ (MOST USED)
```http
POST /api/v1/category-mappings/map
```

**Request Body:**
```json
{
  "platform_id": "6919ddac3af87bff38a68190",
  "platform_category": "Mobile Phones",
  "platform_category_path": "Electronics > Mobile Phones",
  "auto_create": true
}
```

**Response:**
```json
{
  "data": {
    "mapping_id": "...",
    "category_id": "6919ddac3af87bff38a68180",
    "category_name": "Mobile Phones",
    "confidence": 0.95,
    "is_new": false,
    "needs_verification": false
  }
}
```

---

#### 4. Batch Map Categories ⭐⭐
```http
POST /api/v1/category-mappings/map/batch
```

**Request Body:**
```json
{
  "categories": [
    {
      "platform_category": "Mobiles",
      "platform_category_path": "Electronics > Mobiles"
    },
    {
      "platform_category": "Laptops",
      "platform_category_path": "Electronics > Laptops"
    }
  ],
  "platform_id": "6919ddac3af87bff38a68190",
  "auto_create": true
}
```

---

#### 5. Get Mapping Statistics
```http
GET /api/v1/category-mappings/statistics
```

**Response:**
```json
{
  "data": {
    "total_mappings": 13,
    "verified_mappings": 8,
    "unverified_mappings": 5,
    "mappings_by_platform": [
      { "platform": "PriceOye", "count": 5 },
      { "platform": "Daraz", "count": 8 }
    ],
    "confidence_distribution": {
      "high": 10,
      "medium": 2,
      "low": 1
    }
  }
}
```

---

### Admin Endpoints (6)

#### 6. Create Mapping (Admin)
```http
POST /api/v1/category-mappings/admin
Authorization: Bearer <token>
```

---

#### 7. Update Mapping (Admin)
```http
PUT /api/v1/category-mappings/admin/:id
Authorization: Bearer <token>
```

---

#### 8. Delete Mapping (Admin)
```http
DELETE /api/v1/category-mappings/admin/:id
Authorization: Bearer <token>
```

---

#### 9. Verify Mapping (Admin)
```http
POST /api/v1/category-mappings/admin/:id/verify
Authorization: Bearer <token>
```

---

#### 10. Get Unmapped Categories (Admin)
```http
GET /api/v1/category-mappings/admin/unmapped/:platformId
Authorization: Bearer <token>
```

---

#### 11. Learn from Correction (Admin) ⭐
```http
POST /api/v1/category-mappings/admin/learn
Authorization: Bearer <token>
```

---

## ⭐ Most Used Endpoints

### For Scrapers (Top 6)

1. **Brand Normalization** (Single)
   ```
   POST /api/v1/brands/normalize
   ```
   Use for: Each product's brand name

2. **Brand Normalization** (Batch)
   ```
   POST /api/v1/brands/normalize/batch
   ```
   Use for: Multiple products at once (better performance)

3. **Category Mapping** (Single)
   ```
   POST /api/v1/category-mappings/map
   ```
   Use for: Each product's category

4. **Category Mapping** (Batch)
   ```
   POST /api/v1/category-mappings/map/batch
   ```
   Use for: Multiple categories at once

5. **Brand Search**
   ```
   GET /api/v1/brands/search?q=samsung
   ```
   Use for: Cache warming, autocomplete

6. **Get Platform Mappings**
   ```
   GET /api/v1/category-mappings/platform/:id
   ```
   Use for: Cache initialization

---

## 💻 Integration Examples

### Example 1: Normalize Single Brand
```javascript
const axios = require('axios');

async function normalizeBrand(brandName, platformId) {
  try {
    const response = await axios.post('http://localhost:5000/api/v1/brands/normalize', {
      brand_name: brandName,
      platform_id: platformId,
      auto_learn: true
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Brand normalization failed:', error.response?.data);
    throw error;
  }
}

// Usage
const result = await normalizeBrand('Samsng', '6919ddac3af87bff38a68190');
console.log(result);
// {
//   brand_id: '6919ddac3af87bff38a68197',
//   normalized_name: 'Samsung',
//   confidence: 0.857,
//   match_type: 'fuzzy',
//   needs_review: false
// }
```

---

### Example 2: Batch Normalize Brands
```javascript
async function normalizeBrandsBatch(brands, platformId) {
  const response = await axios.post('http://localhost:5000/api/v1/brands/normalize/batch', {
    brands: brands.map(b => ({ 
      brand_name: b, 
      auto_learn: true 
    }))
  });
  
  return response.data.data.results;
}

// Usage
const brands = ['Samsung', 'Apple', 'Xiaomi', 'OnePlus'];
const results = await normalizeBrandsBatch(brands);
```

---

### Example 3: Map Category
```javascript
async function mapCategory(platformId, categoryName, categoryPath) {
  const response = await axios.post('http://localhost:5000/api/v1/category-mappings/map', {
    platform_id: platformId,
    platform_category: categoryName,
    platform_category_path: categoryPath,
    auto_create: true
  });
  
  return response.data.data;
}

// Usage
const mapping = await mapCategory(
  '6919ddac3af87bff38a68190',
  'Mobile Phones',
  'Electronics > Mobile Phones'
);
```

---

### Example 4: Complete Scraper Integration
```javascript
class ProductScraper {
  async scrapeAndNormalize(rawProduct, platformId) {
    // Normalize brand
    const brandResult = await axios.post('/api/v1/brands/normalize', {
      brand_name: rawProduct.brand,
      platform_id: platformId,
      auto_learn: true
    });
    
    // Map category
    const categoryResult = await axios.post('/api/v1/category-mappings/map', {
      platform_id: platformId,
      platform_category: rawProduct.category,
      auto_create: true
    });
    
    // Build normalized product
    return {
      name: rawProduct.name,
      price: rawProduct.price,
      
      // Normalized data
      brand_id: brandResult.data.data.brand_id,
      brand: brandResult.data.data.normalized_name,
      category_id: categoryResult.data.data.category_id,
      
      // Original platform data
      platform_metadata: {
        original_brand: rawProduct.brand,
        original_category: rawProduct.category
      },
      
      // Quality tracking
      mapping_metadata: {
        brand_confidence: brandResult.data.data.confidence,
        category_confidence: categoryResult.data.data.confidence,
        needs_review: brandResult.data.data.needs_review || categoryResult.data.data.needs_verification
      }
    };
  }
}
```

---

## ⚠️ Error Codes

### Common Errors

#### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "brand_name",
        "message": "Brand name is required"
      }
    ]
  }
}
```

#### 404 Not Found
```json
{
  "error": {
    "code": "BRAND_NOT_FOUND",
    "message": "Brand not found with id: 6919ddac3af87bff38a68197"
  }
}
```

#### 409 Conflict
```json
{
  "error": {
    "code": "BRAND_ALREADY_EXISTS",
    "message": "Brand with name 'Samsung' already exists"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## 🔐 Authentication

Admin endpoints require JWT authentication:

```javascript
const token = 'your-jwt-token';

axios.post('/api/v1/brands/admin', data, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

To get a token, authenticate via the auth endpoint:
```javascript
const response = await axios.post('/api/v1/auth/login', {
  email: 'admin@shopwise.com',
  password: 'your-password'
});

const token = response.data.data.tokens.access.token;
```

---

## 📊 Performance Tips

1. **Use Batch Operations**: Process multiple brands/categories in one request
2. **Implement Caching**: Cache normalized brands locally (1-hour TTL recommended)
3. **Enable Auto-learning**: Set `auto_learn: true` to improve accuracy over time
4. **Monitor Confidence Scores**: Review items with confidence < 0.7
5. **Warm up Cache**: Load frequently used brands/mappings on startup

---

## 🔗 Related Documentation

- **[BRAND_CATEGORY_API_INTEGRATION.md](../BRAND_CATEGORY_API_INTEGRATION.md)** - Complete integration guide
- **[CATEGORY_BRAND_NORMALIZATION_STRATEGY.md](../CATEGORY_BRAND_NORMALIZATION_STRATEGY.md)** - Normalization strategy

**Backend Documentation** (see `shopwise-backend/docs/`):
- `API_IMPLEMENTATION_PROGRESS.md` - All 91+ endpoints
- `PHASE_5_COMPLETION_SUMMARY.md` - Implementation details
- `ShopWise_Brand_CategoryMapping_Postman_Collection.json` - Postman collection

---

**Last Updated:** November 16, 2025  
**Backend Version:** v1.0  
**Total Endpoints:** 31 (18 Brand + 13 Category Mapping)

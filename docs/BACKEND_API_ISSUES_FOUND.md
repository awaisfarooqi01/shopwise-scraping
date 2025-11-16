# Backend API Issues Found During Phase 1.5 Testing

**Date:** November 16, 2025  
**Status:** ⚠️ **Backend API Bugs Found**  
**Impact:** Phase 1.5 integration tests failing due to backend validation errors

---

## 🐛 Issues Found

### Issue #1: Batch Brand Normalization API Mismatch ❌

**Endpoint:** `POST /api/v1/brands/normalize/batch`

**Problem:** Request body format mismatch between scraping service and backend

**Scraping Service Sends:**
```javascript
{
  brands: [
    { brand_name: 'Samsung', auto_learn: true },
    { brand_name: 'Apple', auto_learn: false }
  ]
}
```

**Backend Expects:**
```javascript
{
  brand_names: ['Samsung', 'Apple'],  // ❌ Different field name
  auto_learn: true                     // ❌ Single value, not per-brand
}
```

**Backend Validation Schema:**
```javascript
const batchNormalizeSchema = Joi.object({
  body: Joi.object({
    brand_names: Joi.array().items(
      Joi.string().trim().min(1).max(100)
    ).min(1).max(100).required(),
    auto_learn: Joi.boolean().default(true),
  }),
});
```

**Error:** "Validation failed" (400)

**Location:** 
- Backend: `shopwise-backend/src/api/validations/brand.validation.js:188`
- Scraping: `shopwise-scraping/src/services/backend-api-client.js:119`

---

### Issue #2: Category Repository Missing Method ❌

**Error:** `this.categoryRepository.findAll is not a function`

**Endpoint:** `POST /api/v1/category-mappings/map`

**Problem:** Backend category service calls `this.categoryRepository.findAll()` but the method doesn't exist in the repository

**Backend Log:**
```
Error finding matching category: this.categoryRepository.findAll is not a function
Error suggesting categories: this.categoryRepository.findAll is not a function
```

**Impact:** Category mapping works (returns 200) but shows errors in logs

**Location:** Backend category mapping service

---

### Issue #3: Get Top Brands Validation ⚠️

**Endpoint:** `GET /api/v1/brands/top?limit=500`

**Problem:** Backend validation restricts `limit` to maximum 100, but scraping service requests 500

**Backend Validation:**
```javascript
const getTopBrandsSchema = Joi.object({
  query: Joi.object({
    sort_by: Joi.string().valid('product_count', 'popularity_score').default('product_count'),
    limit: Joi.number().integer().min(1).max(100).default(10),  // ❌ Max 100
  }),
});
```

**Scraping Service Request:**
```javascript
const brands = await backendAPIClient.getTopBrands(500);  // ❌ Requests 500
```

**Error:** "Validation failed" (400)

**Location:**
- Backend: `shopwise-backend/src/api/validations/brand.validation.js:134`
- Scraping: `shopwise-scraping/src/services/normalization-service.js:64`

---

## 🔧 Recommended Fixes

### Fix Option 1: Update Scraping Service (Recommended)
Adapt scraping service to match existing backend API contracts.

#### Fix 1A: Batch Brand Normalization
```javascript
// In: src/services/backend-api-client.js

async normalizeBrandsBatch(brands, autoLearn = true) {
  try {
    // Extract brand names from objects
    const brandNames = brands.map(b => 
      typeof b === 'string' ? b : b.brand_name
    );
    
    const response = await this.client.post('/api/v1/brands/normalize/batch', {
      brand_names: brandNames,  // ✅ Match backend schema
      auto_learn: autoLearn,    // ✅ Single value
    });

    return response.data.data.results;
  } catch (error) {
    logger.error('Batch brand normalization failed:', error.message);
    throw error;
  }
}
```

#### Fix 1B: Get Top Brands - Use Multiple Requests
```javascript
// In: src/services/normalization-service.js

async initializeCache() {
  try {
    logger.info('Initializing normalization cache...');

    // Backend max limit is 100, so request 5 times
    const limit = 100;
    const totalNeeded = 500;
    let allBrands = [];
    
    for (let offset = 0; offset < totalNeeded; offset += limit) {
      const brands = await backendAPIClient.getTopBrands(limit);
      allBrands = allBrands.concat(brands);
      
      // Break if we got less than limit (no more data)
      if (brands.length < limit) break;
    }

    // Cache brands...
  } catch (error) {
    logger.error('Failed to initialize normalization cache:', error);
  }
}
```

**Note:** Backend needs pagination support (offset/skip parameter)

---

### Fix Option 2: Update Backend API (Alternative)
Change backend to accept scraping service's format.

#### Fix 2A: Update Backend Batch Normalization
```javascript
// In: shopwise-backend/src/api/validations/brand.validation.js

const batchNormalizeSchema = Joi.object({
  body: Joi.object({
    // Support both formats
    brands: Joi.array().items(Joi.object({
      brand_name: Joi.string().trim().min(1).max(100).required(),
      auto_learn: Joi.boolean().default(true)
    })).min(1).max(100),
    // OR
    brand_names: Joi.array().items(
      Joi.string().trim().min(1).max(100)
    ).min(1).max(100),
    auto_learn: Joi.boolean().default(true),
  }).xor('brands', 'brand_names'), // One or the other required
});
```

#### Fix 2B: Increase Top Brands Limit
```javascript
// In: shopwise-backend/src/api/validations/brand.validation.js

const getTopBrandsSchema = Joi.object({
  query: Joi.object({
    sort_by: Joi.string().valid('product_count', 'popularity_score').default('product_count'),
    limit: Joi.number().integer().min(1).max(1000).default(10),  // ✅ Increase to 1000
  }),
});
```

---

## 📊 Impact Assessment

| Issue | Severity | Impact on Phase 1.5 | Workaround Available |
|-------|----------|---------------------|---------------------|
| Batch normalize format | **HIGH** | Tests fail | Yes - Fix scraping service |
| Category repository | **MEDIUM** | Logs errors, still works | Yes - Fix backend |
| Top brands limit | **MEDIUM** | Cache initialization limited | Yes - Multiple requests |

---

## ✅ Decision: Fix Scraping Service

**Reasoning:**
1. ✅ **Faster** - Only need to update 2 files in scraping service
2. ✅ **Backend API is stable** - Used by other services
3. ✅ **Better separation** - Scraping service adapts to backend, not vice versa
4. ✅ **No breaking changes** - Backend API contract remains unchanged

---

## 🔧 Implementation Plan

### Step 1: Fix Batch Brand Normalization ✅
**File:** `src/services/backend-api-client.js`
- Change request format to `{ brand_names: [...], auto_learn: true }`
- Update method signature to accept array of strings or objects

### Step 2: Fix Top Brands Caching ✅
**File:** `src/services/normalization-service.js`
- Request 100 brands at a time (backend limit)
- Loop multiple times to get 500 brands
- OR reduce cache initialization to 100 brands

### Step 3: Update Tests ✅
**File:** `tests/services/normalization.test.js`
- Update batch normalization test expectations
- Test with corrected API format

### Step 4: Document Backend Issues ✅
**File:** Create issue in backend repo
- Document category repository issue
- Suggest adding pagination to top brands endpoint

---

## 🧪 Testing After Fixes

### Test Checklist
- [ ] Batch brand normalization works
- [ ] Top brands caching initializes (100 or 500 brands)
- [ ] Category mapping works without errors
- [ ] All integration tests pass
- [ ] Cache hit/miss tracking accurate

---

## 📝 Notes

### Backend API Documentation Needed
The scraping service developers had to **reverse-engineer** the API contracts by:
1. Reading backend validation schemas
2. Checking error logs
3. Trial and error

**Recommendation:** Backend should provide:
- OpenAPI/Swagger documentation
- Example requests/responses
- Validation schema documentation

### API Version Compatibility
Both services use `/api/v1/` but there's no version compatibility tracking. Consider:
- Semantic versioning for API changes
- Deprecation notices
- Migration guides

---

**Status:** ⚠️ **Fixes Required Before Phase 2**  
**Next Step:** Implement scraping service fixes and re-test

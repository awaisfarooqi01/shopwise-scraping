# Brand & Category Mapping API Testing Guide

## Test Environment
- Base URL: http://localhost:5000/api/v1
- Database: MongoDB (seeded with test data)

## Test Data IDs
Before testing, get these IDs from the database:
- Platform ID (PriceOye): Use from seeded data
- Brand ID (Samsung): Use from seeded data
- Category ID (Mobiles): Use from seeded data

---

## 1. Brand API Tests

### 1.1 Get All Brands (Public)
```bash
GET http://localhost:5000/api/v1/brands
```

### 1.2 Search Brands (Public)
```bash
GET http://localhost:5000/api/v1/brands/search?q=Samsung&limit=10
```

### 1.3 Get Top Brands (Public)
```bash
GET http://localhost:5000/api/v1/brands/top?sort_by=product_count&limit=10
```

### 1.4 Get Brand Statistics (Public)
```bash
GET http://localhost:5000/api/v1/brands/statistics
```

### 1.5 Get Brand by ID (Public)
```bash
GET http://localhost:5000/api/v1/brands/{BRAND_ID}
```

### 1.6 Get Brands by Country (Public)
```bash
GET http://localhost:5000/api/v1/brands/country/Pakistan
```

### 1.7 Normalize Brand Name (Public)
```bash
POST http://localhost:5000/api/v1/brands/normalize
Content-Type: application/json

{
  "brand_name": "Samsng Mobile",
  "auto_learn": true
}
```

### 1.8 Batch Normalize Brands (Public)
```bash
POST http://localhost:5000/api/v1/brands/normalize/batch
Content-Type: application/json

{
  "brand_names": ["Samsng", "Apple iPhone", "Xiomi"],
  "auto_learn": true
}
```

---

## 2. Category Mapping API Tests

### 2.1 Get All Mappings (Public)
```bash
GET http://localhost:5000/api/v1/category-mappings
```

### 2.2 Get Mapping Statistics (Public)
```bash
GET http://localhost:5000/api/v1/category-mappings/statistics
```

### 2.3 Get Platform Mappings (Public)
```bash
GET http://localhost:5000/api/v1/category-mappings/platform/{PLATFORM_ID}
```

### 2.4 Map Category (Public)
```bash
POST http://localhost:5000/api/v1/category-mappings/map
Content-Type: application/json

{
  "platform_id": "{PLATFORM_ID}",
  "platform_category": "Mobile Phones",
  "auto_create": true,
  "min_confidence": 0.7
}
```

### 2.5 Batch Map Categories (Public)
```bash
POST http://localhost:5000/api/v1/category-mappings/map/batch
Content-Type: application/json

{
  "platform_id": "{PLATFORM_ID}",
  "categories": [
    {"category": "Smart Phones"},
    {"category": "Laptops & Computers"}
  ],
  "auto_create": true
}
```

---

## 3. Admin-Only Tests (Require Authentication)

### 3.1 Login as Admin
```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@shopwise.pk",
  "password": "Admin@123"
}
```

**Save the token from response for subsequent requests**

### 3.2 Create Brand (Admin)
```bash
POST http://localhost:5000/api/v1/brands
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "name": "Test Brand",
  "country": "Pakistan",
  "description": "A test brand",
  "is_verified": true
}
```

### 3.3 Add Brand Alias (Admin)
```bash
POST http://localhost:5000/api/v1/brands/{BRAND_ID}/aliases
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "alias": "Samsng"
}
```

### 3.4 Create Manual Mapping (Admin)
```bash
POST http://localhost:5000/api/v1/category-mappings
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "platform_id": "{PLATFORM_ID}",
  "platform_category": "Smartphones",
  "our_category_id": "{CATEGORY_ID}"
}
```

### 3.5 Verify Mapping (Admin)
```bash
POST http://localhost:5000/api/v1/category-mappings/{MAPPING_ID}/verify
Authorization: Bearer {TOKEN}
```

---

## Expected Results

### Brand Normalization Examples

#### Test 1: Exact Match
Input: "Samsung"
Expected Output:
```json
{
  "brand_id": "...",
  "confidence": 1.0,
  "source": "exact_match",
  "needs_review": false,
  "original": "Samsung",
  "normalized": "Samsung"
}
```

#### Test 2: Fuzzy Match (High Confidence)
Input: "Samsng"
Expected Output:
```json
{
  "brand_id": "...",
  "confidence": 0.92,
  "source": "fuzzy_auto_learned",
  "needs_review": false,
  "original": "Samsng",
  "normalized": "Samsung"
}
```

#### Test 3: No Match
Input: "UnknownBrand123"
Expected Output:
```json
{
  "brand_id": null,
  "confidence": 0,
  "source": "no_match",
  "needs_review": true,
  "original": "UnknownBrand123",
  "normalized": null,
  "suggestion": {...}
}
```

### Category Mapping Examples

#### Test 1: Existing Mapping
Input: "Mobiles" (PriceOye)
Expected Output:
```json
{
  "category_id": "...",
  "subcategory_id": null,
  "confidence": 1.0,
  "source": "existing_mapping",
  "needs_review": false,
  "original_category": "Mobiles",
  "mapping_id": "..."
}
```

#### Test 2: Auto-Created Mapping
Input: "Smart Phones" (new category)
Expected Output:
```json
{
  "category_id": "...",
  "subcategory_id": null,
  "confidence": 0.90,
  "source": "auto_created",
  "needs_review": false,
  "original_category": "Smart Phones",
  "mapping_id": "..."
}
```

---

## Testing Checklist

### Public Endpoints (No Auth Required)
- [ ] GET /brands - Get all brands
- [ ] GET /brands/search - Search brands
- [ ] GET /brands/top - Get top brands
- [ ] GET /brands/statistics - Brand statistics
- [ ] GET /brands/:id - Get brand by ID
- [ ] GET /brands/country/:country - Brands by country
- [ ] POST /brands/normalize - Normalize single brand
- [ ] POST /brands/normalize/batch - Batch normalize
- [ ] GET /category-mappings - Get all mappings
- [ ] GET /category-mappings/statistics - Mapping statistics
- [ ] GET /category-mappings/platform/:id - Platform mappings
- [ ] POST /category-mappings/map - Map category
- [ ] POST /category-mappings/map/batch - Batch map

### Admin Endpoints (Auth Required)
- [ ] POST /brands - Create brand
- [ ] PATCH /brands/:id - Update brand
- [ ] DELETE /brands/:id - Delete brand
- [ ] POST /brands/:id/aliases - Add alias
- [ ] POST /brands/merge - Merge brands
- [ ] POST /brands/learn - Learn from correction
- [ ] GET /brands/review - Brands needing review
- [ ] GET /brands/suggest-merges - Suggest merges
- [ ] POST /category-mappings - Create mapping
- [ ] PATCH /category-mappings/:id - Update mapping
- [ ] DELETE /category-mappings/:id - Delete mapping
- [ ] POST /category-mappings/:id/verify - Verify mapping
- [ ] GET /category-mappings/unmapped/:id - Unmapped categories
- [ ] GET /category-mappings/review - Mappings needing review
- [ ] POST /category-mappings/learn - Learn from correction

---

## Notes
- All public endpoints should return 200 OK
- Admin endpoints without auth should return 401 Unauthorized
- Invalid IDs should return 400 Bad Request
- Not found resources should return 404 Not Found
- Server errors should return 500 Internal Server Error

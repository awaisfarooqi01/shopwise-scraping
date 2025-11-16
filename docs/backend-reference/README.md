# Backend API Reference

This folder contains reference documentation for the ShopWise Backend APIs, specifically the Brand & Category Mapping APIs used by the scraping service.

---

## 📚 Available Documentation

### 1. [BRAND_CATEGORY_API_REFERENCE.md](BRAND_CATEGORY_API_REFERENCE.md)
Complete API reference for Brand & Category Mapping endpoints.

**Contents:**
- 31 API endpoints (18 Brand + 13 Category Mapping)
- Request/response examples
- Query parameters
- Integration code samples
- Error codes
- Authentication guide
- Performance tips

**Most Used Endpoints:**
- `POST /api/v1/brands/normalize` - Normalize single brand
- `POST /api/v1/brands/normalize/batch` - Batch brand normalization
- `POST /api/v1/category-mappings/map` - Map single category
- `POST /api/v1/category-mappings/map/batch` - Batch category mapping

---

### 2. [ShopWise_Brand_CategoryMapping_Postman_Collection.json](ShopWise_Brand_CategoryMapping_Postman_Collection.json)
Postman collection with all 31 endpoints pre-configured.

**How to Use:**
1. Import into Postman
2. Set environment variables:
   - `baseUrl`: `http://localhost:5000`
   - `adminToken`: Your JWT token (for admin endpoints)
3. Run requests

**Collection Structure:**
- Brand APIs
  - Public (9 endpoints)
  - Admin (9 endpoints)
- Category Mapping APIs
  - Public (7 endpoints)
  - Admin (6 endpoints)
- Product APIs (brand filtering)
- Authentication

---

## 🚀 Quick Start

### 1. Test Brand Normalization
```bash
curl -X POST http://localhost:5000/api/v1/brands/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "Samsung",
    "auto_learn": true
  }'
```

### 2. Test Category Mapping
```bash
curl -X POST http://localhost:5000/api/v1/category-mappings/map \
  -H "Content-Type: application/json" \
  -d '{
    "platform_id": "6919ddac3af87bff38a68190",
    "platform_category": "Mobiles",
    "auto_create": true
  }'
```

### 3. Search Brands
```bash
curl http://localhost:5000/api/v1/brands/search?q=samsung
```

---

## 🔗 Related Documentation

### In This Repository (shopwise-scraping)
- **[../BRAND_CATEGORY_API_INTEGRATION.md](../BRAND_CATEGORY_API_INTEGRATION.md)** - Complete integration guide (~700 lines)
- **[../CATEGORY_BRAND_NORMALIZATION_STRATEGY.md](../CATEGORY_BRAND_NORMALIZATION_STRATEGY.md)** - Normalization strategy
- **[../IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md)** - Phase 1.5: API Integration tasks

### In Backend Repository (shopwise-backend/docs/)
- `API_IMPLEMENTATION_PROGRESS.md` - All 91+ endpoints documented
- `PHASE_5_COMPLETION_SUMMARY.md` - Brand & Category API implementation (528 lines)
- `PHASE_6_COMPLETION_SUMMARY.md` - Documentation & testing summary
- `DATABASE_SUMMARY.md` - Database schema with Brand & CategoryMapping models
- `erd-schema.js` - ERD schema with 11 collections

---

## 📊 API Statistics

- **Total Endpoints:** 31
- **Brand APIs:** 18 (9 public + 9 admin)
- **Category Mapping APIs:** 13 (7 public + 6 admin)
- **Authentication Required:** 15 admin endpoints
- **Testing Status:** ✅ 11 endpoints tested and verified

**Tested Endpoints:**
1. ✅ GET /api/v1/brands
2. ✅ GET /api/v1/brands/search
3. ✅ POST /api/v1/brands/normalize
4. ✅ POST /api/v1/brands/normalize/batch
5. ✅ GET /api/v1/brands/top
6. ✅ GET /api/v1/brands/statistics
7. ✅ GET /api/v1/category-mappings
8. ✅ POST /api/v1/category-mappings/map
9. ✅ GET /api/v1/category-mappings/statistics
10. ✅ GET /api/v1/products?brand=Samsung
11. ✅ GET /api/v1/health

---

## ⚙️ Backend Setup

To use these APIs, ensure the ShopWise Backend is running:

```bash
cd shopwise-backend
npm install
npm run dev
```

Backend will be available at: `http://localhost:5000`

---

## 🔐 Authentication

Admin endpoints require JWT authentication. Get a token:

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@shopwise.com",
    "password": "your-password"
  }'

# Use token in requests
curl -X POST http://localhost:5000/api/v1/brands/admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "OnePlus",
    "country": "China"
  }'
```

---

## 🎯 Integration Checklist

- [ ] Read API reference documentation
- [ ] Import Postman collection
- [ ] Test brand normalization endpoint
- [ ] Test category mapping endpoint
- [ ] Implement backend API client
- [ ] Add caching layer
- [ ] Update scraper pipeline
- [ ] Test with real scraping data
- [ ] Monitor confidence scores
- [ ] Set up error handling

---

**Last Updated:** November 16, 2025  
**Backend Version:** v1.0  
**Status:** Production Ready ✅

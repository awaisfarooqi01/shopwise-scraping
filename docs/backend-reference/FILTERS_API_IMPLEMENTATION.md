# 🔍 Product Filters API Implementation

**Implemented:** November 6, 2024  
**Endpoint:** `GET /api/v1/products/filters`  
**Status:** ✅ Complete and Tested  

---

## 📋 Overview

The Product Filters API provides available filter options for product searching and browsing. It returns dynamic filter options based on the current product catalog, optionally scoped to a specific category.

---

## 🎯 Features

### ✅ Dynamic Filter Options
Returns all available filter values based on actual product data:
- **Brands** - List of unique brands
- **Platforms** - E-commerce platforms with logos
- **Categories** - Product categories with icons
- **Price Range** - Min, max, and average prices
- **Conditions** - Product conditions (new, used, refurbished)
- **Availability** - Stock statuses
- **Rating Range** - Min and max rating values

### ✅ Category Scoping
When a category ID is provided, filter options are scoped to that category:
- Shows only brands available in that category
- Shows only platforms selling products in that category
- Excludes category list (since already filtering by category)
- Updates price range based on category products

### ✅ Smart Data Aggregation
Uses MongoDB aggregation for efficient queries:
- `distinct()` for unique values
- `aggregate()` for price statistics
- Population for related data (platforms, categories)

---

## 🚀 API Endpoint

### Request

```http
GET /api/v1/products/filters?category={categoryId}
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | String (ObjectId) | No | Optional category ID to scope filters |

#### Headers
```
None (Public endpoint)
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Available filters retrieved successfully",
  "data": {
    "filters": {
      "brands": [
        "Apple",
        "Samsung",
        "Dell",
        "HP",
        "Xiaomi"
      ],
      "platforms": [
        {
          "_id": "6907b314cfaff3128c279cd4",
          "name": "Daraz",
          "logo": "https://example.com/daraz-logo.png"
        },
        {
          "_id": "6907b314cfaff3128c279cd5",
          "name": "PriceOye",
          "logo": "https://example.com/priceoye-logo.png"
        }
      ],
      "categories": [
        {
          "_id": "6907b314cfaff3128c279cea",
          "name": "Electronics",
          "icon": "📱"
        },
        {
          "_id": "6907b314cfaff3128c279ceb",
          "name": "Fashion",
          "icon": "👗"
        }
      ],
      "priceRange": {
        "_id": null,
        "minPrice": 8999,
        "maxPrice": 489999,
        "avgPrice": 204832.33
      },
      "conditions": [
        "new",
        "used",
        "refurbished"
      ],
      "availability": [
        "in_stock",
        "out_of_stock",
        "limited"
      ],
      "ratingRange": {
        "min": 0,
        "max": 5
      }
    },
    "appliedCategory": null
  }
}
```

#### With Category Filter

```http
GET /api/v1/products/filters?category=6907b314cfaff3128c279cea
```

```json
{
  "success": true,
  "message": "Available filters retrieved successfully",
  "data": {
    "filters": {
      "brands": [
        "Apple",
        "Samsung",
        "Dell",
        "HP"
      ],
      "platforms": [...],
      "categories": [],  // Empty when filtering by category
      "priceRange": {
        "minPrice": 45999,
        "maxPrice": 489999,
        "avgPrice": 234999
      },
      "conditions": ["new"],
      "availability": ["in_stock"],
      "ratingRange": {
        "min": 0,
        "max": 5
      }
    },
    "appliedCategory": "6907b314cfaff3128c279cea"
  }
}
```

#### Error Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Invalid category ID format",
  "error": {
    "code": "VALIDATION_ERROR",
    "type": "ValidationError"
  }
}
```

---

## 🏗️ Implementation Details

### Repository Layer
**File:** `src/repositories/product.repository.js`

```javascript
async getAvailableFilters(categoryId = null) {
  const query = { is_active: true };
  if (categoryId) {
    query.category_id = categoryId;
  }

  const [brands, platforms, categories, priceRange, conditions, availabilityOptions] = 
    await Promise.all([
      Product.distinct('brand', query),
      Product.find(query).distinct('platform_id').then(...),
      categoryId ? Promise.resolve([]) : Product.find(query).distinct('category_id').then(...),
      Product.aggregate([...]),
      Product.distinct('condition', query),
      Product.distinct('availability', query)
    ]);

  return {
    brands: brands.filter(Boolean).sort(),
    platforms,
    categories,
    priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
    conditions: conditions.filter(Boolean),
    availability: availabilityOptions.filter(Boolean),
    ratingRange: { min: 0, max: 5 }
  };
}
```

### Service Layer
**File:** `src/services/product/product.service.js`

```javascript
async getAvailableFilters(categoryId = null) {
  // Validate ObjectId if provided
  if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ValidationError(
      'Invalid category ID format',
      ERROR_CODES.INVALID_OBJECT_ID
    );
  }

  const filters = await this.productRepository.getAvailableFilters(categoryId);

  return {
    filters,
    appliedCategory: categoryId,
  };
}
```

### Controller Layer
**File:** `src/api/controllers/product.controller.js`

```javascript
async getAvailableFilters(req, res, next) {
  try {
    const categoryId = req.query.category || null;

    const result = await this.productService.getAvailableFilters(categoryId);

    logger.info('Available filters retrieved', { categoryId });

    return successResponse(
      res,
      result,
      'Available filters retrieved successfully'
    );
  } catch (error) {
    logger.error('Error in getAvailableFilters controller:', error);
    next(error);
  }
}
```

### Validation Layer
**File:** `src/api/validations/product.validation.js`

```javascript
const getAvailableFiltersSchema = Joi.object({
  query: Joi.object({
    category: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Invalid category ID format',
      }),
  }),
});
```

### Routes
**File:** `src/api/routes/v1/product.routes.js`

```javascript
/**
 * @route   GET /api/v1/products/filters
 * @desc    Get available filter options
 * @access  Public
 */
router.get(
  '/filters',
  validate(getAvailableFiltersSchema),
  productController.getAvailableFilters.bind(productController)
);
```

**Note:** Route is placed BEFORE `/:id` route to avoid route matching conflicts.

---

## 🧪 Testing

### Test Cases

1. **Get All Filters (No Category)**
   ```bash
   curl http://localhost:5000/api/v1/products/filters
   ```
   ✅ Returns all available filters across all categories

2. **Get Filters for Specific Category**
   ```bash
   curl "http://localhost:5000/api/v1/products/filters?category=6907b314cfaff3128c279cea"
   ```
   ✅ Returns filters scoped to Electronics category

3. **Invalid Category ID**
   ```bash
   curl "http://localhost:5000/api/v1/products/filters?category=invalid"
   ```
   ✅ Returns 400 validation error

### Test Results

All tests passing ✅
- ✅ Without category filter
- ✅ With valid category filter
- ✅ Category scoping works correctly
- ✅ Price range calculation accurate
- ✅ Brands filtered by category
- ✅ Platforms populated correctly
- ✅ Categories excluded when filtering

---

## 📊 Performance Considerations

### Optimizations Implemented
- **Parallel Queries:** Uses `Promise.all()` to fetch all filter data in parallel
- **Distinct Queries:** Uses MongoDB `distinct()` for efficient unique value retrieval
- **Aggregation Pipeline:** Uses `aggregate()` for price statistics
- **Lean Queries:** Returns plain JavaScript objects (no Mongoose overhead)
- **Conditional Logic:** Skips category fetch when filtering by category

### Database Indexes
Recommended indexes for optimal performance:
```javascript
// On Product model
{ brand: 1 }
{ platform_id: 1 }
{ category_id: 1 }
{ price: 1 }
{ condition: 1 }
{ availability: 1 }
{ is_active: 1 }
```

---

## 🎯 Use Cases

### 1. Product Search Page
Display filter options in sidebar:
```javascript
const { filters } = await fetch('/api/v1/products/filters').then(r => r.json());

// Render filter UI
renderBrandFilter(filters.brands);
renderPriceRangeSlider(filters.priceRange);
renderPlatformFilter(filters.platforms);
```

### 2. Category Browse Page
Show category-specific filters:
```javascript
const categoryId = '6907b314cfaff3128c279cea';
const { filters } = await fetch(
  `/api/v1/products/filters?category=${categoryId}`
).then(r => r.json());

// Only shows brands available in this category
renderBrandFilter(filters.brands);
```

### 3. Dynamic Filter Updates
Update filters based on user selections:
```javascript
// When user selects a category
onCategorySelect(categoryId) {
  const { filters } = await fetch(
    `/api/v1/products/filters?category=${categoryId}`
  ).then(r => r.json());
  
  updateAvailableFilters(filters);
}
```

---

## 🔄 Integration with Other Endpoints

The filters returned by this endpoint can be used with:

- **GET /products** - Apply filters to product listing
- **GET /products/search** - Apply filters to search results
- **GET /categories/:id/products** - Filter products in a category

Example workflow:
```javascript
// 1. Get available filters
const { filters } = await getFilters();

// 2. User selects filters
const selectedFilters = {
  brand: 'Apple',
  minPrice: 50000,
  maxPrice: 150000
};

// 3. Apply to product search
const products = await searchProducts('laptop', selectedFilters);
```

---

## 📝 Future Enhancements

### Planned Improvements
- [ ] Add Redis caching (15 minute TTL)
- [ ] Add product count per filter option
- [ ] Add subcategory filtering
- [ ] Add specification filters (RAM, storage, etc.)
- [ ] Add color/size filters for fashion items
- [ ] Add seller/merchant filters

### Example with Counts
```json
{
  "brands": [
    {
      "name": "Apple",
      "count": 25
    },
    {
      "name": "Samsung",
      "count": 18
    }
  ]
}
```

---

## ✅ Implementation Checklist

- [x] Repository method implemented
- [x] Service method implemented
- [x] Controller method implemented
- [x] Validation schema created
- [x] Route added (proper ordering)
- [x] Error handling implemented
- [x] Logging added
- [x] Tested without category filter
- [x] Tested with category filter
- [x] Tested with invalid category ID
- [x] Documentation updated
- [x] Postman collection updated
- [x] Progress tracking updated

---

## 🔗 Related Documentation

- [Product API Implementation Summary](./PRODUCT_API_IMPLEMENTATION_SUMMARY.md)
- [API Implementation Progress](./API_IMPLEMENTATION_PROGRESS.md)
- [API Specification](./API_SPECIFICATION.md)
- [Error Handling Guide](./ERROR_HANDLING_GUIDE.md)

---

**Status:** ✅ Production Ready  
**Last Updated:** November 6, 2024

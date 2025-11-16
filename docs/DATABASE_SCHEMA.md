# Database Schema Reference

> Essential database schema information for the scraping service to understand data structure

This document provides the database schema that scrapers must conform to when storing data.

---

## 📊 Collections Overview

The scraping service stores data in the following MongoDB collections:

| Collection | Purpose | Priority for Scraping |
|------------|---------|---------------------|
| **platforms** | E-commerce platform information | ✅ Reference only |
| **categories** | Product categories (hierarchical) | ✅ Reference only |
| **products** | Product listings with pricing | 🔴 Primary scraping target |
| **reviews** | Product reviews | 🟡 Secondary scraping target |
| **sale_history** | Historical price tracking | 🟢 Auto-generated from products |

---

## 🛍️ Products Collection

**Primary target for all scrapers**

### Required Fields for Scrapers

```javascript
{
  // Platform Information (Required)
  platform_id: ObjectId,           // Reference to platforms collection
  platform_name: String,           // e.g., "PriceOye", "Daraz"
  
  // Basic Product Information (Required)
  name: String,                    // Product title
  original_url: String,            // Product page URL
  price: Number,                   // Current price in PKR
  currency: String,                // Default: "PKR"
  
  // Product Details (Recommended)
  brand: String,                   // Product brand
  description: String,             // Product description
  category_id: ObjectId,           // Reference to categories
  category_name: String,           // For quick access
  subcategory_id: ObjectId,        // Reference to subcategories
  subcategory_name: String,        // For quick access
  
  // Specifications (Recommended)
  specifications: Object,          // Technical specs (flexible schema)
  variants: Object,                // Color, size, etc.
  
  // Availability (Recommended)
  availability: String,            // "in_stock", "out_of_stock", "pre_order"
  condition: String,               // "new", "used", "refurbished"
  
  // Media (Recommended)
  media: {
    images: [{
      url: String,
      type: String,                // "main", "thumbnail", "gallery"
      alt_text: String
    }],
    videos: [{
      url: String,
      thumbnail: String,
      duration: Number
    }]
  },
  
  // Pricing (Optional but Valuable)
  sale_price: Number,              // If on sale
  sale_percentage: Number,         // Discount percentage
  sale_duration_days: Number,      // How long sale lasts
  shipping_cost: Number,           // Shipping fee
  delivery_time: String,           // e.g., "2-3 days"
  
  // Review Aggregation (Auto-calculated, don't scrape)
  average_rating: Number,          // Computed from reviews
  review_count: Number,            // Computed from reviews
  positive_percent: Number,        // Computed from reviews
  
  // Timestamps (Auto-generated)
  created_at: Date,
  updated_at: Date
}
```

### Example Scraped Product

```javascript
{
  platform_id: ObjectId("507f1f77bcf86cd799439011"),
  platform_name: "PriceOye",
  name: "Samsung Galaxy S23 Ultra 256GB",
  brand: "Samsung",
  original_url: "https://priceoye.pk/mobiles/samsung-galaxy-s23-ultra-256gb",
  price: 349999,
  currency: "PKR",
  category_name: "Mobile Phones",
  subcategory_name: "Android Phones",
  description: "6.8-inch Dynamic AMOLED display, Snapdragon 8 Gen 2...",
  specifications: {
    display: "6.8 inch",
    processor: "Snapdragon 8 Gen 2",
    ram: "12GB",
    storage: "256GB",
    camera: "200MP + 12MP + 10MP + 10MP",
    battery: "5000mAh",
    os: "Android 13"
  },
  variants: {
    colors: ["Phantom Black", "Green", "Cream", "Lavender"],
    storage: ["256GB", "512GB", "1TB"]
  },
  availability: "in_stock",
  condition: "new",
  media: {
    images: [
      {
        url: "https://example.com/image1.jpg",
        type: "main",
        alt_text: "Samsung Galaxy S23 Ultra Front View"
      },
      {
        url: "https://example.com/image2.jpg",
        type: "gallery",
        alt_text: "Samsung Galaxy S23 Ultra Back View"
      }
    ]
  },
  shipping_cost: 0,
  delivery_time: "2-3 days",
  created_at: new Date(),
  updated_at: new Date()
}
```

---

## ⭐ Reviews Collection

**Secondary target for scrapers**

### Required Fields for Scrapers

```javascript
{
  // Product Reference (Required)
  product_id: ObjectId,            // Reference to products collection
  
  // Review Information (Required)
  reviewer_name: String,           // Reviewer's name
  rating: Number,                  // 0-5 stars
  text: String,                    // Review text content
  review_date: Date,               // When review was posted
  
  // Verification (Recommended)
  verified_purchase: Boolean,      // Is it a verified purchase?
  
  // Engagement (Optional)
  helpful_votes: Number,           // How many found it helpful
  images: [String],                // Array of review image URLs
  
  // Sentiment Analysis (Auto-calculated, don't scrape)
  sentiment_analysis: {
    sentiment: String,             // Will be computed by backend
    score: Number,
    keywords: [String],
    primary_negative_reason: String,
    is_likely_fake: Boolean,
    needs_analysis: Boolean
  }
}
```

### Example Scraped Review

```javascript
{
  product_id: ObjectId("507f1f77bcf86cd799439012"),
  reviewer_name: "Ali Khan",
  rating: 4.5,
  text: "Great phone with amazing camera quality. Battery life could be better.",
  review_date: new Date("2024-10-15"),
  verified_purchase: true,
  helpful_votes: 23,
  images: [
    "https://example.com/review-photo1.jpg",
    "https://example.com/review-photo2.jpg"
  ],
  sentiment_analysis: {
    needs_analysis: true  // Backend will analyze this
  }
}
```

---

## 💰 Sale History Collection

**Auto-generated from price changes** - Scrapers should not directly insert here

When a scraper updates a product's price, the backend automatically creates a sale_history record:

```javascript
{
  product_id: ObjectId,
  price: Number,
  timestamp: Date,
  event_name: String,              // e.g., "Black Friday", "11.11 Sale"
  sale_percentage: Number,
  sale_duration_days: Number
}
```

---

## 🏪 Platforms Collection

**Reference data** - Pre-populated, scrapers read from this

```javascript
{
  _id: ObjectId,
  name: String,                    // "PriceOye", "Daraz", etc.
  domain: String,                  // "priceoye.pk", "daraz.pk"
  base_url: String,                // "https://priceoye.pk"
  logo_url: String,
  scraping_config: {
    selectors: Object,             // Platform-specific selectors
    rate_limit: Number,            // Requests per minute
    last_scraped: Date
  }
}
```

### Example Platforms

```javascript
[
  {
    name: "PriceOye",
    domain: "priceoye.pk",
    base_url: "https://priceoye.pk",
    scraping_config: {
      rate_limit: 60,              // 60 requests/minute
      last_scraped: new Date()
    }
  },
  {
    name: "Daraz",
    domain: "daraz.pk",
    base_url: "https://www.daraz.pk",
    scraping_config: {
      rate_limit: 30,              // 30 requests/minute
      last_scraped: new Date()
    }
  }
]
```

---

## 📂 Categories Collection

**Reference data** - Pre-populated, scrapers map to these

Hierarchical category structure:

```javascript
{
  _id: ObjectId,
  name: String,                    // Category name
  parent_category_id: ObjectId,    // null for root categories
  level: Number,                   // 0 = root, 1 = subcategory, etc.
  path: [ObjectId],                // Array of parent IDs
  icon: String                     // Icon identifier
}
```

### Example Categories

```javascript
// Root category
{
  _id: ObjectId("..."),
  name: "Electronics",
  parent_category_id: null,
  level: 0,
  path: [],
  icon: "electronics"
}

// Subcategory
{
  _id: ObjectId("..."),
  name: "Mobile Phones",
  parent_category_id: ObjectId("..."), // Reference to Electronics
  level: 1,
  path: [ObjectId("...")],             // Path to Electronics
  icon: "smartphone"
}
```

---

## 🔍 Data Validation Rules

### Product Validation

- **name**: Required, non-empty string
- **price**: Required, positive number
- **original_url**: Required, valid URL
- **platform_id**: Required, must exist in platforms collection
- **currency**: Default "PKR"
- **rating**: If provided, must be 0-5
- **availability**: If provided, must be one of: "in_stock", "out_of_stock", "pre_order"

### Review Validation

- **product_id**: Required, must exist in products collection
- **reviewer_name**: Required, non-empty string
- **rating**: Required, must be 0-5
- **text**: Optional but recommended
- **review_date**: Required, valid date

---

## 🎯 Scraper Best Practices

### 1. Always Provide Platform Context

```javascript
// ✅ Good
const product = {
  platform_id: platformId,
  platform_name: "PriceOye",
  name: "Product Name",
  // ...
};

// ❌ Bad
const product = {
  name: "Product Name",
  // Missing platform info
};
```

### 2. Normalize Prices

```javascript
// ✅ Good - Remove currency symbols and commas
const price = parseFloat(priceText.replace(/[Rs,]/g, ''));

// ❌ Bad - Leave as string with formatting
const price = "Rs 349,999";
```

### 3. Handle Missing Data Gracefully

```javascript
// ✅ Good
const product = {
  name: scrapedData.name || "Unknown Product",
  brand: scrapedData.brand || null,
  description: scrapedData.description || null,
  // ...
};

// ❌ Bad - Leave undefined
const product = {
  name: scrapedData.name,
  brand: scrapedData.brand,  // Might be undefined
  // ...
};
```

### 4. Deduplicate Before Inserting

```javascript
// Check if product already exists by original_url
const existing = await Product.findOne({ original_url: productUrl });

if (existing) {
  // Update existing product
  await Product.findByIdAndUpdate(existing._id, scrapedData);
} else {
  // Insert new product
  await Product.create(scrapedData);
}
```

### 5. Batch Insert for Performance

```javascript
// ✅ Good - Batch insert
await Product.insertMany(scrapedProducts);

// ❌ Bad - Individual inserts
for (const product of scrapedProducts) {
  await Product.create(product);
}
```

---

## 📌 Important Notes

1. **Don't scrape computed fields**: Fields like `average_rating`, `review_count`, `positive_percent` are auto-calculated by the backend
2. **Use ObjectId references**: Always link to platforms and categories using ObjectId
3. **Timestamps are auto-managed**: Don't manually set `created_at` and `updated_at`
4. **Respect rate limits**: Check `platforms.scraping_config.rate_limit`
5. **Update vs Insert**: Always check if a product exists before inserting (use `original_url` as unique identifier)

---

## 🔗 Related Documentation

- See `SYSTEM_ARCHITECTURE.md` for overall system design
- See `SCRAPING_GUIDELINES.md` for scraping best practices
- See backend `src/models/` for full Mongoose schemas

---

**Last Updated**: November 16, 2025  
**Version**: 1.0

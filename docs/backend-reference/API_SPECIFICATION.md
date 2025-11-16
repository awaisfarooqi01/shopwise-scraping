# 🚀 ShopWise Backend - Complete API Specification

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api/v1`  
**Production URL:** `https://api.shopwise.pk/api/v1`

---

## 📋 Table of Contents

1. [Authentication APIs](#1-authentication-apis)
2. [Product APIs](#2-product-apis)
3. [Category APIs](#3-category-apis)
4. [Review APIs](#4-review-apis)
5. [Price History & Tracking APIs](#5-price-history--tracking-apis)
6. [User Profile APIs](#6-user-profile-apis)
7. [Search APIs](#7-search-apis)
8. [Alert & Notification APIs](#8-alert--notification-apis)
9. [Platform APIs](#9-platform-apis)
10. [Analytics & Recommendations APIs](#10-analytics--recommendations-apis)
11. [Comparison APIs](#11-comparison-apis)

---

## 1. Authentication APIs

### 1.1 User Registration
**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "name": "Ahmed Ali",
  "email": "ahmed@example.com",
  "password": "SecurePass123!",
  "phone": "+923001234567",
  "language_preference": "ur"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Ahmed Ali",
      "email": "ahmed@example.com",
      "phone": "+923001234567",
      "language_preference": "ur",
      "is_verified": false,
      "created_at": "2024-11-05T10:30:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 86400
    }
  }
}
```

**Validation Rules:**
- `name`: Required, 2-50 characters
- `email`: Required, valid email format, unique
- `password`: Required, min 8 characters, must include uppercase, lowercase, number
- `phone`: Optional, valid Pakistani phone number format
- `language_preference`: Optional, enum ['en', 'ur', 'ps']

---

### 1.2 User Login
**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "ahmed@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Ahmed Ali",
      "email": "ahmed@example.com",
      "language_preference": "ur",
      "last_login": "2024-11-05T10:35:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 86400
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "error": {
    "code": "INVALID_CREDENTIALS"
  }
}
```

---

### 1.3 Refresh Token
**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

---

### 1.4 Logout
**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.5 Get Current User
**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "phone": "+923001234567",
    "language_preference": "ur",
    "preferences": {
      "categories_of_interest": ["507f191e810c19729de860ea"],
      "preferred_brands": ["Samsung", "Apple"],
      "notification_preferences": {
        "email": true,
        "push": true,
        "whatsapp": false
      }
    },
    "is_verified": true,
    "created_at": "2024-11-05T10:30:00Z"
  }
}
```

---

### 1.6 Forgot Password
**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "ahmed@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

---

### 1.7 Reset Password
**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## 2. Product APIs

### 2.1 Get All Products (with filters)
**Endpoint:** `GET /products`

**Query Parameters:**
```
?page=1
&limit=20
&category=507f191e810c19729de860ea
&brand=Samsung
&min_price=10000
&max_price=100000
&platform=Daraz
&sort_by=price
&order=asc
&availability=in_stock
&condition=new
&rating_min=4
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Samsung Galaxy S23 Ultra 12GB 256GB",
        "brand": "Samsung",
        "price": 349999,
        "sale_price": 329999,
        "sale_percentage": 5.7,
        "currency": "PKR",
        "platform_name": "Daraz",
        "category_name": "Mobile Phones",
        "subcategory_name": "Smartphones",
        "average_rating": 4.7,
        "review_count": 234,
        "positive_percent": 89,
        "availability": "in_stock",
        "condition": "new",
        "shipping_cost": 0,
        "delivery_time": "2-3 days",
        "media": {
          "images": [
            {
              "url": "https://example.com/s23-1.jpg",
              "type": "main",
              "alt_text": "Samsung S23 Ultra Front"
            }
          ]
        },
        "original_url": "https://www.daraz.pk/product/123",
        "created_at": "2024-11-01T10:00:00Z",
        "updated_at": "2024-11-05T08:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 50,
      "total_items": 1000,
      "items_per_page": 20,
      "has_next": true,
      "has_prev": false
    },
    "filters_applied": {
      "category": "Mobile Phones",
      "brand": "Samsung",
      "price_range": "10000-100000",
      "platform": "Daraz"
    }
  }
}
```

---

### 2.2 Get Product by ID
**Endpoint:** `GET /products/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Samsung Galaxy S23 Ultra 12GB 256GB",
    "brand": "Samsung",
    "description": "Premium flagship smartphone with S Pen...",
    "price": 349999,
    "sale_price": 329999,
    "sale_percentage": 5.7,
    "currency": "PKR",
    "platform_id": "507f191e810c19729de860ea",
    "platform_name": "Daraz",
    "category_id": "507f191e810c19729de860eb",
    "category_name": "Electronics",
    "subcategory_id": "507f191e810c19729de860ec",
    "subcategory_name": "Mobile Phones",
    "specifications": {
      "RAM": "12GB",
      "Storage": "256GB",
      "Display": "6.8\" Dynamic AMOLED 2X",
      "Camera": "200MP + 12MP + 10MP + 10MP",
      "Battery": "5000mAh",
      "Processor": "Snapdragon 8 Gen 2"
    },
    "variants": {
      "colors": ["Phantom Black", "Green", "Cream"],
      "storage": ["256GB", "512GB", "1TB"]
    },
    "media": {
      "images": [
        {
          "url": "https://example.com/s23-1.jpg",
          "type": "main",
          "alt_text": "Samsung S23 Ultra Front"
        },
        {
          "url": "https://example.com/s23-2.jpg",
          "type": "gallery",
          "alt_text": "Samsung S23 Ultra Back"
        }
      ],
      "videos": [
        {
          "url": "https://example.com/s23-video.mp4",
          "thumbnail": "https://example.com/s23-thumb.jpg",
          "duration": 120
        }
      ]
    },
    "average_rating": 4.7,
    "review_count": 234,
    "positive_percent": 89,
    "availability": "in_stock",
    "condition": "new",
    "shipping_cost": 0,
    "delivery_time": "2-3 days",
    "original_url": "https://www.daraz.pk/product/123",
    "created_at": "2024-11-01T10:00:00Z",
    "updated_at": "2024-11-05T08:30:00Z"
  }
}
```

---

### 2.3 Search Products
**Endpoint:** `GET /products/search`

**Query Parameters:**
```
?q=samsung+galaxy
&page=1
&limit=20
&category=Electronics
&brand=Samsung
&min_price=10000
&max_price=200000
&sort_by=relevance
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "query": "samsung galaxy",
    "results_count": 45,
    "products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Samsung Galaxy S23 Ultra 12GB 256GB",
        "brand": "Samsung",
        "price": 349999,
        "platform_name": "Daraz",
        "average_rating": 4.7,
        "review_count": 234,
        "relevance_score": 0.95,
        "media": {
          "images": [
            {
              "url": "https://example.com/s23-1.jpg",
              "type": "main"
            }
          ]
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 45,
      "items_per_page": 20
    },
    "suggestions": [
      "samsung galaxy s23",
      "samsung galaxy a54",
      "samsung galaxy fold"
    ]
  }
}
```

---

### 2.4 Get Similar Products
**Endpoint:** `GET /products/:id/similar`

**Query Parameters:**
```
?limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "product_id": "507f1f77bcf86cd799439011",
    "product_name": "Samsung Galaxy S23 Ultra",
    "similar_products": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Samsung Galaxy S23 Plus 8GB 256GB",
        "brand": "Samsung",
        "price": 279999,
        "average_rating": 4.6,
        "similarity_score": 0.92,
        "media": {
          "images": [{"url": "https://example.com/s23plus.jpg"}]
        }
      }
    ]
  }
}
```

---

### 2.5 Get Featured Products
**Endpoint:** `GET /products/featured`

**Query Parameters:**
```
?limit=10
&category=Electronics
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "featured_products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Samsung Galaxy S23 Ultra",
        "price": 349999,
        "sale_price": 329999,
        "discount_percentage": 5.7,
        "average_rating": 4.7,
        "platform_name": "Daraz",
        "featured_reason": "Best Seller",
        "media": {
          "images": [{"url": "https://example.com/s23.jpg"}]
        }
      }
    ]
  }
}
```

---

### 2.6 Get Trending Products
**Endpoint:** `GET /products/trending`

**Query Parameters:**
```
?period=7d
&limit=20
&category=Electronics
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "Last 7 days",
    "trending_products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Samsung Galaxy S23 Ultra",
        "price": 349999,
        "search_count": 1523,
        "view_count": 8945,
        "trend_score": 94,
        "price_drop_percentage": 8.5,
        "media": {
          "images": [{"url": "https://example.com/s23.jpg"}]
        }
      }
    ]
  }
}
```

---

## 3. Category APIs

### 3.1 Get All Categories
**Endpoint:** `GET /categories`

**Query Parameters:**
```
?level=0
&parent_id=507f191e810c19729de860ea
&include_products_count=true
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "507f191e810c19729de860ea",
        "name": "Electronics",
        "level": 0,
        "parent_category_id": null,
        "icon": "📱",
        "product_count": 1523,
        "subcategories_count": 10,
        "is_active": true
      },
      {
        "_id": "507f191e810c19729de860eb",
        "name": "Fashion",
        "level": 0,
        "parent_category_id": null,
        "icon": "👗",
        "product_count": 892,
        "subcategories_count": 8,
        "is_active": true
      }
    ]
  }
}
```

---

### 3.2 Get Category by ID
**Endpoint:** `GET /categories/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f191e810c19729de860ea",
    "name": "Electronics",
    "level": 0,
    "parent_category_id": null,
    "path": [],
    "icon": "📱",
    "subcategories": [
      {
        "_id": "507f191e810c19729de860ec",
        "name": "Mobile Phones",
        "level": 1,
        "product_count": 543
      },
      {
        "_id": "507f191e810c19729de860ed",
        "name": "Laptops",
        "level": 1,
        "product_count": 234
      }
    ],
    "total_products": 1523,
    "is_active": true
  }
}
```

---

### 3.3 Get Products by Category
**Endpoint:** `GET /categories/:id/products`

**Query Parameters:**
```
?page=1
&limit=20
&sort_by=price
&order=asc
&brand=Samsung
&min_price=10000
&max_price=100000
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "category": {
      "_id": "507f191e810c19729de860ec",
      "name": "Mobile Phones",
      "level": 1
    },
    "products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Samsung Galaxy S23 Ultra",
        "brand": "Samsung",
        "price": 349999,
        "average_rating": 4.7,
        "media": {
          "images": [{"url": "https://example.com/s23.jpg"}]
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 28,
      "total_items": 543,
      "items_per_page": 20
    }
  }
}
```

---

### 3.4 Get Category Hierarchy
**Endpoint:** `GET /categories/hierarchy`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hierarchy": [
      {
        "_id": "507f191e810c19729de860ea",
        "name": "Electronics",
        "level": 0,
        "icon": "📱",
        "children": [
          {
            "_id": "507f191e810c19729de860ec",
            "name": "Mobile Phones",
            "level": 1,
            "product_count": 543
          },
          {
            "_id": "507f191e810c19729de860ed",
            "name": "Laptops",
            "level": 1,
            "product_count": 234
          }
        ]
      }
    ]
  }
}
```

---

## 4. Review APIs

### 4.1 Get Product Reviews
**Endpoint:** `GET /products/:id/reviews`

**Query Parameters:**
```
?page=1
&limit=20
&rating=5
&verified_only=true
&sort_by=helpful
&sentiment=positive
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "product_id": "507f1f77bcf86cd799439011",
    "product_name": "Samsung Galaxy S23 Ultra",
    "review_summary": {
      "total_reviews": 234,
      "average_rating": 4.7,
      "rating_distribution": {
        "5_star": 180,
        "4_star": 35,
        "3_star": 12,
        "2_star": 4,
        "1_star": 3
      },
      "verified_purchase_count": 189,
      "sentiment_distribution": {
        "positive": 89,
        "neutral": 8,
        "negative": 3
      }
    },
    "reviews": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "reviewer_name": "Ahmed Ali",
        "rating": 5,
        "text": "Excellent product! Highly recommended.",
        "review_date": "2024-11-03T10:30:00Z",
        "helpful_votes": 45,
        "verified_purchase": true,
        "images": [
          "https://example.com/review-img1.jpg"
        ],
        "sentiment_analysis": {
          "sentiment": "positive",
          "score": 0.9,
          "keywords": ["excellent", "recommended", "quality"],
          "is_likely_fake": false
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 12,
      "total_items": 234,
      "items_per_page": 20
    }
  }
}
```

---

### 4.2 Get Review by ID
**Endpoint:** `GET /reviews/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "product_id": "507f1f77bcf86cd799439011",
    "product_name": "Samsung Galaxy S23 Ultra",
    "reviewer_name": "Ahmed Ali",
    "rating": 5,
    "text": "Excellent product! Camera quality is outstanding...",
    "review_date": "2024-11-03T10:30:00Z",
    "helpful_votes": 45,
    "verified_purchase": true,
    "images": [
      "https://example.com/review-img1.jpg",
      "https://example.com/review-img2.jpg"
    ],
    "sentiment_analysis": {
      "sentiment": "positive",
      "score": 0.9,
      "keywords": ["excellent", "camera", "quality", "outstanding"],
      "primary_negative_reason": null,
      "is_likely_fake": false
    }
  }
}
```

---

### 4.3 Get Review Sentiment Summary
**Endpoint:** `GET /products/:id/reviews/sentiment`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "product_id": "507f1f77bcf86cd799439011",
    "total_reviews": 234,
    "sentiment_summary": {
      "positive": {
        "count": 208,
        "percentage": 89,
        "common_keywords": ["excellent", "quality", "fast", "recommended"]
      },
      "neutral": {
        "count": 19,
        "percentage": 8,
        "common_keywords": ["average", "decent", "okay"]
      },
      "negative": {
        "count": 7,
        "percentage": 3,
        "common_keywords": ["disappointed", "quality", "price"],
        "top_reasons": {
          "quality": 3,
          "price": 2,
          "delivery": 1,
          "customer_service": 1
        }
      }
    },
    "verified_vs_unverified": {
      "verified_positive": 85,
      "verified_negative": 2,
      "unverified_positive": 4,
      "unverified_negative": 5
    },
    "fake_review_alert": {
      "likely_fake_count": 12,
      "percentage": 5.1,
      "flagged": false
    }
  }
}
```

---

## 5. Price History & Tracking APIs

### 5.1 Get Product Price History
**Endpoint:** `GET /products/:id/price-history`

**Query Parameters:**
```
?period=30d
&platform=all
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "product_id": "507f1f77bcf86cd799439011",
    "product_name": "Samsung Galaxy S23 Ultra",
    "current_price": 349999,
    "currency": "PKR",
    "period": "Last 30 days",
    "price_history": [
      {
        "date": "2024-10-05",
        "price": 359999,
        "platform": "Daraz",
        "sale_event": null
      },
      {
        "date": "2024-10-15",
        "price": 349999,
        "platform": "Daraz",
        "sale_event": null
      },
      {
        "date": "2024-11-01",
        "price": 329999,
        "platform": "Daraz",
        "sale_event": "11.11 Sale",
        "sale_percentage": 8.3
      }
    ],
    "statistics": {
      "lowest_price": 329999,
      "lowest_date": "2024-11-01",
      "highest_price": 359999,
      "highest_date": "2024-10-05",
      "average_price": 346666,
      "price_drop_percentage": 8.3,
      "volatility": "low"
    },
    "sale_events": [
      {
        "event_name": "11.11 Sale",
        "date": "2024-11-01",
        "price": 329999,
        "discount": 8.3
      }
    ]
  }
}
```

---

### 5.2 Get Price Comparison Across Platforms
**Endpoint:** `GET /products/:id/compare-prices`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "product_id": "507f1f77bcf86cd799439011",
    "product_name": "Samsung Galaxy S23 Ultra 256GB",
    "comparison_date": "2024-11-05T10:00:00Z",
    "prices": [
      {
        "platform_id": "507f191e810c19729de860ea",
        "platform_name": "Daraz",
        "platform_logo": "https://example.com/daraz-logo.png",
        "price": 349999,
        "sale_price": 329999,
        "discount_percentage": 5.7,
        "shipping_cost": 0,
        "delivery_time": "2-3 days",
        "availability": "in_stock",
        "seller_trust_score": 4.5,
        "url": "https://www.daraz.pk/product/123",
        "is_best_price": true
      },
      {
        "platform_id": "507f191e810c19729de860eb",
        "platform_name": "PriceOye",
        "platform_logo": "https://example.com/priceoye-logo.png",
        "price": 355000,
        "sale_price": null,
        "discount_percentage": 0,
        "shipping_cost": 150,
        "delivery_time": "3-5 days",
        "availability": "in_stock",
        "seller_trust_score": 4.3,
        "url": "https://priceoye.pk/product/456",
        "is_best_price": false
      }
    ],
    "best_deal": {
      "platform": "Daraz",
      "price": 329999,
      "total_cost": 329999,
      "savings": 25001,
      "savings_percentage": 7.0
    },
    "price_range": {
      "min": 329999,
      "max": 355000,
      "difference": 25001,
      "difference_percentage": 7.6
    }
  }
}
```

---

### 5.3 Get Price Prediction
**Endpoint:** `GET /products/:id/price-prediction`

**Query Parameters:**
```
?days=30
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "product_id": "507f1f77bcf86cd799439011",
    "product_name": "Samsung Galaxy S23 Ultra",
    "current_price": 349999,
    "prediction_period": "Next 30 days",
    "predictions": [
      {
        "date": "2024-11-10",
        "predicted_price": 345000,
        "confidence": 0.85,
        "trend": "decreasing"
      },
      {
        "date": "2024-11-15",
        "predicted_price": 339999,
        "confidence": 0.82,
        "trend": "decreasing"
      },
      {
        "date": "2024-11-25",
        "predicted_price": 329999,
        "confidence": 0.78,
        "trend": "stable",
        "sale_event": "Black Friday"
      }
    ],
    "recommendation": {
      "action": "wait",
      "best_time_to_buy": "2024-11-25",
      "expected_savings": 20000,
      "confidence": 0.78,
      "reason": "Price likely to drop during Black Friday sale"
    },
    "upcoming_sales": [
      {
        "event_name": "Black Friday",
        "date": "2024-11-25",
        "expected_discount": "10-15%",
        "historical_pattern": true
      }
    ]
  }
}
```

---

### 5.4 Get Sale Events
**Endpoint:** `GET /sales/events`

**Query Parameters:**
```
?upcoming=true
&platform=Daraz
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "upcoming_events": [
      {
        "event_name": "Black Friday",
        "start_date": "2024-11-25",
        "end_date": "2024-11-27",
        "platforms": ["Daraz", "PriceOye", "Telemart"],
        "expected_discounts": "10-50%",
        "categories": ["Electronics", "Fashion", "Home"],
        "historical_data": {
          "last_year_discount_range": "15-45%",
          "popular_categories": ["Mobile Phones", "Laptops"]
        }
      },
      {
        "event_name": "12.12 Sale",
        "start_date": "2024-12-12",
        "end_date": "2024-12-14",
        "platforms": ["Daraz"],
        "expected_discounts": "20-60%"
      }
    ],
    "past_events": [
      {
        "event_name": "11.11 Sale",
        "date": "2024-11-01",
        "platforms": ["Daraz", "PriceOye"],
        "average_discount": 25,
        "total_products": 15000
      }
    ]
  }
}
```

---

## 6. User Profile APIs

### 6.1 Get User Profile
**Endpoint:** `GET /users/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "phone": "+923001234567",
    "language_preference": "ur",
    "preferences": {
      "categories_of_interest": [
        {
          "_id": "507f191e810c19729de860ec",
          "name": "Mobile Phones"
        }
      ],
      "preferred_brands": ["Samsung", "Apple", "Xiaomi"],
      "notification_preferences": {
        "email": true,
        "push": true,
        "whatsapp": false
      }
    },
    "is_verified": true,
    "created_at": "2024-10-01T10:00:00Z",
    "last_login": "2024-11-05T09:30:00Z"
  }
}
```

---

### 6.2 Update User Profile
**Endpoint:** `PUT /users/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Ahmed Ali Khan",
  "phone": "+923001234567",
  "language_preference": "en"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Ahmed Ali Khan",
    "email": "ahmed@example.com",
    "phone": "+923001234567",
    "language_preference": "en",
    "updated_at": "2024-11-05T10:15:00Z"
  }
}
```

---

### 6.3 Update User Preferences
**Endpoint:** `PUT /users/preferences`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "categories_of_interest": ["507f191e810c19729de860ec", "507f191e810c19729de860ed"],
  "preferred_brands": ["Samsung", "Apple", "Xiaomi", "OnePlus"],
  "notification_preferences": {
    "email": true,
    "push": true,
    "whatsapp": true
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "preferences": {
      "categories_of_interest": [
        {
          "_id": "507f191e810c19729de860ec",
          "name": "Mobile Phones"
        },
        {
          "_id": "507f191e810c19729de860ed",
          "name": "Laptops"
        }
      ],
      "preferred_brands": ["Samsung", "Apple", "Xiaomi", "OnePlus"],
      "notification_preferences": {
        "email": true,
        "push": true,
        "whatsapp": true
      }
    }
  }
}
```

---

### 6.4 Change Password
**Endpoint:** `PUT /users/change-password`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 7. Search APIs

### 7.1 Get Search History
**Endpoint:** `GET /users/search-history`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?page=1
&limit=20
&days=30
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "search_history": [
      {
        "_id": "507f1f77bcf86cd799439030",
        "query": "samsung galaxy s23",
        "filters": {
          "category_name": "Mobile Phones",
          "min_price": 200000,
          "max_price": 400000,
          "results_count": 45
        },
        "clicked_products": [
          {
            "product_id": "507f1f77bcf86cd799439011",
            "product_name": "Samsung Galaxy S23 Ultra",
            "position": 1,
            "timestamp": "2024-11-05T09:35:00Z"
          }
        ],
        "timestamp": "2024-11-05T09:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 45,
      "items_per_page": 20
    },
    "popular_searches": [
      "samsung galaxy s23",
      "iphone 15",
      "laptop under 100000"
    ]
  }
}
```

---

### 7.2 Delete Search History
**Endpoint:** `DELETE /users/search-history/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Search history item deleted successfully"
}
```

---

### 7.3 Clear All Search History
**Endpoint:** `DELETE /users/search-history`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All search history cleared successfully"
}
```

---

### 7.4 Get Search Suggestions
**Endpoint:** `GET /search/suggestions`

**Query Parameters:**
```
?q=sam
&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "query": "sam",
    "suggestions": [
      {
        "text": "samsung galaxy s23",
        "type": "product",
        "count": 1523
      },
      {
        "text": "samsung",
        "type": "brand",
        "count": 3421
      },
      {
        "text": "samsung laptop",
        "type": "product",
        "count": 234
      }
    ]
  }
}
```

---

## 8. Alert & Notification APIs

### 8.1 Get User Alerts
**Endpoint:** `GET /alerts`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?is_active=true
&page=1
&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "_id": "507f1f77bcf86cd799439040",
        "product_id": "507f1f77bcf86cd799439011",
        "product": {
          "name": "Samsung Galaxy S23 Ultra",
          "current_price": 349999,
          "media": {
            "images": [{"url": "https://example.com/s23.jpg"}]
          }
        },
        "alert_type": "price_drop",
        "target_price": 320000,
        "notification_channels": {
          "email": true,
          "sms": false,
          "push": true
        },
        "is_active": true,
        "triggered_at": null,
        "created_at": "2024-11-01T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_items": 15,
      "items_per_page": 20
    }
  }
}
```

---

### 8.2 Create Alert
**Endpoint:** `POST /alerts`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "product_id": "507f1f77bcf86cd799439011",
  "alert_type": "price_drop",
  "target_price": 320000,
  "notification_channels": {
    "email": true,
    "sms": false,
    "push": true
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Alert created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439040",
    "product_id": "507f1f77bcf86cd799439011",
    "alert_type": "price_drop",
    "target_price": 320000,
    "is_active": true,
    "created_at": "2024-11-05T10:30:00Z"
  }
}
```

---

### 8.3 Update Alert
**Endpoint:** `PUT /alerts/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "target_price": 310000,
  "notification_channels": {
    "email": true,
    "sms": true,
    "push": true
  },
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alert updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439040",
    "target_price": 310000,
    "notification_channels": {
      "email": true,
      "sms": true,
      "push": true
    },
    "is_active": true,
    "updated_at": "2024-11-05T10:35:00Z"
  }
}
```

---

### 8.4 Delete Alert
**Endpoint:** `DELETE /alerts/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alert deleted successfully"
}
```

---

### 8.5 Get User Notifications
**Endpoint:** `GET /notifications`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?unread=true
&page=1
&limit=20
&type=price_drop
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "507f1f77bcf86cd799439050",
        "type": "price_drop",
        "title": "Price Drop Alert!",
        "message": "Samsung Galaxy S23 Ultra price dropped to PKR 329,999",
        "data": {
          "product_id": "507f1f77bcf86cd799439011",
          "product_name": "Samsung Galaxy S23 Ultra",
          "old_price": 349999,
          "new_price": 329999,
          "discount_percentage": 5.7
        },
        "channel": "push",
        "sent_at": "2024-11-05T08:00:00Z",
        "delivered": true,
        "read_at": null,
        "alert_id": "507f1f77bcf86cd799439040"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 89,
      "items_per_page": 20
    },
    "unread_count": 12
  }
}
```

---

### 8.6 Mark Notification as Read
**Endpoint:** `PUT /notifications/:id/read`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "_id": "507f1f77bcf86cd799439050",
    "read_at": "2024-11-05T10:40:00Z"
  }
}
```

---

### 8.7 Mark All Notifications as Read
**Endpoint:** `PUT /notifications/read-all`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "marked_count": 12
  }
}
```

---

### 8.8 Delete Notification
**Endpoint:** `DELETE /notifications/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## 9. Platform APIs

### 9.1 Get All Platforms
**Endpoint:** `GET /platforms`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "platforms": [
      {
        "_id": "507f191e810c19729de860ea",
        "name": "Daraz",
        "domain": "daraz.pk",
        "base_url": "https://www.daraz.pk",
        "logo_url": "https://example.com/daraz-logo.png",
        "is_active": true,
        "product_count": 5432,
        "average_trust_score": 4.3
      },
      {
        "_id": "507f191e810c19729de860eb",
        "name": "PriceOye",
        "domain": "priceoye.pk",
        "base_url": "https://priceoye.pk",
        "logo_url": "https://example.com/priceoye-logo.png",
        "is_active": true,
        "product_count": 3210,
        "average_trust_score": 4.1
      }
    ]
  }
}
```

---

### 9.2 Get Platform Details
**Endpoint:** `GET /platforms/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f191e810c19729de860ea",
    "name": "Daraz",
    "domain": "daraz.pk",
    "base_url": "https://www.daraz.pk",
    "logo_url": "https://example.com/daraz-logo.png",
    "is_active": true,
    "statistics": {
      "total_products": 5432,
      "active_products": 5120,
      "average_price": 45600,
      "average_trust_score": 4.3,
      "categories_covered": 23
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-11-05T08:00:00Z"
  }
}
```

---

### 9.3 Get Platform Statistics
**Endpoint:** `GET /platforms/:id/stats`

**Query Parameters:**
```
?period=30d
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "platform_id": "507f191e810c19729de860ea",
    "platform_name": "Daraz",
    "period": "Last 30 days",
    "statistics": {
      "total_products": 5432,
      "new_products": 234,
      "price_updates": 1523,
      "average_price_change": -3.2,
      "sale_events": 3,
      "popular_categories": [
        {
          "category": "Mobile Phones",
          "product_count": 543,
          "average_price": 125000
        }
      ],
      "price_trends": {
        "increasing": 234,
        "decreasing": 1289,
        "stable": 3909
      }
    }
  }
}
```

---

## 10. Analytics & Recommendations APIs

### 10.1 Get Popular Products
**Endpoint:** `GET /analytics/popular-products`

**Query Parameters:**
```
?period=7d
&category=Electronics
&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "Last 7 days",
    "category": "Electronics",
    "popular_products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Samsung Galaxy S23 Ultra",
        "brand": "Samsung",
        "price": 349999,
        "view_count": 8945,
        "search_count": 1523,
        "alert_count": 234,
        "popularity_score": 95,
        "media": {
          "images": [{"url": "https://example.com/s23.jpg"}]
        }
      }
    ]
  }
}
```

---

### 10.2 Get Personalized Recommendations
**Endpoint:** `GET /recommendations/personalized`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user_id": "507f1f77bcf86cd799439011",
    "recommendations": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Samsung Galaxy S23 Plus",
        "brand": "Samsung",
        "price": 279999,
        "recommendation_score": 0.92,
        "reason": "Based on your interest in Samsung products",
        "media": {
          "images": [{"url": "https://example.com/s23plus.jpg"}]
        }
      }
    ],
    "based_on": {
      "search_history": true,
      "preferences": true,
      "alerts": true
    }
  }
}
```

---

### 10.3 Get Product Recommendations
**Endpoint:** `GET /products/:id/recommendations`

**Query Parameters:**
```
?limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "product_id": "507f1f77bcf86cd799439011",
    "product_name": "Samsung Galaxy S23 Ultra",
    "recommendations": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Spigen Case for Galaxy S23 Ultra",
        "brand": "Spigen",
        "price": 3999,
        "recommendation_type": "accessory",
        "relevance_score": 0.95,
        "media": {
          "images": [{"url": "https://example.com/case.jpg"}]
        }
      },
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Samsung Galaxy S23 Plus",
        "brand": "Samsung",
        "price": 279999,
        "recommendation_type": "alternative",
        "relevance_score": 0.88,
        "media": {
          "images": [{"url": "https://example.com/s23plus.jpg"}]
        }
      }
    ]
  }
}
```

---

### 10.4 Get Trending Searches
**Endpoint:** `GET /analytics/trending-searches`

**Query Parameters:**
```
?period=7d
&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "Last 7 days",
    "trending_searches": [
      {
        "query": "samsung galaxy s23",
        "search_count": 1523,
        "trend": "up",
        "change_percentage": 25.3
      },
      {
        "query": "iphone 15",
        "search_count": 1234,
        "trend": "up",
        "change_percentage": 18.7
      }
    ]
  }
}
```

---

### 10.5 Get Best Deals
**Endpoint:** `GET /analytics/best-deals`

**Query Parameters:**
```
?category=Electronics
&min_discount=10
&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "category": "Electronics",
    "best_deals": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Samsung Galaxy S23 Ultra",
        "brand": "Samsung",
        "original_price": 349999,
        "sale_price": 329999,
        "discount_percentage": 5.7,
        "savings": 20000,
        "platform_name": "Daraz",
        "deal_score": 0.92,
        "expires_at": "2024-11-15T23:59:59Z",
        "media": {
          "images": [{"url": "https://example.com/s23.jpg"}]
        }
      }
    ]
  }
}
```

---

## 11. Comparison APIs

### 11.1 Compare Products
**Endpoint:** `POST /products/compare`

**Request Body:**
```json
{
  "product_ids": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "comparison": {
      "products": [
        {
          "_id": "507f1f77bcf86cd799439011",
          "name": "Samsung Galaxy S23 Ultra",
          "brand": "Samsung",
          "price": 349999,
          "platform_name": "Daraz",
          "specifications": {
            "RAM": "12GB",
            "Storage": "256GB",
            "Display": "6.8\" AMOLED",
            "Camera": "200MP",
            "Battery": "5000mAh"
          },
          "average_rating": 4.7,
          "review_count": 234,
          "media": {
            "images": [{"url": "https://example.com/s23.jpg"}]
          }
        },
        {
          "_id": "507f1f77bcf86cd799439012",
          "name": "iPhone 15 Pro Max",
          "brand": "Apple",
          "price": 489999,
          "platform_name": "Daraz",
          "specifications": {
            "RAM": "8GB",
            "Storage": "256GB",
            "Display": "6.7\" Super Retina",
            "Camera": "48MP",
            "Battery": "4422mAh"
          },
          "average_rating": 4.9,
          "review_count": 567,
          "media": {
            "images": [{"url": "https://example.com/iphone15.jpg"}]
          }
        }
      ],
      "spec_comparison": {
        "RAM": {
          "507f1f77bcf86cd799439011": "12GB",
          "507f1f77bcf86cd799439012": "8GB",
          "winner": "507f1f77bcf86cd799439011"
        },
        "Price": {
          "507f1f77bcf86cd799439011": 349999,
          "507f1f77bcf86cd799439012": 489999,
          "winner": "507f1f77bcf86cd799439011"
        }
      },
      "summary": {
        "best_value": "507f1f77bcf86cd799439011",
        "best_rated": "507f1f77bcf86cd799439012",
        "lowest_price": "507f1f77bcf86cd799439011"
      }
    }
  }
}
```

---

## 📊 Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Pagination Format
```json
{
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total_items": 200,
    "items_per_page": 20,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 🔒 Authentication

All protected endpoints require JWT authentication:

```
Authorization: Bearer <access_token>
```

---

## 📝 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_EMAIL` | 409 | Email already exists |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `INVALID_TOKEN` | 401 | Invalid or malformed token |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## 🚀 Rate Limiting

- **Public endpoints:** 100 requests per 15 minutes
- **Authenticated endpoints:** 1000 requests per 15 minutes
- **Search endpoints:** 50 requests per 15 minutes

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699180800
```

---

## 🌐 Multilingual Support

All text responses support multiple languages via `Accept-Language` header:

```
Accept-Language: en  (English)
Accept-Language: ur  (Urdu)
Accept-Language: ps  (Pashto)
```

---

**Total APIs:** 60+  
**Authentication APIs:** 7  
**Product APIs:** 10  
**Category APIs:** 4  
**Review APIs:** 3  
**Price & Tracking APIs:** 4  
**User Profile APIs:** 4  
**Search APIs:** 4  
**Alert & Notification APIs:** 8  
**Platform APIs:** 3  
**Analytics APIs:** 5  
**Comparison APIs:** 1  

---

**Last Updated:** November 5, 2024  
**Version:** 1.0.0

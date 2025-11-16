# 🚀 ShopWise API - Quick Reference Card

**Quick access to common API endpoints for testing**

---

## 🔐 Authentication Endpoints

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | `{email, password, name, phone}` | Register new user |
| `POST` | `/auth/login` | `{email, password}` | Login (gets token) |
| `POST` | `/auth/logout` | - | Logout current user |
| `GET` | `/auth/me` | - | Get current user |
| `POST` | `/auth/refresh` | `{refresh_token}` | Refresh access token |

**Default Test Credentials:**
```json
{
  "email": "admin@shopwise.pk",
  "password": "Admin@123"
}
```

---

## 📦 Product Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/products` | Optional | List all products with filters |
| `GET` | `/products/search?q=samsung` | Optional | Search products |
| `GET` | `/products/:id` | Optional | Get product details |
| `GET` | `/products/:id/similar` | Optional | Get similar products |
| `GET` | `/products/featured` | Optional | Get featured products |
| `GET` | `/products/trending` | Optional | Get trending products |
| `GET` | `/products/deals` | Optional | Get best deals |
| `POST` | `/products/compare` | Optional | Compare products |

**Common Query Parameters:**
- `?page=1&limit=20` - Pagination
- `&category=ID` - Filter by category
- `&brand=Samsung` - Filter by brand
- `&min_price=10000&max_price=100000` - Price range
- `&sort_by=price&order=asc` - Sorting

---

## 📂 Category Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/categories` | No | List all categories |
| `GET` | `/categories/:id` | No | Get category details |
| `GET` | `/categories/:id/products` | No | Products in category |

---

## ⭐ Review Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/products/:id/reviews` | No | Get product reviews |
| `GET` | `/products/:id/reviews/sentiment` | No | Sentiment analysis |
| `GET` | `/reviews/:id` | No | Get review details |

---

## 💰 Price & Tracking Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/products/:id/price-history` | No | Price history graph |
| `GET` | `/products/:id/price-prediction` | No | AI price prediction |
| `GET` | `/products/:id/best-price` | No | Best price comparison |
| `GET` | `/sales/events` | No | Upcoming sale events |

---

## 👤 User Profile Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/users/profile` | ✅ Yes | Get user profile |
| `PUT` | `/users/profile` | ✅ Yes | Update profile |
| `PUT` | `/users/preferences` | ✅ Yes | Update preferences |
| `GET` | `/users/activity` | ✅ Yes | User activity history |

---

## 🔍 Search Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/search?q=query` | Optional | Global search |
| `GET` | `/search/suggestions?q=sam` | No | Autocomplete |
| `GET` | `/search/history` | ✅ Yes | Search history |
| `DELETE` | `/search/history` | ✅ Yes | Clear history |

---

## 🔔 Alert & Notification Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/alerts` | ✅ Yes | Create price alert |
| `GET` | `/alerts` | ✅ Yes | Get user alerts |
| `GET` | `/alerts/:id` | ✅ Yes | Get alert details |
| `PUT` | `/alerts/:id` | ✅ Yes | Update alert |
| `DELETE` | `/alerts/:id` | ✅ Yes | Delete alert |
| `GET` | `/notifications` | ✅ Yes | Get notifications |
| `PUT` | `/notifications/:id/read` | ✅ Yes | Mark as read |

**Create Alert Body:**
```json
{
  "product_id": "{{product_id}}",
  "alert_type": "price_drop",
  "target_price": 300000,
  "notification_method": ["email", "push"]
}
```

---

## 🏪 Platform Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/platforms` | No | List all platforms |
| `GET` | `/platforms/:id` | No | Platform details |
| `GET` | `/platforms/:id/products` | No | Platform products |

---

## 📊 Analytics & Recommendations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/recommendations` | ✅ Yes | Personalized recommendations |
| `GET` | `/recommendations/trending` | No | Trending products |
| `GET` | `/recommendations/based-on/:id` | No | Related products |
| `GET` | `/analytics/user-behavior` | ✅ Yes | User analytics |
| `GET` | `/analytics/price-trends` | No | Price trends |

---

## 🛠️ Admin Endpoints (Require Admin Role)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admin/products` | ✅ Admin | Create product |
| `PUT` | `/admin/products/:id` | ✅ Admin | Update product |
| `DELETE` | `/admin/products/:id` | ✅ Admin | Delete product |
| `GET` | `/admin/users` | ✅ Admin | List all users |
| `PUT` | `/admin/users/:id/status` | ✅ Admin | Update user status |
| `POST` | `/admin/platforms` | ✅ Admin | Create platform |
| `PUT` | `/admin/platforms/:id` | ✅ Admin | Update platform |

---

## 🔑 Environment Variables

Set these in Postman Environment:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:5000/api/v1` | API base URL |
| `access_token` | `eyJhbGciOiJIUz...` | JWT access token (auto-set) |
| `refresh_token` | `eyJhbGciOiJIUz...` | JWT refresh token (auto-set) |
| `user_id` | `507f1f77bcf86cd799439011` | Current user ID (auto-set) |
| `product_id` | `507f1f77bcf86cd799439011` | Sample product ID (auto-set) |
| `category_id` | `507f1f77bcf86cd799439011` | Sample category ID (auto-set) |
| `platform_id` | `507f1f77bcf86cd799439011` | Sample platform ID (auto-set) |
| `alert_id` | `507f1f77bcf86cd799439011` | Sample alert ID (auto-set) |

---

## 📝 Common Request Headers

```
Content-Type: application/json
Authorization: Bearer {{access_token}}
Accept-Language: en  (or: ur, ps)
```

---

## 🚦 HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| `200` | OK | Successful GET/PUT/DELETE |
| `201` | Created | Successful POST |
| `400` | Bad Request | Validation error |
| `401` | Unauthorized | Missing/invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate entry |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Internal error |

---

## ⚡ Quick Testing Workflow

### 1️⃣ **Setup**
```bash
# Start MongoDB
# Start backend server
npm run dev
```

### 2️⃣ **Login**
```
POST /auth/login
{
  "email": "admin@shopwise.pk",
  "password": "Admin@123"
}
```
→ Access token auto-saved ✅

### 3️⃣ **Browse Products**
```
GET /products?page=1&limit=20
```
→ First product_id auto-saved ✅

### 4️⃣ **View Product Details**
```
GET /products/{{product_id}}
```

### 5️⃣ **Check Price History**
```
GET /products/{{product_id}}/price-history?period=30d
```

### 6️⃣ **Create Alert**
```
POST /alerts
{
  "product_id": "{{product_id}}",
  "alert_type": "price_drop",
  "target_price": 300000
}
```

---

## 🎯 Testing Scenarios

### **Scenario 1: Product Search & Compare**
1. `GET /products/search?q=samsung galaxy`
2. `GET /products/:id` (for 2-3 products)
3. `POST /products/compare` with multiple IDs

### **Scenario 2: Price Tracking**
1. `GET /products/:id`
2. `GET /products/:id/price-history`
3. `GET /products/:id/price-prediction`
4. `POST /alerts` (create price alert)

### **Scenario 3: User Journey**
1. `POST /auth/register` (new user)
2. `PUT /users/preferences` (set preferences)
3. `GET /recommendations` (personalized)
4. `GET /search/history` (view history)

---

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| `401 Unauthorized` | Login again or refresh token |
| `404 Not Found` | Check if endpoint is implemented |
| `400 Validation Error` | Check request body format |
| Variables not saving | Select environment in dropdown |
| Server not responding | Check if `npm run dev` is running |

---

## 📚 Documentation Links

- **Full API Spec:** `docs/API_SPECIFICATION.md`
- **Postman Guide:** `docs/POSTMAN_COLLECTION_GUIDE.md`
- **Implementation Status:** `API_IMPLEMENTATION_PROGRESS.md`
- **Database Info:** `docs/DATABASE_SUMMARY.md`

---

**Base URL (Dev):** `http://localhost:5000/api/v1`  
**Base URL (Prod):** `https://api.shopwise.pk/api/v1`

**Last Updated:** November 5, 2024

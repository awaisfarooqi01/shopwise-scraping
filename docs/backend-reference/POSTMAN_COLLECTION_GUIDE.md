# 📮 ShopWise API - Postman Collection Guide

This document provides instructions for using the ShopWise API Postman collection.

---

## 📥 Importing the Collection

### Method 1: Import from File
1. Open Postman
2. Click **Import** button (top left)
3. Select **Choose Files**
4. Navigate to: `docs/ShopWise_API_Postman_Collection.json`
5. Click **Import**

### Method 2: Import from URL (when hosted)
1. Open Postman
2. Click **Import** → **Link**
3. Paste the collection URL
4. Click **Continue** → **Import**

---

## 🔧 Setup & Configuration

### 1. **Create Environment (Recommended)**

Create a new environment for easier variable management:

1. Click **Environments** in left sidebar
2. Click **+** to create new environment
3. Name it: `ShopWise - Development`
4. Add variables:

| Variable | Initial Value | Current Value | Type |
|----------|---------------|---------------|------|
| `base_url` | `http://localhost:5000/api/v1` | `http://localhost:5000/api/v1` | default |
| `access_token` | (leave empty) | (auto-set after login) | secret |
| `refresh_token` | (leave empty) | (auto-set after login) | secret |
| `user_id` | (leave empty) | (auto-set after login) | default |
| `product_id` | (leave empty) | (auto-set from API) | default |
| `category_id` | (leave empty) | (auto-set from API) | default |
| `platform_id` | (leave empty) | (auto-set from API) | default |
| `alert_id` | (leave empty) | (auto-set from API) | default |
| `notification_id` | (leave empty) | (auto-set from API) | default |
| `review_id` | (leave empty) | (auto-set from API) | default |

5. Click **Save**
6. Select this environment from the dropdown (top right)

### 2. **For Production Testing**

Create another environment named `ShopWise - Production`:

| Variable | Initial Value |
|----------|---------------|
| `base_url` | `https://api.shopwise.pk/api/v1` |

---

## 🚀 Quick Start Guide

### Step 1: Start the Backend Server

```bash
# Make sure MongoDB is running
# Start the backend server
npm run dev
```

### Step 2: Login to Get Access Token

1. Open the collection in Postman
2. Navigate to: **1. Authentication** → **1.2 Login User**
3. Use default credentials:
   ```json
   {
     "email": "admin@shopwise.pk",
     "password": "Admin@123"
   }
   ```
4. Click **Send**
5. ✅ The `access_token` will be **automatically saved** to collection variables
6. You're now authenticated for all subsequent requests!

### Step 3: Test Other Endpoints

The collection is organized into 12 categories:

1. **Authentication** - Login, register, logout
2. **Products** - Browse, search, filter products
3. **Categories** - Category hierarchy and products
4. **Reviews** - Product reviews and sentiment
5. **Price History & Tracking** - Price trends and predictions
6. **User Profile** - Profile management
7. **Search** - Global search and history
8. **Alerts & Notifications** - Price alerts
9. **Platforms** - E-commerce platforms
10. **Analytics & Recommendations** - AI recommendations
11. **Comparison** - Product comparison
12. **Admin** - Admin-only endpoints

---

## 🔐 Authentication

### How Authentication Works

The collection uses **Bearer Token** authentication:

1. **Login** → Get `access_token` + `refresh_token`
2. Token is **automatically added** to all authenticated requests
3. Token is stored in collection variable: `{{access_token}}`

### Auto-Token Management

The collection includes **automatic token handling**:

- ✅ After **login/register**, tokens are auto-saved
- ✅ After **refresh**, new access token is auto-saved
- ✅ All protected endpoints automatically use `{{access_token}}`

### Manual Token Setup (if needed)

If automatic token saving doesn't work:

1. Copy the `access_token` from login response
2. Go to **Collection** → **Variables** tab
3. Paste token into `access_token` variable
4. Click **Save**

---

## 📝 Using the Collection

### Auto-Populated Variables

Many endpoints auto-populate IDs for testing:

- **Login** → Saves `access_token`, `refresh_token`, `user_id`
- **Get Products** → Saves first `product_id`
- **Get Categories** → Saves first `category_id`
- **Get Platforms** → Saves first `platform_id`
- **Get Alerts** → Saves first `alert_id`
- **Get Notifications** → Saves first `notification_id`
- **Get Reviews** → Saves first `review_id`

### Testing Workflow Example

**Scenario: Browse products and create a price alert**

1. **Login**
   - `POST /auth/login`
   - Saves `access_token`

2. **Get All Products**
   - `GET /products`
   - Saves first `product_id`

3. **View Product Details**
   - `GET /products/{{product_id}}`
   - Uses auto-saved product ID

4. **Check Price History**
   - `GET /products/{{product_id}}/price-history`

5. **Create Price Alert**
   - `POST /alerts`
   - Uses `{{product_id}}` in request body

6. **View Your Alerts**
   - `GET /alerts`

---

## 🎯 Request Examples

### Example 1: Search Products

```
GET {{base_url}}/products/search?q=samsung&page=1&limit=20
```

**Query Parameters:**
- `q` - Search query (enabled)
- `page` - Page number (enabled)
- `limit` - Results per page (enabled)
- `category` - Filter by category (disabled, can enable)
- `brand` - Filter by brand (disabled, can enable)

### Example 2: Filter Products

```
GET {{base_url}}/products?category={{category_id}}&min_price=10000&max_price=100000
```

**Enable query params** you want to use by checking the checkbox.

### Example 3: Create Alert

```json
POST {{base_url}}/alerts

{
  "product_id": "{{product_id}}",
  "alert_type": "price_drop",
  "target_price": 300000,
  "notification_method": ["email", "push"]
}
```

---

## 📊 Response Scripts

The collection includes **automatic response handling**:

### Login/Register Endpoints
```javascript
// Auto-saves tokens and user_id
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.collectionVariables.set('access_token', response.data.tokens.access_token);
    pm.collectionVariables.set('refresh_token', response.data.tokens.refresh_token);
    pm.collectionVariables.set('user_id', response.data.user._id);
}
```

### Product List Endpoints
```javascript
// Auto-saves first product_id
if (response.data.products.length > 0) {
    pm.collectionVariables.set('product_id', response.data.products[0]._id);
}
```

### Global Error Handling
```javascript
// Logs response status
if (responseCode === 401) {
    console.log('🔄 Token expired. Please refresh using /auth/refresh endpoint.');
}
```

---

## 🧪 Testing & Validation

### Console Logs

Check **Postman Console** (View → Show Postman Console) for:
- ✅ Success messages
- ⚠️ Warnings
- ❌ Error details
- 📝 Auto-saved variables

### Response Validation

All responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* actual data */ }
}
```

**Error Response:**
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

---

## 🎨 Collection Organization

### Folder Structure

```
ShopWise API Collection
├── 1. Authentication (7 endpoints)
│   ├── Register, Login, Logout
│   ├── Get Current User
│   ├── Refresh Token
│   └── Password Management
│
├── 2. Products (10 endpoints)
│   ├── Browse & Search
│   ├── Featured & Trending
│   └── Comparison
│
├── 3. Categories (4 endpoints)
├── 4. Reviews (3 endpoints)
├── 5. Price History & Tracking (4 endpoints)
├── 6. User Profile (4 endpoints)
├── 7. Search (4 endpoints)
├── 8. Alerts & Notifications (8 endpoints)
├── 9. Platforms (3 endpoints)
├── 10. Analytics & Recommendations (5 endpoints)
├── 11. Comparison (1 endpoint)
└── 12. Admin (7 endpoints)
```

---

## 🔄 Token Refresh Workflow

When token expires (401 error):

1. Call **Refresh Token** endpoint
   ```
   POST /auth/refresh
   Body: { "refresh_token": "{{refresh_token}}" }
   ```

2. New `access_token` is **auto-saved**

3. Retry the failed request

---

## 🌍 Multi-Environment Usage

### Development Environment
```
base_url: http://localhost:5000/api/v1
```

### Staging Environment
```
base_url: https://staging-api.shopwise.pk/api/v1
```

### Production Environment
```
base_url: https://api.shopwise.pk/api/v1
```

**Switch environments** using the dropdown in top-right corner.

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" Error (401)

**Cause:** No access token or expired token

**Solution:**
1. Login again: `POST /auth/login`
2. Or refresh token: `POST /auth/refresh`

### Issue: Variables Not Auto-Saving

**Cause:** Test scripts not executing

**Solution:**
1. Check if environment is selected
2. Verify "Allow sending of cookies" in Settings
3. Check Postman Console for script errors

### Issue: "Not Found" Error (404)

**Cause:** Endpoint not implemented or wrong URL

**Solution:**
1. Verify server is running: `npm run dev`
2. Check if endpoint is implemented (see API_IMPLEMENTATION_PROGRESS.md)
3. Verify base_url variable

### Issue: Request Body Validation Error

**Cause:** Invalid request body format

**Solution:**
1. Check API_SPECIFICATION.md for correct format
2. Ensure Content-Type is `application/json`
3. Validate JSON syntax

---

## 📚 Additional Resources

- **API Documentation:** `docs/API_SPECIFICATION.md`
- **Implementation Progress:** `API_IMPLEMENTATION_PROGRESS.md`
- **Database Setup:** `docs/DATABASE_SETUP.md`
- **Project Overview:** `docs/PROJECT_OVERVIEW.md`

---

## 💡 Pro Tips

### 1. **Use Collection Runner**
Run multiple requests sequentially:
1. Click **Collections** → **Run**
2. Select folder (e.g., "Products")
3. Click **Run ShopWise API**

### 2. **Save Example Responses**
1. Send request
2. Click **Save Response**
3. Add as example for documentation

### 3. **Create Test Suites**
Add tests in **Tests** tab:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has data", function () {
    const response = pm.response.json();
    pm.expect(response.data).to.exist;
});
```

### 4. **Export Collection**
1. Right-click collection
2. **Export**
3. Save as `Collection v2.1`
4. Share with team

### 5. **Use Pre-request Scripts**
Add in **Pre-request Script** tab:
```javascript
// Add timestamp to request
pm.variables.set("timestamp", new Date().toISOString());
```

---

## 🤝 Contributing

When adding new endpoints:

1. Add to appropriate category folder
2. Include proper authentication
3. Add response scripts for auto-variable saving
4. Update this documentation
5. Export and commit updated collection

---

## 📞 Support

For issues or questions:
- Check **API_SPECIFICATION.md** for endpoint details
- Review **API_IMPLEMENTATION_PROGRESS.md** for implementation status
- Check Postman Console for error logs

---

**Last Updated:** November 5, 2024  
**Collection Version:** 1.0.0  
**Postman Version:** v10+

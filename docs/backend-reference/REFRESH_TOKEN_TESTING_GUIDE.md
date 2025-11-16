# 🔄 Refresh Token System - Testing Guide

## ✅ Implementation Complete

The refresh token system is now fully implemented and ready for testing!

---

## 📋 What Was Implemented

### 1. **Backend Routes** ✅
- `/api/v1/auth/refresh` - Refresh token endpoint (new)
- `/api/v1/auth/refresh-token` - Alias for refresh endpoint
- `/api/v1/auth/forgot-password` - Request password reset (placeholder)
- `/api/v1/auth/reset-password` - Reset password with token (placeholder)

### 2. **Controllers** ✅
- `refreshToken()` - Handles refresh token requests
- `forgotPassword()` - Handles forgot password requests
- `resetPassword()` - Handles reset password requests

### 3. **Services** ✅
- `refreshToken()` - Verifies refresh token and generates new tokens
- `forgotPassword()` - Placeholder for email-based password reset
- `resetPassword()` - Placeholder for password reset with token

### 4. **Validation** ✅
- `refreshTokenSchema` - Validates refresh token request
- `forgotPasswordSchema` - Validates forgot password request
- `resetPasswordSchema` - Validates reset password request

### 5. **Postman Collection** ✅
- Fixed token field names (camelCase: `accessToken`, `refreshToken`)
- Auto-saves tokens after login/register
- Auto-uses refresh token in refresh request

---

## 🧪 How to Test

### Step 1: Start the Server
```bash
npm run dev
```

**Expected output:**
```
[INFO] Server running on port 5000
[INFO] Database connected successfully
```

---

### Step 2: Import Updated Postman Collection

1. Open Postman
2. Click **Import**
3. Select: `docs/ShopWise_API_Postman_Collection.json`
4. If already imported, **delete old version** and reimport

---

### Step 3: Login or Register

#### Option A: Login with Admin Account
**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "admin@shopwise.pk",
  "password": "Admin@123"
}
```

#### Option B: Register New User
**Endpoint:** `POST /api/v1/auth/register`

**Request Body:**
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test@123",
  "phone": "+923001234567",
  "language_preference": "en"
}
```

**Expected Response (200/201):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "673a1234567890abcdef",
      "email": "admin@shopwise.pk",
      "name": "Admin User",
      "phone": "+923001234567",
      "language_preference": "en",
      "is_verified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**✅ Check:** Postman should auto-save tokens to variables. Check in Console:
```
✅ Login successful
📝 Access token saved to variables
```

---

### Step 4: Verify Tokens Are Saved

1. Click on collection **ShopWise Pakistan - Complete API Collection**
2. Go to **Variables** tab
3. Check that these variables have values:
   - `access_token` - Should have JWT token value
   - `refresh_token` - Should have JWT token value
   - `user_id` - Should have user ID

**Example:**
```
access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3M2ExMjM0NTY3ODkwYWJjZGVmIiwiZW1haWwiOiJhZG1pbkBzaG9wd2lzZS5wayIsIm5hbWUiOiJBZG1pbiBVc2VyIiwiaWF0IjoxNzMwODM0NTAwLCJleHAiOjE3MzA5MjA5MDB9.abc123...

refresh_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3M2ExMjM0NTY3ODkwYWJjZGVmIiwiZW1haWwiOiJhZG1pbkBzaG9wd2lzZS5wayIsIm5hbWUiOiJBZG1pbiBVc2VyIiwiaWF0IjoxNzMwODM0NTAwLCJleHAiOjE3MzE0MzkzMDB9.xyz789...

user_id: 673a1234567890abcdef
```

---

### Step 5: Test Refresh Token Endpoint

**Endpoint:** `POST /api/v1/auth/refresh`

The request body should automatically use the saved refresh token:
```json
{
  "refreshToken": "{{refresh_token}}"
}
```

**Click Send**

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**✅ Check Console:**
```
✅ Token refreshed successfully
```

**✅ Check Variables:**
Both `access_token` and `refresh_token` should be updated with new values.

---

### Step 6: Test Authenticated Endpoint

Test that the new access token works:

**Endpoint:** `GET /api/v1/auth/me`

**Expected Response (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": "673a1234567890abcdef",
      "email": "admin@shopwise.pk",
      "name": "Admin User",
      "phone": "+923001234567",
      "language_preference": "en",
      "is_verified": false,
      "preferences": {
        "categories_of_interest": [],
        "preferred_brands": [],
        "notification_preferences": {
          "email": true,
          "push": true,
          "whatsapp": false
        }
      },
      "createdAt": "2024-11-05T10:30:00.000Z",
      "last_login": "2024-11-05T12:45:00.000Z"
    }
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Refresh token is required"

**Cause:** The `refreshToken` field is empty in the request body.

**Solution:**
1. Make sure you logged in first (Step 3)
2. Check that `refresh_token` variable has a value
3. Verify the request body shows: `"refreshToken": "{{refresh_token}}"`
4. NOT: `"refresh_token": "{{refresh_token}}"` ❌

---

### Error: "Invalid refresh token" or "Refresh token expired"

**Cause:** Token is invalid or expired (7 days old).

**Solution:**
1. Login again to get fresh tokens
2. Use the new refresh token

---

### Error: "User not found"

**Cause:** The user associated with the token was deleted.

**Solution:**
1. Register a new user
2. Use the new tokens

---

### Error: "Can't find /api/v1/auth/refresh on this server!"

**Cause:** Server not running or route not loaded.

**Solution:**
1. Restart the server: `npm run dev`
2. Check server logs for errors
3. Verify route is loaded: Check logs for "Routes loaded"

---

### Tokens Not Auto-Saving in Postman

**Cause:** Postman test scripts not running.

**Solution:**
1. Re-import the updated Postman collection
2. Make sure **Tests** tab shows scripts
3. Check Console tab for script errors

---

## 🔐 Token Lifetimes

Based on your configuration:

| Token Type | Lifetime | Purpose |
|------------|----------|---------|
| **Access Token** | 24 hours | Used for API authentication |
| **Refresh Token** | 7 days | Used to get new access tokens |

### When to Refresh?

- **Access token expires** (after 24h): Use refresh token to get new access token
- **Refresh token expires** (after 7d): User must login again

---

## 📊 Testing Workflow

```
┌─────────────────┐
│  1. Login/      │
│     Register    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  2. Get access_token &  │
│     refresh_token       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  3. Use access_token    │
│     for API calls       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  4. Access token        │
│     expires (24h)       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  5. Call /auth/refresh  │
│     with refresh_token  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  6. Get NEW tokens      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  7. Continue using      │
│     new access_token    │
└─────────────────────────┘
```

---

## 🎯 Quick Test Commands (cURL)

### 1. Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@shopwise.pk",
    "password": "Admin@123"
  }'
```

### 2. Refresh Token (Copy refresh token from login response)
```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

### 3. Get Current User (Use new access token)
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## ✅ Success Criteria

You've successfully implemented refresh tokens when:

1. ✅ Login returns both `accessToken` and `refreshToken`
2. ✅ Tokens are auto-saved to Postman variables
3. ✅ `/auth/refresh` endpoint works and returns new tokens
4. ✅ New access token works for authenticated endpoints
5. ✅ Invalid/expired refresh tokens are rejected properly

---

## 🚀 Next Steps

Once refresh token testing is complete, you can:

1. **Implement Token Blacklisting** (Redis)
   - Store invalidated tokens on logout
   - Check blacklist before accepting refresh tokens

2. **Add Email-Based Password Reset**
   - Integrate email service (SendGrid, Nodemailer)
   - Generate secure reset tokens
   - Send reset links via email

3. **Add Token Rotation** (Enhanced Security)
   - Invalidate old refresh token after use
   - Issue new refresh token with each refresh

4. **Start Building Product APIs**
   - Product listing, search, filtering
   - Price history and tracking
   - Categories and reviews

---

## 📝 Notes

- Forgot password and reset password endpoints are **placeholders** (return success but don't send emails yet)
- Email integration will be added in Phase 2
- For now, focus on testing the core refresh token flow

---

**Happy Testing! 🎉**

Need help? Check the logs in `logs/combined.log` for detailed error information.

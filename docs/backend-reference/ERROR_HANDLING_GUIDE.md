# Error Handling Guide

## Overview
ShopWise Backend uses a **unified error response format** to ensure consistency across all API endpoints. This makes it easier for frontend developers to handle errors predictably.

---

## Unified Error Response Format

### Structure
All error responses follow this consistent structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "type": "ErrorType"
  }
}
```

### With Validation Details
For validation errors, additional field-level details are included:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "type": "ValidationError",
    "details": {
      "email": "Email is required",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

### Development Mode
In development environment, stack trace is included:

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "type": "ErrorType",
    "stack": "Error stack trace...",
    "statusCode": 400
  }
}
```

---

## Error Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `false` for errors |
| `message` | string | Human-readable error message (can be shown to users) |
| `error.code` | string | Machine-readable error code (for i18n and programmatic handling) |
| `error.type` | string | Error class name (e.g., ValidationError, AuthenticationError) |
| `error.details` | object | Field-level validation errors (optional, only for validation errors) |
| `error.stack` | string | Stack trace (optional, only in development mode) |
| `error.statusCode` | number | HTTP status code (optional, only in development mode) |

---

## Error Codes Reference

### Validation Errors (400)

| Code | Message | When It Occurs |
|------|---------|----------------|
| `VALIDATION_ERROR` | Validation failed | Generic validation error |
| `INVALID_INPUT` | Invalid input provided | Bad request data |
| `MISSING_REQUIRED_FIELD` | Required field is missing | Missing required parameter |
| `INVALID_FORMAT` | Invalid format | Wrong data format |
| `INVALID_EMAIL` | Invalid email address | Email format is wrong |
| `INVALID_PHONE` | Invalid phone number | Phone format is wrong |
| `INVALID_PASSWORD` | Invalid password | Password doesn't meet criteria |
| `PASSWORD_TOO_WEAK` | Password is too weak | Password strength check failed |
| `INVALID_OBJECT_ID` | Invalid ID format | MongoDB ObjectId format is wrong |

**Example:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "type": "ValidationError",
    "details": {
      "email": "Email is required",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

---

### Authentication Errors (401)

| Code | Message | When It Occurs |
|------|---------|----------------|
| `AUTHENTICATION_FAILED` | Authentication failed | Generic auth failure |
| `INVALID_CREDENTIALS` | Invalid email or password | Wrong login credentials |
| `INVALID_TOKEN` | Invalid token | JWT token is malformed |
| `TOKEN_EXPIRED` | Token has expired | JWT token expired |
| `TOKEN_MISSING` | Token is missing | No auth token provided |
| `REFRESH_TOKEN_INVALID` | Invalid refresh token | Refresh token is invalid |
| `REFRESH_TOKEN_EXPIRED` | Refresh token expired | Refresh token expired |
| `SESSION_EXPIRED` | Session has expired | User session expired |
| `ACCOUNT_NOT_VERIFIED` | Account not verified | Email verification pending |
| `ACCOUNT_SUSPENDED` | Account is suspended | User account suspended |

**Example:**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "type": "AuthenticationError"
  }
}
```

---

### Authorization Errors (403)

| Code | Message | When It Occurs |
|------|---------|----------------|
| `AUTHORIZATION_FAILED` | Authorization failed | Generic authorization failure |
| `INSUFFICIENT_PERMISSIONS` | Insufficient permissions | User lacks required permissions |
| `ACCESS_DENIED` | Access denied | User cannot access resource |
| `FORBIDDEN_RESOURCE` | Forbidden resource | Resource is forbidden |
| `ROLE_NOT_AUTHORIZED` | Role not authorized | User role not allowed |

**Example:**
```json
{
  "success": false,
  "message": "You do not have permission to perform this action",
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "type": "AuthorizationError"
  }
}
```

---

### Resource Not Found Errors (404)

| Code | Message | When It Occurs |
|------|---------|----------------|
| `RESOURCE_NOT_FOUND` | Resource not found | Generic resource not found |
| `USER_NOT_FOUND` | User not found | User doesn't exist |
| `PRODUCT_NOT_FOUND` | Product not found | Product doesn't exist |
| `CATEGORY_NOT_FOUND` | Category not found | Category doesn't exist |
| `PLATFORM_NOT_FOUND` | Platform not found | Platform doesn't exist |
| `ALERT_NOT_FOUND` | Alert not found | Price alert doesn't exist |
| `NOTIFICATION_NOT_FOUND` | Notification not found | Notification doesn't exist |
| `REVIEW_NOT_FOUND` | Review not found | Review doesn't exist |
| `ROUTE_NOT_FOUND` | Route not found | API endpoint doesn't exist |

**Example:**
```json
{
  "success": false,
  "message": "Product not found",
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "type": "NotFoundError"
  }
}
```

---

### Conflict Errors (409)

| Code | Message | When It Occurs |
|------|---------|----------------|
| `RESOURCE_ALREADY_EXISTS` | Resource already exists | Generic duplicate resource |
| `EMAIL_ALREADY_EXISTS` | Email already registered | Email is already in use |
| `PHONE_ALREADY_EXISTS` | Phone already registered | Phone is already in use |
| `USERNAME_ALREADY_EXISTS` | Username already taken | Username is already in use |
| `DUPLICATE_ENTRY` | Duplicate entry | Database duplicate key error |
| `CONFLICT_ERROR` | Conflict error | Generic conflict |

**Example:**
```json
{
  "success": false,
  "message": "Email already exists",
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "type": "ConflictError"
  }
}
```

---

### Rate Limiting Errors (429)

| Code | Message | When It Occurs |
|------|---------|----------------|
| `TOO_MANY_REQUESTS` | Too many requests | Rate limit exceeded |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | Too many requests in time window |
| `LOGIN_ATTEMPTS_EXCEEDED` | Too many login attempts | Too many failed login attempts |

**Example:**
```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "type": "TooManyRequestsError"
  }
}
```

---

### Server Errors (500)

| Code | Message | When It Occurs |
|------|---------|----------------|
| `INTERNAL_SERVER_ERROR` | Internal server error | Generic server error |
| `DATABASE_ERROR` | Database error | Database operation failed |
| `DATABASE_CONNECTION_ERROR` | Database connection error | Cannot connect to database |
| `EXTERNAL_SERVICE_ERROR` | External service error | Third-party service failed |
| `ML_SERVICE_ERROR` | ML service error | ML prediction service failed |
| `EMAIL_SERVICE_ERROR` | Email service error | Email sending failed |
| `SMS_SERVICE_ERROR` | SMS service error | SMS sending failed |

**Example:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "type": "InternalServerError"
  }
}
```

---

## How to Use Error Codes in Your Code

### Throwing Errors with Specific Codes

```javascript
const { AuthenticationError } = require('../errors');
const { ERROR_CODES } = require('../constants/error-codes');

// Throw authentication error with specific code
throw new AuthenticationError('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);

// Throw validation error with details
throw new ValidationError('Validation failed', {
  email: 'Email is required',
  password: 'Password must be at least 8 characters'
});

// Throw not found error
throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
```

### Creating Custom Errors

```javascript
const { BadRequestError } = require('../errors');
const { ERROR_CODES } = require('../constants/error-codes');

// Business logic error
if (product.stock === 0) {
  throw new BadRequestError(
    'Product is out of stock',
    ERROR_CODES.PRODUCT_OUT_OF_STOCK
  );
}

// Invalid operation
if (price < 0) {
  throw new BadRequestError(
    'Price cannot be negative',
    ERROR_CODES.INVALID_PRICE_RANGE
  );
}
```

---

## Frontend Error Handling

### Recommended Frontend Approach

```javascript
// Example: React/JavaScript
try {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    // Handle error based on error code
    switch (data.error.code) {
      case 'INVALID_CREDENTIALS':
        showError('Invalid email or password');
        break;
      case 'VALIDATION_ERROR':
        showValidationErrors(data.error.details);
        break;
      case 'TOKEN_EXPIRED':
        redirectToLogin();
        break;
      case 'ACCOUNT_SUSPENDED':
        showError('Your account has been suspended. Contact support.');
        break;
      default:
        showError(data.message);
    }
  }
} catch (error) {
  showError('Network error. Please try again.');
}
```

### Internationalization (i18n)

```javascript
// error-messages.js
const errorMessages = {
  en: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    VALIDATION_ERROR: 'Please check your input',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  },
  ur: {
    INVALID_CREDENTIALS: 'غلط ای میل یا پاس ورڈ',
    VALIDATION_ERROR: 'براہ کرم اپنا ان پٹ چیک کریں',
    TOKEN_EXPIRED: 'آپ کا سیشن ختم ہو گیا ہے۔ براہ کرم دوبارہ لاگ ان کریں۔',
  }
};

// Usage
const message = errorMessages[userLanguage][data.error.code] || data.message;
```

---

## Testing Error Responses

### Using Postman

1. **Test Validation Error:**
   - Endpoint: `POST /api/v1/auth/register`
   - Body: `{ "email": "", "password": "" }`
   - Expected: `400` with `VALIDATION_ERROR` code

2. **Test Authentication Error:**
   - Endpoint: `POST /api/v1/auth/login`
   - Body: `{ "email": "test@test.com", "password": "wrong" }`
   - Expected: `401` with `INVALID_CREDENTIALS` code

3. **Test Token Expired Error:**
   - Endpoint: `GET /api/v1/auth/me`
   - Header: `Authorization: Bearer expired_token`
   - Expected: `401` with `TOKEN_EXPIRED` code

4. **Test Not Found Error:**
   - Endpoint: `GET /api/v1/products/invalid_id`
   - Expected: `404` with `INVALID_OBJECT_ID` code

5. **Test Duplicate Error:**
   - Endpoint: `POST /api/v1/auth/register`
   - Body: Use already registered email
   - Expected: `409` with `EMAIL_ALREADY_EXISTS` code

---

## Best Practices

### ✅ Do's
- Always use predefined error codes from `error-codes.js`
- Provide clear, user-friendly error messages
- Include validation details for field-level errors
- Use specific error codes for better error tracking
- Log errors with context (user ID, request path, etc.)
- Use error codes for internationalization

### ❌ Don'ts
- Don't expose sensitive information in error messages
- Don't use generic error messages without codes
- Don't return different error formats for different endpoints
- Don't log sensitive data (passwords, tokens) in errors
- Don't return stack traces in production
- Don't create custom error codes without documenting them

---

## Error Monitoring

### Recommended Tools
- **Sentry**: For error tracking and monitoring
- **Winston**: For logging (already implemented)
- **LogRocket**: For frontend error tracking

### Error Logging Example

```javascript
logger.error('Payment processing failed', {
  errorCode: 'PAYMENT_GATEWAY_ERROR',
  userId: user._id,
  amount: paymentAmount,
  gateway: 'JazzCash',
  timestamp: new Date(),
});
```

---

## Summary

- ✅ **All errors return consistent format**
- ✅ **Error codes enable programmatic handling**
- ✅ **Validation errors include field-level details**
- ✅ **Frontend can easily implement i18n**
- ✅ **Easy to test and debug**
- ✅ **Production-ready error handling**

For more information, see:
- [Error Code Constants](../src/constants/error-codes.js)
- [Custom Error Classes](../src/errors/custom-errors.js)
- [Error Handler Middleware](../src/api/middlewares/error-handler.middleware.js)

# ShopWise Backend - Best Practices & Development Guidelines

## Table of Contents
1. [Code Organization](#code-organization)
2. [API Design](#api-design)
3. [Database Best Practices](#database-best-practices)
4. [Security Best Practices](#security-best-practices)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)
7. [Testing Strategy](#testing-strategy)
8. [Logging & Monitoring](#logging--monitoring)
9. [Documentation](#documentation)
10. [Git Workflow](#git-workflow)

---

## Code Organization

### Layered Architecture Pattern

Follow strict separation of concerns:

```javascript
// ❌ BAD: Business logic in controller
class UserController {
  async createUser(req, res) {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({ ...req.body, password: hashedPassword });
    res.json(user);
  }
}

// ✅ GOOD: Delegate to service layer
class UserController {
  async createUser(req, res, next) {
    try {
      const user = await this.userService.createUser(req.body);
      return successResponse(res, user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

class UserService {
  async createUser(userData) {
    const hashedPassword = await this.passwordService.hash(userData.password);
    return await this.userRepository.create({
      ...userData,
      password: hashedPassword
    });
  }
}
```

### File Naming & Structure

- **One class per file**: Each file should export one main class or function
- **Meaningful names**: File names should describe their purpose
- **Consistent structure**: Follow the same structure across files

```javascript
// Standard file structure

// 1. Imports (external → internal → config → constants)
const express = require('express');
const { UserService } = require('../services/user/user.service');
const { validateRequest } = require('../middlewares/validate.middleware');
const config = require('../config');
const { USER_ROLES } = require('../utils/constants');

// 2. Constants (if any)
const MAX_LOGIN_ATTEMPTS = 5;

// 3. Main class/function
class UserController {
  constructor() {
    this.userService = new UserService();
  }
  
  // Methods here
}

// 4. Export
module.exports = UserController;
```

---

## API Design

### RESTful Conventions

Follow REST principles strictly:

```javascript
// Resource-based URLs
GET    /api/v1/products           // List products
GET    /api/v1/products/:id       // Get single product
POST   /api/v1/products           // Create product
PUT    /api/v1/products/:id       // Update entire product
PATCH  /api/v1/products/:id       // Partial update
DELETE /api/v1/products/:id       // Delete product

// Nested resources
GET    /api/v1/products/:id/reviews        // Get product reviews
POST   /api/v1/products/:id/reviews        // Add review to product

// Actions (when necessary)
POST   /api/v1/users/:id/activate          // Activate user
POST   /api/v1/alerts/:id/trigger          // Trigger alert
```

### Consistent Response Format

Always use the same response structure:

```javascript
// utils/response.js
exports.successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

exports.errorResponse = (res, message, statusCode = 500, error = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      details: error.details || {}
    },
    timestamp: new Date().toISOString()
  });
};

// Pagination response
exports.paginatedResponse = (res, data, pagination) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit)
    }
  });
};
```

### API Versioning

Always version your APIs:

```javascript
// routes/index.js
const v1Routes = require('./v1');

app.use('/api/v1', v1Routes);
// Future: app.use('/api/v2', v2Routes);
```

### Request Validation

Validate all inputs using Joi:

```javascript
// validations/product.validation.js
const Joi = require('joi');

exports.createProductSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  price: Joi.number().positive().required(),
  category: Joi.string().required(),
  description: Joi.string().max(2000),
  images: Joi.array().items(Joi.string().uri()).max(10)
});

// Middleware usage
router.post('/', 
  validateRequest(createProductSchema),
  productController.createProduct
);
```

---

## Database Best Practices

### Mongoose Model Design

```javascript
// models/product.model.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    index: true, // Index frequently queried fields
    maxlength: [255, 'Name cannot exceed 255 characters']
  },
  
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  
  category: {
    type: String,
    required: true,
    enum: ['Smartphones', 'Laptops', 'Tablets', 'Accessories']
  },
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
productSchema.index({ name: 'text', description: 'text' }); // Text search
productSchema.index({ category: 1, price: 1 }); // Compound index
productSchema.index({ createdAt: -1 }); // Sort by date

// Virtual fields
productSchema.virtual('isDeleted').get(function() {
  return this.deletedAt !== null;
});

// Instance methods
productSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Static methods
productSchema.statics.findActive = function() {
  return this.find({ isActive: true, deletedAt: null });
};

// Middleware
productSchema.pre('save', function(next) {
  // Do something before saving
  next();
});

module.exports = mongoose.model('Product', productSchema);
```

### Repository Pattern

Abstract database operations:

```javascript
// repositories/base.repository.js
class BaseRepository {
  constructor(model) {
    this.model = model;
  }
  
  async findById(id, projection = {}) {
    return this.model.findById(id, projection).lean();
  }
  
  async findOne(filter, projection = {}) {
    return this.model.findOne(filter, projection).lean();
  }
  
  async find(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
    
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.model.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter)
    ]);
    
    return { data, total, page, limit };
  }
  
  async create(data) {
    const document = new this.model(data);
    return document.save();
  }
  
  async update(id, data) {
    return this.model.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
  }
  
  async delete(id) {
    return this.model.findByIdAndDelete(id);
  }
}

// repositories/product.repository.js
class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }
  
  async findByCategory(category, options = {}) {
    return this.find({ category, isActive: true }, options);
  }
  
  async searchProducts(query, options = {}) {
    return this.find(
      { $text: { $search: query }, isActive: true },
      options
    );
  }
}
```

### Query Optimization

```javascript
// ❌ BAD: N+1 query problem
const products = await Product.find();
for (let product of products) {
  product.reviews = await Review.find({ productId: product._id });
}

// ✅ GOOD: Use aggregation or populate
const products = await Product.aggregate([
  {
    $lookup: {
      from: 'reviews',
      localField: '_id',
      foreignField: 'productId',
      as: 'reviews'
    }
  }
]);

// Or use populate
const products = await Product.find().populate('reviews');
```

```javascript
// Always use projections to limit fields
// ❌ BAD: Return everything
const users = await User.find();

// ✅ GOOD: Only return needed fields
const users = await User.find({}, 'name email createdAt');
// Or
const users = await User.find().select('name email createdAt');
```

---

## Security Best Practices

### Authentication & Authorization

```javascript
// middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../errors');

exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to request
    req.user = decoded;
    
    next();
  } catch (error) {
    next(new AuthenticationError('Invalid or expired token'));
  }
};

// middlewares/authorize.middleware.js
exports.authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Not authenticated'));
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }
    
    next();
  };
};

// Usage
router.delete('/:id',
  authenticate,
  authorize(['admin']),
  productController.deleteProduct
);
```

### Input Sanitization

```javascript
// middlewares/sanitize.middleware.js
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Prevent NoSQL injection
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Custom sanitization
exports.sanitizeInput = (req, res, next) => {
  // Remove potentially dangerous characters
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
  };
  
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  
  next();
};
```

### Rate Limiting

```javascript
// middlewares/rate-limit.middleware.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../config/redis');

// General API rate limit
exports.apiLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Stricter limit for authentication endpoints
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

// Usage
app.use('/api/', apiLimiter);
app.use('/api/v1/auth', authLimiter);
```

### Password Security

```javascript
// services/auth/password.service.js
const bcrypt = require('bcryptjs');

class PasswordService {
  async hash(password) {
    const salt = await bcrypt.genSalt(12); // Increase rounds for more security
    return bcrypt.hash(password, salt);
  }
  
  async compare(password, hash) {
    return bcrypt.compare(password, hash);
  }
  
  validate(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  }
}

module.exports = PasswordService;
```

---

## Error Handling

### Custom Error Classes

```javascript
// errors/app-error.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// errors/validation-error.js
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

// errors/not-found-error.js
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}
```

### Centralized Error Handler

```javascript
// middlewares/error-handler.middleware.js
const logger = require('../utils/logger');
const { AppError } = require('../errors');

exports.errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });
  
  // Handle operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        details: err.details || {}
      }
    });
  }
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: err.errors
      }
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: { code: 'INVALID_TOKEN' }
    });
  }
  
  // Unknown errors (don't leak details)
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: { code: 'INTERNAL_ERROR' }
  });
};

// 404 handler
exports.notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    error: { code: 'NOT_FOUND' }
  });
};
```

---

## Performance Optimization

### Caching Strategy

```javascript
// services/cache/cache.service.js
const redis = require('../../config/redis');
const logger = require('../../utils/logger');

class CacheService {
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error', { error, key });
      return null;
    }
  }
  
  async set(key, value, ttl = 3600) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error', { error, key });
      return false;
    }
  }
  
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', { error, key });
      return false;
    }
  }
  
  async flush() {
    return redis.flushall();
  }
}

module.exports = new CacheService();
```

### Caching Middleware

```javascript
// middlewares/cache.middleware.js
const cacheService = require('../services/cache/cache.service');

exports.cacheResponse = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await cacheService.get(key);
      
      if (cached) {
        return res.json(cached);
      }
      
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache response
      res.json = (body) => {
        cacheService.set(key, body, duration);
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};

// Usage
router.get('/products', cacheResponse(600), productController.getProducts);
```

### Database Connection Pooling

```javascript
// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10, // Connection pool size
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## Testing Strategy

### Unit Testing Example

```javascript
// tests/unit/services/user.service.test.js
const UserService = require('../../../src/services/user/user.service');
const UserRepository = require('../../../src/repositories/user.repository');

jest.mock('../../../src/repositories/user.repository');

describe('UserService', () => {
  let userService;
  let mockUserRepository;
  
  beforeEach(() => {
    mockUserRepository = new UserRepository();
    userService = new UserService();
    userService.userRepository = mockUserRepository;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getUserById', () => {
    it('should return user when user exists', async () => {
      const mockUser = { _id: '123', name: 'Test User', email: 'test@test.com' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      
      const result = await userService.getUserById('123');
      
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
    });
    
    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      
      await expect(userService.getUserById('123')).rejects.toThrow('User not found');
    });
  });
});
```

### Integration Testing Example

```javascript
// tests/integration/api/auth.test.js
const request = require('supertest');
const app = require('../../../src/app');
const { connectDB, closeDB, clearDB } = require('../../helpers/db-helper');

describe('Auth API', () => {
  beforeAll(async () => {
    await connectDB();
  });
  
  afterAll(async () => {
    await closeDB();
  });
  
  beforeEach(async () => {
    await clearDB();
  });
  
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@test.com',
        password: 'Password123!'
      };
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.email).toBe(userData.email);
    });
    
    it('should return 400 for invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'Password123!'
      };
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });
});
```

---

## Logging & Monitoring

### Winston Logger Setup

```javascript
// utils/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'shopwise-backend' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

---

## Documentation

### JSDoc Comments

```javascript
/**
 * Retrieves paginated list of products with optional filtering
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.category] - Product category
 * @param {number} [filters.minPrice] - Minimum price
 * @param {number} [filters.maxPrice] - Maximum price
 * @param {Object} options - Pagination options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=10] - Items per page
 * @returns {Promise<{data: Array, total: number, page: number, limit: number}>}
 * @throws {ValidationError} When invalid filters provided
 */
async getProducts(filters = {}, options = {}) {
  // Implementation
}
```

---

## Git Workflow

### Commit Message Convention

Follow Conventional Commits:

```
feat: add price comparison endpoint
fix: resolve authentication token expiry issue
docs: update API documentation for user endpoints
refactor: restructure product service layer
test: add unit tests for alert service
chore: update dependencies
```

### Branch Naming

```
feature/user-authentication
bugfix/price-calculation-error
hotfix/security-vulnerability
refactor/database-queries
docs/api-documentation
```

This comprehensive guide ensures consistency, quality, and maintainability across the ShopWise backend codebase.

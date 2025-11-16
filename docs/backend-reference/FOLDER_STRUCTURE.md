# ShopWise Backend - Folder Structure

## Complete Directory Structure

```
shopwise-backend/
├── .github/
│   └── copilot-instructions.md         # GitHub Copilot instructions
│
├── src/
│   ├── api/                            # API layer
│   │   ├── routes/                     # Route definitions
│   │   │   ├── v1/                     # API version 1
│   │   │   │   ├── index.js            # Routes aggregator
│   │   │   │   ├── auth.routes.js      # Authentication routes
│   │   │   │   ├── user.routes.js      # User management routes
│   │   │   │   ├── product.routes.js   # Product routes
│   │   │   │   ├── search.routes.js    # Search routes
│   │   │   │   ├── alert.routes.js     # Price alert routes
│   │   │   │   ├── review.routes.js    # Review routes
│   │   │   │   ├── notification.routes.js # Notification routes
│   │   │   │   ├── platform.routes.js  # Platform routes
│   │   │   │   ├── category.routes.js  # Category routes
│   │   │   │   └── admin.routes.js     # Admin routes
│   │   │   └── index.js                # Main routes entry
│   │   │
│   │   ├── controllers/                # Request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── product.controller.js
│   │   │   ├── search.controller.js
│   │   │   ├── alert.controller.js
│   │   │   ├── review.controller.js
│   │   │   ├── notification.controller.js
│   │   │   ├── platform.controller.js
│   │   │   ├── category.controller.js
│   │   │   └── admin.controller.js
│   │   │
│   │   ├── middlewares/                # Express middlewares
│   │   │   ├── auth.middleware.js      # JWT authentication
│   │   │   ├── authorize.middleware.js # Role-based authorization
│   │   │   ├── validate.middleware.js  # Request validation
│   │   │   ├── rate-limit.middleware.js # Rate limiting
│   │   │   ├── error-handler.middleware.js # Error handling
│   │   │   ├── request-logger.middleware.js # Request logging
│   │   │   ├── cors.middleware.js      # CORS configuration
│   │   │   ├── sanitize.middleware.js  # Input sanitization
│   │   │   └── cache.middleware.js     # Response caching
│   │   │
│   │   └── validations/                # Joi validation schemas
│   │       ├── auth.validation.js
│   │       ├── user.validation.js
│   │       ├── product.validation.js
│   │       ├── alert.validation.js
│   │       ├── review.validation.js
│   │       ├── notification.validation.js
│   │       ├── platform.validation.js
│   │       ├── category.validation.js
│   │       └── common.validation.js
│   │
│   ├── services/                       # Business logic layer
│   │   ├── auth/
│   │   │   ├── auth.service.js         # Authentication logic
│   │   │   ├── token.service.js        # JWT token management
│   │   │   └── password.service.js     # Password hashing/reset
│   │   ├── user/
│   │   │   ├── user.service.js         # User management
│   │   │   └── preference.service.js   # User preferences
│   │   ├── product/
│   │   │   ├── product.service.js      # Product operations
│   │   │   ├── listing.service.js      # Product listings
│   │   │   └── variant.service.js      # Product variants
│   │   ├── price/
│   │   │   ├── price-history.service.js # Price tracking
│   │   │   ├── price-comparison.service.js # Price comparison
│   │   │   └── price-prediction.service.js # ML price predictions
│   │   ├── search/
│   │   │   ├── search.service.js       # Product search
│   │   │   └── filter.service.js       # Search filters
│   │   ├── alert/
│   │   │   ├── alert.service.js        # Price alerts
│   │   │   └── notification.service.js # Alert notifications
│   │   ├── review/
│   │   │   ├── review.service.js       # Review management
│   │   │   └── sentiment.service.js    # Review sentiment analysis
│   │   ├── notification/
│   │   │   └── notification.service.js # Notification management
│   │   ├── platform/
│   │   │   └── platform.service.js     # Platform management
│   │   ├── category/
│   │   │   └── category.service.js     # Category management
│   │   ├── cache/
│   │   │   └── cache.service.js        # Redis caching
│   │   └── external/
│   │       ├── ml-api.service.js       # ML service integration
│   │       ├── email.service.js        # Email service
│   │       └── sms.service.js          # SMS service
│   │
│   ├── repositories/                   # Data access layer
│   │   ├── user.repository.js
│   │   ├── product.repository.js
│   │   ├── listing.repository.js
│   │   ├── price-history.repository.js
│   │   ├── alert.repository.js
│   │   ├── review.repository.js
│   │   ├── notification.repository.js
│   │   ├── platform.repository.js
│   │   ├── category.repository.js
│   │   ├── search-history.repository.js
│   │   └── base.repository.js          # Base repository class
│   │
│   ├── models/                         # Mongoose models
│   │   ├── user.model.js
│   │   ├── product.model.js
│   │   ├── listing.model.js
│   │   ├── price-history.model.js
│   │   ├── alert.model.js
│   │   ├── review.model.js
│   │   ├── notification.model.js
│   │   ├── platform.model.js
│   │   ├── category.model.js
│   │   ├── search-history.model.js
│   │   └── index.js                    # Models export
│   │
│   ├── utils/                          # Utility functions
│   │   ├── logger.js                   # Winston logger
│   │   ├── response.js                 # Response formatters
│   │   ├── error-codes.js              # Error code constants
│   │   ├── helpers.js                  # General helpers
│   │   ├── date.js                     # Date utilities
│   │   ├── validators.js               # Custom validators
│   │   └── constants.js                # App constants
│   │
│   ├── config/                         # Configuration files
│   │   ├── index.js                    # Config aggregator
│   │   ├── database.js                 # Database config
│   │   ├── redis.js                    # Redis config
│   │   ├── jwt.js                      # JWT config
│   │   ├── email.js                    # Email config
│   │   ├── sms.js                      # SMS config
│   │   └── app.js                      # App config
│   │
│   ├── errors/                         # Custom error classes
│   │   ├── app-error.js                # Base error class
│   │   ├── validation-error.js
│   │   ├── authentication-error.js
│   │   ├── authorization-error.js
│   │   ├── not-found-error.js
│   │   └── index.js
│   │
│   ├── jobs/                           # Background jobs (Bull)
│   │   ├── queues/
│   │   │   ├── email.queue.js
│   │   │   ├── notification.queue.js
│   │   │   ├── price-check.queue.js
│   │   │   └── index.js
│   │   ├── workers/
│   │   │   ├── email.worker.js
│   │   │   ├── notification.worker.js
│   │   │   └── price-check.worker.js
│   │   └── index.js
│   │
│   ├── events/                         # Event handlers
│   │   ├── emitters/
│   │   │   └── app-events.js           # Event emitter
│   │   ├── listeners/
│   │   │   ├── user-events.listener.js
│   │   │   ├── price-events.listener.js
│   │   │   ├── alert-events.listener.js
│   │   │   └── notification-events.listener.js
│   │   └── index.js
│   │
│   ├── docs/                           # API documentation
│   │   ├── swagger.js                  # Swagger configuration
│   │   └── swagger.json                # OpenAPI specification
│   │
│   ├── database/                       # Database related
│   │   ├── seeders/                    # Database seeders
│   │   │   ├── user.seeder.js
│   │   │   ├── platform.seeder.js
│   │   │   ├── category.seeder.js
│   │   │   └── index.js
│   │   └── migrations/                 # Migration scripts
│   │       └── README.md
│   │
│   ├── app.js                          # Express app setup
│   └── server.js                       # Server entry point
│
├── tests/                              # Test files
│   ├── unit/                           # Unit tests
│   │   ├── services/
│   │   ├── repositories/
│   │   └── utils/
│   ├── integration/                    # Integration tests
│   │   ├── api/
│   │   └── database/
│   ├── fixtures/                       # Test data
│   │   └── mock-data.js
│   ├── helpers/                        # Test helpers
│   │   └── test-helper.js
│   └── setup.js                        # Test setup
│
├── scripts/                            # Utility scripts
│   ├── seed-database.js                # Database seeding
│   ├── create-admin.js                 # Create admin user
│   └── generate-docs.js                # Generate documentation
│
├── logs/                               # Application logs
│   ├── .gitkeep
│   └── README.md
│
├── .env.example                        # Environment variables template
├── .env                                # Environment variables (git-ignored)
├── .gitignore                          # Git ignore rules
├── .eslintrc.js                        # ESLint configuration
├── .prettierrc                         # Prettier configuration
├── .editorconfig                       # Editor configuration
├── package.json                        # NPM dependencies
├── package-lock.json                   # Dependency lock file
├── jest.config.js                      # Jest configuration
├── nodemon.json                        # Nodemon configuration
├── docker-compose.yml                  # Docker compose for local dev
├── Dockerfile                          # Docker image definition
├── README.md                           # Project documentation
└── LICENSE                             # License file
```

## Key Architectural Decisions

### 1. Layered Architecture
- **Routes**: Handle HTTP request/response
- **Controllers**: Orchestrate request handling
- **Services**: Contain business logic
- **Repositories**: Abstract data access
- **Models**: Define data structure

### 2. Separation of Concerns
- Each layer has a single responsibility
- Business logic is isolated in services
- Data access is abstracted in repositories

### 3. Modular Organization
- Related functionality grouped together
- Easy to locate and modify code
- Supports microservices migration

### 4. Scalability
- Services can be split into microservices
- Background jobs handled by Bull queues
- Caching layer with Redis

### 5. Testing
- Separate test directory structure
- Unit and integration tests
- Test fixtures and helpers

## Naming Conventions

- **Files**: kebab-case (e.g., `user-service.js`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Functions/Variables**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_LOGIN_ATTEMPTS`)

## Import Order Convention

```javascript
// 1. Core/Built-in modules
const fs = require('fs');
const path = require('path');

// 2. External dependencies
const express = require('express');
const mongoose = require('mongoose');

// 3. Internal modules (absolute imports)
const UserService = require('../services/user/user.service');
const { logger } = require('../utils/logger');

// 4. Configuration
const config = require('../config');

// 5. Constants
const { USER_ROLES } = require('../utils/constants');
```

## Environment Variables Structure

The `.env` file should contain:
- `NODE_ENV` - Environment (development/staging/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `JWT_EXPIRE` - Access token expiration
- `EMAIL_*` - Email service credentials
- `SMS_*` - SMS service credentials
- `ML_API_URL` - Machine Learning service URL

## Additional Notes

### Why This Structure?

1. **Scalability**: Easy to scale horizontally and vertically
2. **Maintainability**: Clear organization makes maintenance easier
3. **Testability**: Structure supports comprehensive testing
4. **Team Collaboration**: Multiple developers can work without conflicts
5. **Best Practices**: Follows industry-standard Node.js patterns
6. **Microservices Ready**: Can be split into services if needed

### Future Considerations

- Can add `src/graphql/` for GraphQL support
- Can add `src/websockets/` for real-time features
- Can split services into separate microservices
- Can add `src/grpc/` for inter-service communication

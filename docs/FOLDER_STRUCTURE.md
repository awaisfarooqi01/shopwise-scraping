# ShopWise Scraping - Complete Folder Structure

## 📁 Directory Tree

```
shopwise-scraping/
│
├── .github/                                    # GitHub configuration
│   ├── workflows/                             # CI/CD workflows
│   │   ├── ci.yml                            # Continuous integration
│   │   ├── deploy-staging.yml                # Staging deployment
│   │   └── deploy-production.yml             # Production deployment
│   ├── ISSUE_TEMPLATE/                        # Issue templates
│   │   ├── bug_report.md                     # Bug report template
│   │   ├── feature_request.md                # Feature request template
│   │   └── platform_request.md               # New platform request
│   ├── PULL_REQUEST_TEMPLATE.md              # PR template
│   └── copilot-instructions.md               # GitHub Copilot instructions
│
├── src/                                        # Source code
│   │
│   ├── scrapers/                              # Platform-specific scrapers
│   │   ├── base/                             # Base scraper classes
│   │   │   ├── base-scraper.js              # Abstract base scraper
│   │   │   ├── browser-scraper.js           # Browser-based scraper base
│   │   │   ├── static-scraper.js            # Static HTML scraper base
│   │   │   └── api-scraper.js               # API scraper base
│   │   │
│   │   ├── platforms/                        # Platform implementations
│   │   │   ├── daraz/                       # Daraz.pk scraper
│   │   │   │   ├── daraz.scraper.js
│   │   │   │   ├── daraz.config.js
│   │   │   │   └── daraz.utils.js
│   │   │   │
│   │   │   ├── priceoye/                    # PriceOye scraper
│   │   │   │   ├── priceoye.scraper.js
│   │   │   │   └── priceoye.config.js
│   │   │   │
│   │   │   ├── telemart/                    # Telemart scraper
│   │   │   │   ├── telemart.scraper.js
│   │   │   │   └── telemart.config.js
│   │   │   │
│   │   │   ├── homeshopping/                # Homeshopping scraper
│   │   │   │   ├── homeshopping.scraper.js
│   │   │   │   └── homeshopping.config.js
│   │   │   │
│   │   │   └── goto/                        # Goto scraper
│   │   │       ├── goto.scraper.js
│   │   │       └── goto.config.js
│   │   │
│   │   ├── extractors/                       # Data extraction utilities
│   │   │   ├── product-extractor.js
│   │   │   ├── review-extractor.js
│   │   │   ├── price-extractor.js
│   │   │   └── image-extractor.js
│   │   │
│   │   ├── factory/                          # Scraper factory
│   │   │   └── scraper-factory.js
│   │   │
│   │   └── index.js                          # Scraper registry
│   │
│   ├── pipeline/                              # Data processing pipeline
│   │   ├── stages/                           # Pipeline stages
│   │   │   ├── extract-stage.js             # Data extraction
│   │   │   ├── clean-stage.js               # Data cleaning
│   │   │   ├── transform-stage.js           # Data transformation
│   │   │   ├── validate-stage.js            # Data validation
│   │   │   └── enrich-stage.js              # Data enrichment
│   │   │
│   │   ├── cleaners/                         # Data cleaners
│   │   │   ├── text-cleaner.js              # Text cleaning
│   │   │   ├── html-cleaner.js              # HTML cleaning
│   │   │   ├── price-cleaner.js             # Price normalization
│   │   │   └── url-cleaner.js               # URL normalization
│   │   │
│   │   ├── transformers/                     # Data transformers
│   │   │   ├── product-transformer.js       # Product transformation
│   │   │   ├── review-transformer.js        # Review transformation
│   │   │   └── schema-mapper.js             # Backend schema mapping
│   │   │
│   │   ├── validators/                       # Data validators
│   │   │   ├── product-validator.js         # Product validation
│   │   │   ├── review-validator.js          # Review validation
│   │   │   └── schema-validator.js          # Joi schema validation
│   │   │
│   │   ├── enrichers/                        # Data enrichers
│   │   │   ├── product-enricher.js          # Product enrichment
│   │   │   └── metadata-enricher.js         # Metadata addition
│   │   │
│   │   └── index.js                          # Pipeline orchestrator
│   │
│   ├── services/                              # Business logic services
│   │   ├── scraping/                         # Scraping orchestration
│   │   │   ├── scraping.service.js          # Main scraping service
│   │   │   ├── batch-scraping.service.js    # Batch scraping
│   │   │   └── review-scraping.service.js   # Review scraping
│   │   │
│   │   ├── storage/                          # Database operations
│   │   │   ├── product-storage.service.js   # Product storage
│   │   │   ├── review-storage.service.js    # Review storage
│   │   │   └── price-history.service.js     # Price history tracking
│   │   │
│   │   ├── queue/                            # Queue management
│   │   │   ├── queue.service.js             # Queue operations
│   │   │   └── job-priority.service.js      # Job prioritization
│   │   │
│   │   ├── cache/                            # Caching layer
│   │   │   ├── cache.service.js             # Redis caching
│   │   │   └── product-cache.service.js     # Product caching
│   │   │
│   │   ├── proxy/                            # Proxy management
│   │   │   ├── proxy.service.js             # Proxy rotation
│   │   │   └── proxy-pool.js                # Proxy pool management
│   │   │
│   │   └── monitoring/                       # Metrics and monitoring
│   │       ├── metrics.service.js           # Metrics collection
│   │       ├── health.service.js            # Health checks
│   │       └── alert.service.js             # Alert notifications
│   │
│   ├── jobs/                                  # Background jobs
│   │   ├── workers/                          # Job workers
│   │   │   ├── scraping.worker.js           # Scraping worker
│   │   │   ├── review.worker.js             # Review worker
│   │   │   └── price-update.worker.js       # Price update worker
│   │   │
│   │   ├── queues/                           # Queue definitions
│   │   │   ├── product-queue.js             # Product scraping queue
│   │   │   ├── review-queue.js              # Review scraping queue
│   │   │   └── price-queue.js               # Price update queue
│   │   │
│   │   ├── schedulers/                       # Cron-based schedulers
│   │   │   ├── product-scheduler.js         # Product scraping scheduler
│   │   │   ├── review-scheduler.js          # Review scraping scheduler
│   │   │   └── price-scheduler.js           # Price update scheduler
│   │   │
│   │   └── index.js                          # Jobs orchestrator
│   │
│   ├── config/                                # Configuration management
│   │   ├── platforms/                        # Platform configurations (JSON)
│   │   │   ├── daraz-pk.json
│   │   │   ├── priceoye.json
│   │   │   ├── telemart.json
│   │   │   ├── homeshopping.json
│   │   │   └── goto.json
│   │   │
│   │   ├── database.js                       # MongoDB configuration
│   │   ├── redis.js                          # Redis configuration
│   │   ├── browser.js                        # Browser configuration
│   │   ├── scraping.js                       # Scraping settings
│   │   ├── queue.js                          # Queue configuration
│   │   └── index.js                          # Config aggregator
│   │
│   ├── utils/                                 # Utility functions
│   │   ├── logger.js                         # Winston logger
│   │   ├── browser.js                        # Browser pool management
│   │   ├── browser-pool.js                   # Browser instance pool
│   │   ├── retry.js                          # Retry logic with backoff
│   │   ├── rate-limiter.js                   # Rate limiting utilities
│   │   ├── circuit-breaker.js                # Circuit breaker pattern
│   │   ├── selectors.js                      # CSS/XPath selector helpers
│   │   ├── parsers.js                        # Data parsing utilities
│   │   ├── validators.js                     # Input validation
│   │   ├── helpers.js                        # General helpers
│   │   ├── user-agents.js                    # User agent list
│   │   └── constants.js                      # Application constants
│   │
│   ├── models/                                # MongoDB models (shared with backend)
│   │   ├── product.model.js
│   │   ├── platform.model.js
│   │   ├── review.model.js
│   │   ├── sale-history.model.js
│   │   ├── category.model.js
│   │   └── index.js                          # Models export
│   │
│   ├── errors/                                # Custom error classes
│   │   ├── scraping-error.js                 # Base scraping error
│   │   ├── network-error.js                  # Network errors
│   │   ├── validation-error.js               # Validation errors
│   │   ├── parsing-error.js                  # Parsing errors
│   │   ├── blocked-error.js                  # Bot detection errors
│   │   └── index.js                          # Errors export
│   │
│   ├── middleware/                            # Express middleware (optional API)
│   │   ├── auth.middleware.js                # Authentication
│   │   ├── error-handler.middleware.js       # Error handling
│   │   └── logger.middleware.js              # Request logging
│   │
│   ├── api/                                   # Optional REST API for monitoring
│   │   ├── routes/
│   │   │   ├── metrics.routes.js            # Metrics endpoints
│   │   │   ├── health.routes.js             # Health check
│   │   │   └── scraping.routes.js           # Manual scraping triggers
│   │   │
│   │   ├── controllers/
│   │   │   ├── metrics.controller.js
│   │   │   ├── health.controller.js
│   │   │   └── scraping.controller.js
│   │   │
│   │   └── index.js                          # API router
│   │
│   └── index.js                               # Main entry point
│
├── scripts/                                    # Utility scripts
│   ├── test-scraper.js                        # Test individual scrapers
│   ├── validate-config.js                     # Validate platform configs
│   ├── update-selectors.js                    # Update CSS selectors
│   ├── benchmark-scraper.js                   # Performance benchmarking
│   ├── export-data.js                         # Data export utilities
│   ├── setup.js                               # Initial setup script
│   ├── clean-database.js                      # Database cleanup
│   └── migrate-data.js                        # Data migration
│
├── tests/                                      # Test suite
│   ├── unit/                                  # Unit tests
│   │   ├── scrapers/
│   │   │   ├── platforms/
│   │   │   │   ├── daraz.test.js
│   │   │   │   ├── priceoye.test.js
│   │   │   │   └── ...
│   │   │   └── extractors/
│   │   ├── pipeline/
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── integration/                           # Integration tests
│   │   ├── scrapers/
│   │   ├── pipeline/
│   │   └── database/
│   │
│   ├── e2e/                                   # End-to-end tests
│   │   ├── scraping-flow.test.js
│   │   └── queue-processing.test.js
│   │
│   ├── fixtures/                              # Test fixtures
│   │   ├── html/                             # Sample HTML files
│   │   │   ├── daraz-product.html
│   │   │   ├── priceoye-product.html
│   │   │   └── ...
│   │   ├── data/                             # Mock data
│   │   │   └── mock-products.json
│   │   └── config/                           # Test configurations
│   │
│   ├── mocks/                                 # Mock modules
│   │   ├── browser.mock.js
│   │   └── database.mock.js
│   │
│   ├── helpers/                               # Test helpers
│   │   └── test-helper.js
│   │
│   └── setup.js                               # Test setup
│
├── docs/                                       # Documentation
│   ├── SYSTEM_ARCHITECTURE.md                 # System architecture
│   ├── SCRAPING_GUIDELINES.md                 # Scraping best practices
│   ├── DEVELOPMENT_WORKFLOW.md                # Development guide
│   ├── API_REFERENCE.md                       # API documentation
│   ├── TROUBLESHOOTING.md                     # Troubleshooting guide
│   ├── DEPLOYMENT.md                          # Deployment guide
│   │
│   └── PLATFORM_GUIDES/                       # Per-platform documentation
│       ├── daraz-pk.md
│       ├── priceoye.md
│       ├── telemart.md
│       ├── homeshopping.md
│       └── goto.md
│
├── logs/                                       # Application logs
│   ├── scraping/                              # Scraping logs
│   │   └── scraping-YYYY-MM-DD.log
│   ├── errors/                                # Error logs
│   │   └── error-YYYY-MM-DD.log
│   └── combined/                              # Combined logs
│       └── combined-YYYY-MM-DD.log
│
├── data/                                       # Data storage (gitignored)
│   ├── screenshots/                           # Debug screenshots
│   ├── html-dumps/                            # HTML dumps for debugging
│   ├── exports/                               # Exported data
│   └── cache/                                 # Cached data
│
├── .github/                                    # GitHub configuration
├── .env.example                                # Environment template
├── .env                                        # Environment variables (gitignored)
├── .eslintrc.js                               # ESLint configuration
├── .prettierrc                                # Prettier configuration
├── .gitignore                                 # Git ignore rules
├── package.json                                # NPM dependencies
├── package-lock.json                           # NPM lock file
├── nodemon.json                                # Nodemon configuration
├── jest.config.js                              # Jest configuration
├── README.md                                   # Project README
├── CONTRIBUTING.md                             # Contribution guidelines
├── CHANGELOG.md                                # Version changelog
└── LICENSE                                     # MIT License
```

## 📂 Key Directories Explained

### `/src/scrapers/`
Contains all scraping logic, organized by platform. Each platform has its own directory with scraper implementation, configuration, and utilities.

### `/src/pipeline/`
Data processing pipeline with stages for cleaning, transforming, validating, and enriching scraped data before storage.

### `/src/services/`
Business logic layer containing services for scraping orchestration, storage, caching, queuing, and monitoring.

### `/src/jobs/`
Background job processing with workers, queues, and schedulers for automated scraping tasks.

### `/src/config/`
Configuration files including platform-specific JSON configs and application settings.

### `/src/utils/`
Utility functions and helpers used across the application.

### `/src/models/`
Mongoose models shared with the backend for database operations.

### `/tests/`
Comprehensive test suite with unit, integration, and E2E tests, plus fixtures and mocks.

### `/docs/`
Complete documentation including architecture, guidelines, workflows, and platform-specific guides.

### `/scripts/`
Utility scripts for testing, validation, benchmarking, and maintenance tasks.

## 🗂️ File Naming Conventions

- **JavaScript files**: `kebab-case.js` (e.g., `product-scraper.js`)
- **Test files**: `*.test.js` or `*.spec.js`
- **Configuration files**: `*.config.js` or `*.json`
- **Documentation**: `UPPERCASE.md`
- **Platform guides**: `lowercase.md`

## 📝 Module Organization

Each module follows this structure:
```javascript
// Imports
// Constants
// Main class/function
// Helper functions
// Exports
```

## 🎯 Benefits of This Structure

1. **Scalability**: Easy to add new platforms and features
2. **Maintainability**: Clear separation of concerns
3. **Testability**: Well-organized test structure
4. **Documentation**: Comprehensive docs for all aspects
5. **Collaboration**: Clear structure for team development
6. **Production-Ready**: Suitable for production deployment

---

**This structure is designed to grow with your project while maintaining organization and clarity.**

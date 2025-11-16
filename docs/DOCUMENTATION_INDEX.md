# Documentation Index

> Complete guide to ShopWise Scraping Service documentation

---

## 📚 Getting Started

### Quick Start
- **[QUICKSTART.md](../QUICKSTART.md)** - Fast setup guide to get scraping in minutes
- **[README.md](../README.md)** - Project overview and features
- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Post-setup verification checklist

---

## 🏗️ Architecture & Planning

### System Design
- **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** - Complete system architecture, components, and data flow
- **[FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)** - Project directory structure and organization
- **[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)** - Development phases and task breakdown

---

## 💾 Database & Data

### Schema & Structure
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - MongoDB collections, fields, and validation rules
- **[CATEGORY_REFERENCE.md](CATEGORY_REFERENCE.md)** - Product category hierarchy and mapping guidelines
- **[PLATFORM_REFERENCE.md](PLATFORM_REFERENCE.md)** - Supported platforms and their configurations
- **[CATEGORY_BRAND_NORMALIZATION_STRATEGY.md](CATEGORY_BRAND_NORMALIZATION_STRATEGY.md)** - ✅ **UPDATED**: Strategy with implemented backend API solution
- **[NORMALIZATION_DECISION_GUIDE.md](NORMALIZATION_DECISION_GUIDE.md)** - Quick comparison and decision guide for normalization approaches
- **[BRAND_CATEGORY_API_INTEGRATION.md](BRAND_CATEGORY_API_INTEGRATION.md)** - ✨ **NEW**: Complete guide for integrating with backend normalization APIs (~700 lines)

**Key Collections for Scrapers:**
1. **Products** - Main scraping target (name, price, brand, specifications, etc.)
2. **Reviews** - Secondary target (ratings, review text, verified purchase)
3. **Sale History** - Auto-generated from price changes
4. **Platforms** - Reference data (pre-populated)
5. **Categories** - Reference data (pre-populated)
6. **Brands** - ✅ **IMPLEMENTED IN BACKEND**: Canonical brand information with fuzzy matching
7. **Category Mappings** - ✅ **IMPLEMENTED IN BACKEND**: Platform-specific category mappings

---

## 🕷️ Scraping Guidelines

### Best Practices
- **[SCRAPING_GUIDELINES.md](SCRAPING_GUIDELINES.md)** - Web scraping best practices, anti-detection, and ethics

**Key Topics:**
- Rate limiting and respectful crawling
- Anti-detection measures (stealth mode, proxies, user agents)
- Error handling and retry logic
- Data extraction and normalization
- Legal and ethical considerations

---

## 🔧 Development

### Workflow & Contribution
- **[DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md)** - Git workflow, code standards, and PR process
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute to the project

---

## 🎯 Implementation Phases

### Phase 1: Foundation
**Goal:** Set up development environment and core infrastructure

**Tasks:**
- Install dependencies (Playwright, Cheerio, Axios, Winston, Redis, MongoDB)
- Create base scraper classes (BaseScraper, StaticScraper, BrowserScraper, ApiScraper)
- Implement logger utilities
- Set up database connections
- Build utility functions

**Documentation:** [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md#phase-1-foundation)

---

### Phase 1.5: Backend API Integration (🆕 PRIORITY)
**Goal:** Integrate with ShopWise Backend APIs for centralized brand and category normalization

**Status:** ✅ Backend APIs Ready | 📋 Scraper Integration Pending

**Tasks:**
- Create backend API client with authentication
- Implement normalization service with caching
- Update base scraper classes
- Add configuration management
- Write integration tests
- Update platform scrapers

**Backend APIs Available:**
- ✅ 18 Brand API endpoints (normalize, search, batch operations)
- ✅ 13 Category Mapping API endpoints (map, batch, statistics)
- ✅ Fuzzy matching with 85%+ confidence
- ✅ Auto-learning from corrections
- ✅ Admin review queue

**Documentation:**
- [BRAND_CATEGORY_API_INTEGRATION.md](BRAND_CATEGORY_API_INTEGRATION.md) - Complete integration guide (~700 lines)
- [CATEGORY_BRAND_NORMALIZATION_STRATEGY.md](CATEGORY_BRAND_NORMALIZATION_STRATEGY.md) - Updated strategy
- [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md#phase-15-backend-api-integration--priority)

**Backend Documentation** (see `shopwise-backend/docs/`):
- `API_IMPLEMENTATION_PROGRESS.md` - All 91+ endpoints documented
- `PHASE_5_COMPLETION_SUMMARY.md` - Brand & Category API implementation details
- `PHASE_6_COMPLETION_SUMMARY.md` - Documentation & testing summary
- `ShopWise_Brand_CategoryMapping_Postman_Collection.json` - Postman collection (31 endpoints)

---

### Phase 2: First Platform - PriceOye
**Goal:** Implement end-to-end scraping for PriceOye.pk

**Tasks:**
- Create PriceOyeScraper class
- Implement data extractors (Product, Review, Price, Image)
- Build data processing pipeline (Clean, Transform, Validate, Enrich)
- Create storage services
- Write comprehensive tests

**Documentation:**
- [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md#phase-2-first-platform---priceoye)
- [PLATFORM_REFERENCE.md](PLATFORM_REFERENCE.md#1-priceoye-priority-platform)
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#-products-collection)

---

### Phase 3: Queue System & Job Processing
**Goal:** Implement Bull queues for scalability

**Tasks:**
- Set up Bull queue with Redis
- Create queue workers (Product, Review, Price Update, Category)
- Implement job schedulers (cron-based)
- Add retry logic with exponential backoff
- Implement circuit breaker pattern

**Documentation:** [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md#phase-3-queue-system--job-processing)

---

### Phase 4: Multi-Platform Expansion
**Goal:** Add support for Daraz, Telemart, Homeshopping, Goto

**Tasks:**
- Implement scrapers for each platform
- Create scraper factory and registry
- Optimize selectors and handle edge cases
- Add platform-specific configurations

**Documentation:**
- [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md#phase-4-multi-platform-expansion)
- [PLATFORM_REFERENCE.md](PLATFORM_REFERENCE.md)

---

### Phase 5: Production Readiness
**Goal:** Optimize, secure, and deploy to production

**Tasks:**
- Performance optimization (caching, database indexes, resource management)
- Security hardening (input validation, authentication, secret management)
- Monitoring & observability (Prometheus, Grafana)
- CI/CD pipeline (GitHub Actions, Docker, deployment)
- Final testing and launch

**Documentation:** [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md#phase-5-production-readiness)

---

## 📖 Quick Reference

### Platform Priority Order
1. **PriceOye** (Phase 2) - Primary focus
2. **Daraz** (Phase 4) - Second priority
3. **Telemart** (Phase 4) - Third priority
4. **Homeshopping** (Phase 4) - Fourth priority
5. **Goto** (Phase 4) - Fifth priority

### Required Product Fields
```javascript
{
  platform_id: ObjectId,      // Required
  platform_name: String,      // Required
  name: String,               // Required
  original_url: String,       // Required
  price: Number,              // Required
  currency: String,           // Default: "PKR"
  brand: String,              // Recommended
  category_name: String,      // Recommended
  description: String,        // Recommended
  specifications: Object,     // Recommended
  availability: String,       // Recommended
  media: Object,              // Recommended
}
```

### Rate Limits by Platform
| Platform | Requests/Min | Delay Between Requests |
|----------|-------------|------------------------|
| PriceOye | 60 | 1s |
| Daraz | 30 | 2s |
| Telemart | 45 | 1.5s |
| Homeshopping | 50 | 1.2s |
| Goto | 40 | 1.5s |

### Data Validation Rules
- **name**: Required, non-empty string
- **price**: Required, positive number
- **original_url**: Required, valid URL
- **rating**: If provided, must be 0-5
- **availability**: Must be one of: "in_stock", "out_of_stock", "pre_order"

---

## 🔍 Finding Information

### By Topic

**Setting Up the Project**
→ [QUICKSTART.md](../QUICKSTART.md)

**Understanding the System**
→ [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)

**Planning Development**
→ [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)

**Database Structure**
→ [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

**Platform Information**
→ [PLATFORM_REFERENCE.md](PLATFORM_REFERENCE.md)

**Category Mapping**
→ [CATEGORY_REFERENCE.md](CATEGORY_REFERENCE.md)

**Scraping Best Practices**
→ [SCRAPING_GUIDELINES.md](SCRAPING_GUIDELINES.md)

**Code Organization**
→ [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)

**Git Workflow**
→ [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md)

---

## 🚀 Common Tasks

### Task: Create a New Platform Scraper

1. Read [PLATFORM_REFERENCE.md](PLATFORM_REFERENCE.md) for platform details
2. Check [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for required fields
3. Follow [SCRAPING_GUIDELINES.md](SCRAPING_GUIDELINES.md) for best practices
4. Use [CATEGORY_REFERENCE.md](CATEGORY_REFERENCE.md) for category mapping
5. Follow [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) for Git workflow

### Task: Understanding Data Flow

1. Read [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) - Data Flow section
2. Check [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for collection relationships
3. Review [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) for code organization

### Task: Setting Up Development Environment

1. Follow [QUICKSTART.md](../QUICKSTART.md)
2. Verify setup with [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
3. Check [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) for workflow

### Task: Planning Your Sprint

1. Review [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) for phases
2. Check current phase objectives and tasks
3. Follow [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) for sprint structure

---

## 📊 Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| QUICKSTART.md | ✅ Complete | Nov 2025 |
| README.md | ✅ Complete | Nov 2025 |
| SYSTEM_ARCHITECTURE.md | ✅ Complete | Nov 2025 |
| FOLDER_STRUCTURE.md | ✅ Complete | Nov 2025 |
| IMPLEMENTATION_ROADMAP.md | ✅ Complete | Nov 16, 2025 |
| DATABASE_SCHEMA.md | ✅ Complete | Nov 16, 2025 |
| PLATFORM_REFERENCE.md | ✅ Complete | Nov 16, 2025 |
| CATEGORY_REFERENCE.md | ✅ Complete | Nov 16, 2025 |
| SCRAPING_GUIDELINES.md | ✅ Complete | Nov 2025 |
| DEVELOPMENT_WORKFLOW.md | ✅ Complete | Nov 2025 |
| SETUP_COMPLETE.md | ✅ Complete | Nov 2025 |
| CONTRIBUTING.md | ✅ Complete | Nov 2025 |

---

## 🔗 External Resources

### Learning Resources
- [Playwright Documentation](https://playwright.dev/)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Redis Documentation](https://redis.io/docs/)

### Best Practices
- [Web Scraping Best Practices](https://www.scrapehero.com/web-scraping-best-practices/)
- [Ethical Web Scraping](https://towardsdatascience.com/ethics-in-web-scraping-b96b18136f01)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## 📝 Contributing to Documentation

### Adding New Documentation

1. Create the document in `/docs/` directory
2. Add entry to this index
3. Follow markdown formatting standards
4. Include code examples where applicable
5. Update "Last Updated" date

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add visual aids (diagrams, tables) where helpful
- Link to related documents
- Keep documents focused on single topics

---

## ❓ Getting Help

### If you're stuck:

1. **Check this index** for relevant documentation
2. **Search existing docs** for your topic
3. **Review code examples** in documentation
4. **Check related documents** using the links
5. **Ask the team** if documentation is unclear

### Improving Documentation

Found an issue or have a suggestion?
- Open an issue describing the problem
- Submit a PR with improvements
- Follow [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Last Updated**: November 16, 2025  
**Maintained by**: ShopWise Team

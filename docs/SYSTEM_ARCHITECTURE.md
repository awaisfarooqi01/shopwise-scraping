# ShopWise Scraping - System Architecture

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Principles](#design-principles)
3. [System Components](#system-components)
4. [Data Flow](#data-flow)
5. [Technology Stack Rationale](#technology-stack-rationale)
6. [Scalability Strategy](#scalability-strategy)
7. [Integration with Backend](#integration-with-backend)
8. [Performance Considerations](#performance-considerations)

---

## Architecture Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SCHEDULER & ORCHESTRATOR                        │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐               │
│  │ Cron Jobs   │  │ Manual Jobs  │  │ Event-Driven  │               │
│  │ (Hourly/    │  │ (On-Demand)  │  │ (Price Change)│               │
│  │  Daily)     │  │              │  │               │               │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘               │
└─────────┼─────────────────┼──────────────────┼────────────────────────┘
          │                 │                  │
          └─────────────────┴──────────────────┘
                            │
                   ┌────────▼────────┐
                   │   BULL QUEUE    │
                   │  (Redis-Backed) │
                   │                 │
                   │ Job Types:      │
                   │ - Product       │
                   │ - Review        │
                   │ - Price History │
                   │ - Category      │
                   └────────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼─────┐      ┌────▼─────┐      ┌────▼─────┐
    │ Worker 1  │      │ Worker 2  │      │ Worker N  │
    │ (Daraz)   │      │(PriceOye) │      │  (Mixed)  │
    └────┬──────┘      └────┬──────┘      └────┬──────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   SCRAPER FACTORY         │
              │  (Platform Selection)     │
              └─────────────┬─────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼──────┐      ┌───▼───────┐     ┌───▼────────┐
    │ Playwright │      │  Cheerio  │     │   Axios    │
    │ Scraper    │      │  Scraper  │     │   Scraper  │
    │ (Dynamic)  │      │ (Static)  │     │   (API)    │
    └────┬───────┘      └────┬──────┘     └────┬───────┘
         │                   │                 │
         └───────────────────┼─────────────────┘
                             │
               ┌─────────────▼─────────────┐
               │    DATA PIPELINE          │
               │                           │
               │  1. Extractor             │
               │  2. Cleaner               │
               │  3. Transformer           │
               │  4. Validator             │
               │  5. Enricher              │
               └─────────────┬─────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
       ┌────▼─────┐    ┌────▼──────┐   ┌────▼─────┐
       │  MongoDB  │    │   Redis   │   │ Backend  │
       │ (Primary) │    │  (Cache)  │   │   API    │
       │  Storage  │    │           │   │ (Notify) │
       └───────────┘    └───────────┘   └──────────┘
```

---

## Design Principles

### 1. **Separation of Concerns**

Each component has a single, well-defined responsibility:

- **Scrapers**: Extract raw data from platforms
- **Pipeline**: Transform and validate data
- **Workers**: Process jobs from queues
- **Storage**: Persist data to database
- **Scheduler**: Coordinate scraping tasks

### 2. **Configuration Over Code**

Platform-specific logic is defined in JSON configuration files, not hardcoded:

```json
{
  "platform_id": "daraz-pk",
  "selectors": {
    "product_name": ".pdp-title",
    "price": ".pdp-price"
  },
  "rate_limiting": {
    "requests_per_minute": 30
  }
}
```

**Benefits**:
- Add new platforms without code changes
- Easy selector updates when sites change
- Non-developers can update configurations
- Version control for scraping rules

### 3. **Fault Tolerance**

The system is designed to handle failures gracefully:

- **Retry Logic**: Exponential backoff with jitter
- **Circuit Breaker**: Auto-disable failing scrapers
- **Graceful Degradation**: Continue with partial data
- **Error Recovery**: Resume from last successful state

### 4. **Scalability First**

Designed for horizontal scalability:

- **Stateless Workers**: Any worker can process any job
- **Queue-Based**: Distribute load across multiple workers
- **Browser Pooling**: Reuse browser instances efficiently
- **Database Sharding**: Ready for MongoDB sharding

### 5. **Observability**

Comprehensive monitoring and debugging:

- **Structured Logging**: Winston with JSON format
- **Metrics**: Success rates, response times, error rates
- **Tracing**: Track jobs through entire pipeline
- **Debug Tools**: Screenshots, HTML dumps, request logs

---

## System Components

### 1. Scheduler & Orchestrator

**Purpose**: Trigger scraping jobs based on schedules or events

**Implementation**:
```javascript
// src/jobs/schedulers/product-scheduler.js
const cron = require('node-cron');

// Scrape Daraz every 6 hours
cron.schedule('0 */6 * * *', async () => {
  await queuePlatformScraping('daraz-pk', 'products');
});

// Scrape price changes hourly
cron.schedule('0 * * * *', async () => {
  await queuePriceUpdates();
});
```

**Features**:
- Cron-based scheduling
- Priority-based job queuing
- Event-driven triggers (e.g., new product added)
- Manual job triggering via API

### 2. Job Queue (Bull)

**Purpose**: Manage scraping jobs with priority, retry, and concurrency control

**Why Bull?**:
- Redis-backed (fast, reliable)
- Built-in retry logic
- Job prioritization
- Delayed jobs support
- Progress tracking
- Worker clustering

**Job Types**:

```javascript
// Product scraping job
{
  type: 'scrape_product',
  data: {
    url: 'https://daraz.pk/product/...',
    platform_id: 'daraz-pk',
    product_id: '507f1f77bcf86cd799439011'
  },
  opts: {
    priority: 1,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
}

// Category scraping job
{
  type: 'scrape_category',
  data: {
    category_url: 'https://daraz.pk/mobiles',
    platform_id: 'daraz-pk',
    max_pages: 10
  },
  opts: {
    priority: 2
  }
}
```

### 3. Workers

**Purpose**: Process jobs from the queue

**Worker Types**:

1. **General Workers**: Process any job type
2. **Specialized Workers**: Handle specific platforms
3. **Heavy Workers**: Run intensive tasks (browser automation)
4. **Light Workers**: Handle simple tasks (API calls)

**Concurrency Control**:

```javascript
// src/jobs/workers/scraping.worker.js
const queue = new Bull('scraping', {
  redis: redisConfig,
  limiter: {
    max: 5,        // Process 5 jobs
    duration: 1000 // per second
  }
});

queue.process('scrape_product', 2, async (job) => {
  // Process with max 2 concurrent jobs
  return await scrapingService.scrapeProduct(job.data);
});
```

### 4. Scraper Factory

**Purpose**: Create appropriate scraper based on platform configuration

**Strategy Pattern**:

```javascript
class ScraperFactory {
  static create(platformId) {
    const config = platformConfigs[platformId];
    
    switch (config.scraping_strategy) {
      case 'browser':
        return new PlaywrightScraper(config);
      case 'static':
        return new CheerioScraper(config);
      case 'api':
        return new ApiScraper(config);
      default:
        return new UniversalScraper(config);
    }
  }
}
```

### 5. Platform Scrapers

**Base Scraper Interface**:

```javascript
class BaseScraper {
  constructor(config) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rate_limiting);
  }

  async scrape(url) {
    // Must be implemented by subclasses
    throw new Error('scrape() must be implemented');
  }

  async extractData(page) {
    // Must be implemented by subclasses
    throw new Error('extractData() must be implemented');
  }

  async validateData(data) {
    // Common validation logic
    return this.validator.validate(data);
  }
}
```

**Scraper Types**:

| Scraper | Use Case | Technology | Performance |
|---------|----------|------------|-------------|
| **PlaywrightScraper** | Dynamic sites (Daraz) | Playwright | Slow, high memory |
| **CheerioScraper** | Static pages | Cheerio + Axios | Fast, low memory |
| **ApiScraper** | JSON endpoints | Axios | Very fast |
| **UniversalScraper** | Adaptive | All of the above | Mixed |

### 6. Data Pipeline

**Purpose**: Clean, transform, validate, and enrich scraped data

**Pipeline Stages**:

```javascript
// src/pipeline/index.js
class DataPipeline {
  constructor() {
    this.stages = [
      new ExtractorStage(),
      new CleanerStage(),
      new TransformerStage(),
      new ValidatorStage(),
      new EnricherStage()
    ];
  }

  async process(rawData, context) {
    let data = rawData;
    
    for (const stage of this.stages) {
      data = await stage.execute(data, context);
      
      if (!data) {
        throw new Error(`Pipeline failed at stage: ${stage.name}`);
      }
    }
    
    return data;
  }
}
```

**Stage Details**:

1. **Extractor**: Extract structured data from raw HTML/JSON
2. **Cleaner**: Remove HTML tags, normalize whitespace, strip unwanted chars
3. **Transformer**: Map platform data to backend schema
4. **Validator**: Validate against Joi schema (backend compatibility)
5. **Enricher**: Add metadata, calculate derived fields

### 7. Storage Layer

**Purpose**: Persist data to MongoDB with conflict resolution

**Repositories**:

```javascript
class ProductRepository {
  async upsert(productData) {
    // Check if product exists
    const existing = await Product.findOne({
      original_url: productData.original_url
    });

    if (existing) {
      // Update existing product
      return await this.updateProduct(existing._id, productData);
    } else {
      // Create new product
      return await Product.create(productData);
    }
  }

  async updatePriceHistory(productId, newPrice) {
    const product = await Product.findById(productId);
    
    // Only create history entry if price changed
    if (product.price !== newPrice) {
      await SaleHistory.create({
        product_id: productId,
        price: newPrice,
        timestamp: new Date()
      });
      
      product.price = newPrice;
      await product.save();
    }
  }
}
```

### 8. Caching Layer

**Purpose**: Reduce database load and improve performance

**Caching Strategy**:

```javascript
// src/services/cache/cache.service.js
class CacheService {
  async get(key) {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key, value, ttl = 3600) {
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  // Cache product data for 1 hour
  async cacheProduct(productId, data) {
    await this.set(`product:${productId}`, data, 3600);
  }

  // Cache platform config for 24 hours
  async cachePlatformConfig(platformId, config) {
    await this.set(`platform:${platformId}`, config, 86400);
  }
}
```

### 9. Anti-Detection System

**Purpose**: Avoid bot detection and IP bans

**Techniques**:

1. **User-Agent Rotation**:
```javascript
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
  // ... more user agents
];

const randomUA = () => userAgents[Math.floor(Math.random() * userAgents.length)];
```

2. **Request Delays**:
```javascript
const delay = () => {
  const min = 1000;  // 1 second
  const max = 3000;  // 3 seconds
  return Math.random() * (max - min) + min;
};

await page.waitForTimeout(delay());
```

3. **Browser Fingerprint Randomization**:
```javascript
await page.evaluateOnNewDocument(() => {
  // Randomize navigator properties
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
  });
  
  // Randomize screen size
  Object.defineProperty(screen, 'width', {
    get: () => 1920 + Math.floor(Math.random() * 200)
  });
});
```

4. **Proxy Rotation** (Optional):
```javascript
const proxy = proxyPool.getNext();

const browser = await playwright.chromium.launch({
  proxy: {
    server: proxy.server,
    username: proxy.username,
    password: proxy.password
  }
});
```

### 10. Monitoring System

**Purpose**: Track system health and performance

**Metrics Collected**:

```javascript
{
  "system": {
    "uptime": "5d 12h 34m",
    "memory_usage": "1.2 GB",
    "cpu_usage": "23%"
  },
  "scraping": {
    "total_jobs": 15420,
    "successful_jobs": 14892,
    "failed_jobs": 528,
    "success_rate": 96.6,
    "average_response_time": 2345
  },
  "platforms": {
    "daraz-pk": {
      "total": 8500,
      "successful": 8234,
      "failed": 266,
      "avg_time_ms": 3200,
      "last_scraped": "2024-11-14T10:30:00Z"
    }
  },
  "queue": {
    "waiting": 45,
    "active": 8,
    "completed": 15372,
    "failed": 528
  }
}
```

---

## Data Flow

### Product Scraping Flow

```
1. Trigger (Cron/Manual/Event)
   ↓
2. Create Job → Add to Queue (Bull)
   ↓
3. Worker picks job
   ↓
4. Scraper Factory creates scraper
   ↓
5. Navigate to URL (Playwright/Cheerio/Axios)
   ↓
6. Extract raw data using selectors
   ↓
7. Data Pipeline:
   a. Extract structured data
   b. Clean text/HTML
   c. Transform to backend schema
   d. Validate against Joi schema
   e. Enrich with metadata
   ↓
8. Check if product exists (by original_url)
   ↓
9. If exists:
     - Update product fields
     - Check price change
     - If price changed:
       ├─ Create SaleHistory entry
       └─ Trigger price alert checks
   Else:
     - Create new product
   ↓
10. Update scraping metrics
   ↓
11. Log success/failure
   ↓
12. Mark job as complete
```

### Review Scraping Flow

```
1. Product scraping completed
   ↓
2. Extract review URLs from product page
   ↓
3. Create review scraping jobs (one per page)
   ↓
4. For each review page:
   a. Scrape reviews
   b. Extract: rating, text, date, verified status
   c. Pipeline: clean, transform, validate
   ↓
5. Check if review exists (by content hash)
   ↓
6. If new:
     - Save review
     - Update product review count
     - Queue for sentiment analysis
   ↓
7. Calculate product average rating
   ↓
8. Update product with new ratings
```

---

## Technology Stack Rationale

### Playwright vs Puppeteer

**Why Playwright is Primary**:

| Feature | Playwright | Puppeteer |
|---------|-----------|-----------|
| Browser Support | Chromium, Firefox, WebKit | Chromium only |
| Auto-wait | Built-in | Manual |
| Network Interception | Advanced | Basic |
| Anti-detection | Better | Moderate |
| Documentation | Excellent | Good |
| Maintenance | Very Active | Active |
| Performance | Slightly slower | Slightly faster |

**Verdict**: Playwright for reliability and anti-detection; Puppeteer as fallback

### Cheerio for Static Pages

**Why not always use browser automation?**:

| Metric | Browser (Playwright) | Cheerio |
|--------|---------------------|---------|
| Speed | 2-5 seconds | 100-300ms |
| Memory | 200-500 MB | 10-50 MB |
| CPU | High | Low |
| Complexity | High | Low |
| Use Case | Dynamic sites | Static sites |

**Verdict**: Use Cheerio when possible for performance; browser for dynamic content

### Bull for Job Queue

**Alternatives Considered**:

- **RabbitMQ**: More complex, overkill for our needs
- **Kafka**: Designed for streaming, not job queues
- **BullMQ**: Newer version, considered but Bull is more stable

**Why Bull**:
- Simple Redis-based setup
- Built-in retry and backoff
- Job prioritization
- Progress tracking
- Good documentation
- Battle-tested in production

### MongoDB Integration

**Why direct DB access instead of API calls?**:

✅ **Benefits**:
- Lower latency (no HTTP overhead)
- Transactional support
- Batch operations
- Easier error handling
- No API rate limits
- Simplified authentication

❌ **Drawbacks**:
- Tight coupling with backend
- Schema changes require coordination
- No API-level validation

**Verdict**: Direct DB access is optimal for this use case

---

## Scalability Strategy

### Vertical Scaling (Single Machine)

**Optimization Techniques**:

1. **Browser Pooling**:
```javascript
class BrowserPool {
  constructor(size = 3) {
    this.pool = [];
    this.size = size;
  }

  async acquire() {
    if (this.pool.length === 0) {
      return await this.createBrowser();
    }
    return this.pool.pop();
  }

  async release(browser) {
    if (this.pool.length < this.size) {
      this.pool.push(browser);
    } else {
      await browser.close();
    }
  }
}
```

2. **Connection Pooling**:
```javascript
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2
});
```

3. **Memory Management**:
```javascript
// Close pages after use
await page.close();

// Limit concurrent pages
const MAX_PAGES = 5;
```

### Horizontal Scaling (Multiple Machines)

**Worker Distribution**:

```
Machine 1: 4 workers → Daraz scraping
Machine 2: 4 workers → PriceOye + Telemart
Machine 3: 4 workers → Reviews + Price updates
Machine 4: 2 workers → On-demand scraping
```

**Shared Infrastructure**:
- MongoDB: Single cluster (with replication)
- Redis: Single instance (with persistence)
- Queue: All workers connect to same Redis queue

**Auto-scaling** (Future):
```yaml
# Kubernetes HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: scraping-worker
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: scraping-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Integration with Backend

### Database Schema Alignment

**Product Model Mapping**:

```javascript
// Scraper output → Backend Product schema
{
  // Required fields
  "platform_id": ObjectId,          // From platform config
  "name": String,                   // Extracted from selector
  "price": Number,                  // Parsed from text
  "original_url": String,           // Source URL
  
  // Optional fields
  "brand": String,
  "category_id": ObjectId,          // Mapped from category name
  "description": String,
  "specifications": Map<String>,
  "media": {
    "images": [{ url, type, alt_text }],
    "videos": [{ url, thumbnail }]
  },
  
  // Auto-calculated
  "average_rating": Number,         // From reviews
  "review_count": Number,
  "positive_percent": Number,
  
  // Metadata
  "is_active": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}
```

### Platform Synchronization

**Ensure platform consistency**:

```javascript
// Before scraping, verify platform exists in backend DB
async function ensurePlatform(platformId) {
  let platform = await Platform.findOne({ name: platformId });
  
  if (!platform) {
    // Create platform if missing
    platform = await Platform.create({
      name: platformId,
      domain: platformConfig.domain,
      base_url: platformConfig.base_url,
      is_active: true
    });
  }
  
  return platform._id;
}
```

### Category Mapping

**Map platform categories to backend categories**:

```javascript
// src/utils/category-mapper.js
const categoryMappings = {
  'daraz-pk': {
    'mobiles-tablets': {
      backend_category: 'Electronics',
      backend_subcategory: 'Mobile Phones'
    },
    'laptops': {
      backend_category: 'Electronics',
      backend_subcategory: 'Laptops'
    }
  }
};

function mapCategory(platform, categoryPath) {
  const mapping = categoryMappings[platform][categoryPath];
  return {
    category_name: mapping.backend_category,
    subcategory_name: mapping.backend_subcategory
  };
}
```

---

## Performance Considerations

### Target Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Products/minute | 50-100 | 100+ |
| Memory per worker | <500 MB | <1 GB |
| CPU utilization | 20-40% | <60% |
| Success rate | >95% | >90% |
| Error rate | <5% | <10% |
| Response time | 2-4s | <10s |

### Optimization Techniques

1. **Lazy Loading**: Don't scrape reviews unless explicitly requested
2. **Batch Operations**: Insert 100 products at once
3. **Selective Scraping**: Only scrape changed data
4. **Smart Scheduling**: Scrape high-traffic products more frequently

### Bottleneck Analysis

```
Component          | Bottleneck  | Solution
-------------------|-------------|-------------------
Browser Launch     | Slow        | Browser pooling
Network Requests   | Latency     | Concurrent requests
HTML Parsing       | CPU         | Use Cheerio when possible
Database Writes    | I/O         | Batch inserts
Image Downloads    | Bandwidth   | Skip or lazy load
```

---

## Conclusion

This architecture provides:

✅ **Scalability**: Horizontal and vertical scaling  
✅ **Reliability**: Fault-tolerant with retries  
✅ **Maintainability**: Clean separation of concerns  
✅ **Performance**: Optimized for throughput  
✅ **Extensibility**: Easy to add new platforms  
✅ **Observability**: Comprehensive monitoring  

The system is production-ready and designed to handle Pakistan's top e-commerce platforms at scale.

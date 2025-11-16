# Scraping Guidelines & Best Practices

## Table of Contents

1. [Ethical Scraping](#ethical-scraping)
2. [Legal Considerations](#legal-considerations)
3. [Technical Best Practices](#technical-best-practices)
4. [Anti-Bot Evasion](#anti-bot-evasion)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling](#error-handling)
7. [Data Quality](#data-quality)
8. [Performance Optimization](#performance-optimization)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Platform-Specific Guidelines](#platform-specific-guidelines)

---

## Ethical Scraping

### Be a Good Citizen

1. **Don't overwhelm servers**: Implement rate limiting (30-60 requests/minute)
2. **Scrape during off-peak hours**: Avoid peak traffic times (2 AM - 6 AM PKT)
3. **Use caching**: Don't re-scrape unchanged data
4. **Respect bans**: If blocked, stop scraping and increase delays
5. **Monitor impact**: Track server response times and adjust accordingly

### User-Agent Policy

Use honest, identifiable User-Agent strings:

```javascript
// ✅ GOOD: Honest and identifiable
const userAgent = 'ShopWise/1.0 (+https://shopwise.pk/bot)';

// ❌ BAD: Deceptive or generic
const userAgent = 'Mozilla/5.0...'; // Pretending to be a browser
```

---

## Legal Considerations

### What to Scrape

✅ **Allowed**:
- Publicly available data (product names, prices, descriptions)
- Published reviews and ratings
- Public product images (with proper attribution)
- Non-copyrighted content

❌ **Prohibited**:
- Personal user data (emails, phone numbers)
- Password-protected content
- Copyrighted material (without permission)
- Data behind authentication
- Payment information

### Platform Research

Before scraping any platform:

1. **Read Terms of Service**: Understand any restrictions
2. **Look for API**: Check if official API exists (use if available)
3. **Document compliance**: Keep records of research
4. **Test responsibly**: Use test URLs during development

### Data Storage Compliance

```javascript
// ✅ GOOD: Store only necessary public data
const product = {
  name: 'iPhone 15',
  price: 489999,
  url: 'https://daraz.pk/...',
  platform: 'daraz-pk'
};

// ❌ BAD: Store personal/sensitive data
const product = {
  seller_email: 'seller@email.com',  // Personal data
  seller_phone: '+923001234567',     // Personal data
  internal_cost: 400000              // Proprietary data
};
```

---

## Technical Best Practices

### Selector Strategy

#### Use Robust Selectors

```javascript
// ✅ GOOD: Semantic, stable selectors
const selectors = {
  price: '[data-price], .product-price, .price-current',
  name: '[data-product-title], h1.product-name, .product-title'
};

// ❌ BAD: Brittle, position-dependent selectors
const selectors = {
  price: 'div > div > div:nth-child(3) > span',
  name: 'body > div:first-child > h1'
};
```

#### Fallback Selectors

```javascript
async function extractPrice(page) {
  const selectors = [
    '.pdp-price',           // Primary
    '[data-price]',          // Secondary
    '.price-current',        // Tertiary
    'span[class*="price"]'   // Wildcard fallback
  ];
  
  for (const selector of selectors) {
    try {
      const price = await page.$eval(selector, el => el.textContent);
      if (price) return price;
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Could not find price with any selector');
}
```

### Wait Strategies

```javascript
// ✅ GOOD: Wait for specific conditions
await page.waitForSelector('.product-container', { 
  state: 'visible',
  timeout: 30000 
});

await page.waitForLoadState('networkidle');

// Wait for custom condition
await page.waitForFunction(() => {
  return document.querySelector('.price')?.textContent?.length > 0;
});

// ❌ BAD: Arbitrary delays
await page.waitForTimeout(5000); // Hard to maintain
```

### Dynamic Content Handling

```javascript
// Handle lazy-loaded images
async function loadAllImages(page) {
  await page.evaluate(() => {
    // Scroll to bottom to trigger lazy loading
    window.scrollTo(0, document.body.scrollHeight);
  });
  
  await page.waitForTimeout(2000); // Wait for images to load
  
  // Verify images loaded
  const imagesLoaded = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.every(img => img.complete && img.naturalHeight > 0);
  });
  
  return imagesLoaded;
}

// Handle infinite scroll
async function scrapeInfiniteScroll(page, maxScrolls = 10) {
  const products = [];
  let previousHeight = 0;
  let scrollCount = 0;
  
  while (scrollCount < maxScrolls) {
    // Extract current products
    const newProducts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product-item'))
        .map(item => ({
          name: item.querySelector('.name')?.textContent,
          url: item.querySelector('a')?.href
        }));
    });
    
    products.push(...newProducts);
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    
    // Check if page height changed
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) {
      break; // Reached end
    }
    
    previousHeight = currentHeight;
    scrollCount++;
  }
  
  return products;
}
```

---

## Anti-Bot Evasion

### Browser Fingerprinting

```javascript
async function launchStealthBrowser() {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  });
  
  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezone: 'Asia/Karachi'
  });
  
  // Remove automation indicators
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    
    // Randomize plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
    
    // Mock languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en', 'ur']
    });
  });
  
  return { browser, context };
}
```

### User-Agent Rotation

```javascript
const userAgents = [
  // Windows Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // macOS Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  
  // Linux Firefox
  'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
  
  // Mobile Chrome
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}
```

### Request Headers

```javascript
async function setRealisticHeaders(page) {
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ur;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  });
}
```

### Human-like Behavior

```javascript
async function humanLikeInteraction(page) {
  // Random mouse movements
  await page.mouse.move(
    Math.random() * 1000,
    Math.random() * 800
  );
  
  // Random scrolling
  const scrollAmount = Math.random() * 500 + 200;
  await page.evaluate((amount) => {
    window.scrollBy(0, amount);
  }, scrollAmount);
  
  // Random delays
  const delay = Math.random() * 2000 + 1000;
  await page.waitForTimeout(delay);
  
  // Hover over elements
  const element = await page.$('.product-item');
  if (element) {
    await element.hover();
    await page.waitForTimeout(500);
  }
}
```

### Cookie Management

```javascript
class CookieManager {
  constructor() {
    this.cookies = new Map();
  }

  async saveCookies(platform, cookies) {
    this.cookies.set(platform, cookies);
    // Optionally persist to file/database
  }

  async loadCookies(platform) {
    return this.cookies.get(platform) || [];
  }

  async setCookies(page, platform) {
    const cookies = await this.loadCookies(platform);
    if (cookies.length > 0) {
      await page.context().addCookies(cookies);
    }
  }
}
```

---

## Rate Limiting

### Implementation Strategies

#### 1. Token Bucket Algorithm

```javascript
class RateLimiter {
  constructor(capacity, refillRate) {
    this.capacity = capacity;      // Max tokens
    this.tokens = capacity;         // Current tokens
    this.refillRate = refillRate;   // Tokens per second
    this.lastRefill = Date.now();
  }

  async waitForToken() {
    while (this.tokens < 1) {
      await this.refill();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.tokens--;
  }

  async refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Usage
const limiter = new RateLimiter(10, 1); // 10 capacity, 1 token/sec

async function scrape(url) {
  await limiter.waitForToken();
  return await scraper.scrape(url);
}
```

#### 2. Platform-Specific Limits

```javascript
const platformLimits = {
  'daraz-pk': {
    requestsPerMinute: 30,
    minDelay: 1500,
    maxDelay: 3000
  },
  'priceoye': {
    requestsPerMinute: 40,
    minDelay: 1000,
    maxDelay: 2000
  }
};

class PlatformRateLimiter {
  constructor(platform) {
    const config = platformLimits[platform];
    this.minDelay = config.minDelay;
    this.maxDelay = config.maxDelay;
    this.requestsPerMinute = config.requestsPerMinute;
    this.requestTimes = [];
  }

  async waitIfNeeded() {
    // Remove requests older than 1 minute
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(
      time => now - time < 60000
    );

    // If at limit, wait
    if (this.requestTimes.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 60000 - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Random delay within range
    const delay = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));

    this.requestTimes.push(Date.now());
  }
}
```

### Respect Platform Limits

```javascript
// Check platform's rate limit headers
async function checkRateLimit(response) {
  const remaining = response.headers['x-ratelimit-remaining'];
  const reset = response.headers['x-ratelimit-reset'];
  
  if (remaining && parseInt(remaining) < 5) {
    const resetTime = new Date(parseInt(reset) * 1000);
    const waitTime = resetTime - new Date();
    
    logger.warn(`Rate limit almost exceeded. Waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}
```

---

## Error Handling

### Error Types

```javascript
class ScrapingError extends Error {
  constructor(message, { cause, url, platform } = {}) {
    super(message);
    this.name = 'ScrapingError';
    this.cause = cause;
    this.url = url;
    this.platform = platform;
    this.timestamp = new Date();
  }
}

class NetworkError extends ScrapingError {
  constructor(message, options) {
    super(message, options);
    this.name = 'NetworkError';
    this.retryable = true;
  }
}

class ParsingError extends ScrapingError {
  constructor(message, options) {
    super(message, options);
    this.name = 'ParsingError';
    this.retryable = false;
  }
}

class BlockedError extends ScrapingError {
  constructor(message, options) {
    super(message, options);
    this.name = 'BlockedError';
    this.retryable = true;
  }
}
```

### Retry Logic

```javascript
async function retryWithBackoff(
  fn,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000
) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry non-retryable errors
      if (error.retryable === false) {
        throw error;
      }
      
      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );
      const jitter = Math.random() * 1000;
      const delay = exponentialDelay + jitter;
      
      logger.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms`, {
        error: error.message,
        attempt: attempt + 1,
        maxRetries
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage
const data = await retryWithBackoff(
  () => scraper.scrape(url),
  3,    // Max 3 retries
  2000  // Start with 2s delay
);
```

### Circuit Breaker

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      
      logger.error(`Circuit breaker OPEN. Will retry after ${this.timeout}ms`);
    }
  }
}

// Usage
const breaker = new CircuitBreaker(5, 60000);

async function scrapeWithBreaker(url) {
  return await breaker.execute(() => scraper.scrape(url));
}
```

---

## Data Quality

### Data Validation

```javascript
const Joi = require('joi');

const productSchema = Joi.object({
  platform_id: Joi.string().required(),
  name: Joi.string().min(3).max(500).required(),
  price: Joi.number().positive().required(),
  original_url: Joi.string().uri().required(),
  brand: Joi.string().allow('', null),
  description: Joi.string().max(5000),
  images: Joi.array().items(Joi.string().uri()),
  rating: Joi.number().min(0).max(5),
  review_count: Joi.number().integer().min(0)
});

async function validateProduct(data) {
  try {
    const validated = await productSchema.validateAsync(data, {
      abortEarly: false,
      stripUnknown: true
    });
    return { valid: true, data: validated };
  } catch (error) {
    logger.error('Validation failed', {
      errors: error.details.map(d => d.message)
    });
    return { valid: false, errors: error.details };
  }
}
```

### Data Cleaning

```javascript
class DataCleaner {
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '')           // Remove HTML tags
      .replace(/&nbsp;/g, ' ')           // Replace &nbsp;
      .replace(/&amp;/g, '&')            // Decode &amp;
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .trim();
  }

  parsePrice(priceText) {
    if (!priceText) return 0;
    
    // Remove currency symbols and text
    const cleaned = priceText
      .replace(/[^0-9.,]/g, '')
      .replace(/,/g, '');
    
    const price = parseFloat(cleaned);
    
    return isNaN(price) ? 0 : price;
  }

  normalizeUrl(url, baseUrl) {
    // Handle relative URLs
    if (url.startsWith('/')) {
      return new URL(url, baseUrl).href;
    }
    
    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    
    return url;
  }

  extractImageUrl(imgSrc) {
    // Remove image size parameters
    return imgSrc.replace(/_([\d]+x[\d]+)\.(jpg|png|webp)/i, '.$2');
  }
}
```

### Data Enrichment

```javascript
async function enrichProduct(product) {
  // Calculate sale percentage if both prices exist
  if (product.sale_price && product.price) {
    product.sale_percentage = Math.round(
      ((product.price - product.sale_price) / product.price) * 100
    );
  }

  // Determine availability based on stock text
  if (product.stock_text) {
    if (/out of stock|unavailable/i.test(product.stock_text)) {
      product.availability = 'out_of_stock';
    } else if (/limited|few left/i.test(product.stock_text)) {
      product.availability = 'limited';
    } else {
      product.availability = 'in_stock';
    }
  }

  // Extract brand from name if not present
  if (!product.brand && product.name) {
    const brands = ['Samsung', 'Apple', 'Xiaomi', 'Huawei', 'OnePlus'];
    for (const brand of brands) {
      if (product.name.includes(brand)) {
        product.brand = brand;
        break;
      }
    }
  }

  return product;
}
```

---

## Performance Optimization

### Browser Resource Management

```javascript
async function optimizeBrowser(page) {
  // Block unnecessary resources
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });
  
  // Disable JavaScript if not needed
  await page.setJavaScriptEnabled(false);
  
  // Set cache
  await page.context().route('**/*', (route) => {
    route.continue({
      headers: {
        ...route.request().headers(),
        'Cache-Control': 'max-age=3600'
      }
    });
  });
}
```

### Concurrent Scraping

```javascript
const pLimit = require('p-limit');

async function scrapeMultipleProducts(urls, concurrency = 3) {
  const limit = pLimit(concurrency);
  
  const results = await Promise.allSettled(
    urls.map(url => limit(() => scraper.scrape(url)))
  );
  
  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
    
  const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);
  
  logger.info(`Scraped ${successful.length}/${urls.length} products`);
  
  return { successful, failed };
}
```

### Caching Strategy

```javascript
const cache = new Map();

async function scrapeWithCache(url, ttl = 3600000) {
  // Check cache
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < ttl) {
    logger.debug('Cache hit', { url });
    return cached.data;
  }
  
  // Scrape if not cached
  const data = await scraper.scrape(url);
  
  // Store in cache
  cache.set(url, {
    data,
    timestamp: Date.now()
  });
  
  return data;
}
```

---

## Monitoring & Maintenance

### Health Checks

```javascript
async function healthCheck() {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    services: {}
  };
  
  // Check database
  try {
    await mongoose.connection.db.admin().ping();
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'unhealthy';
  }
  
  // Check Redis
  try {
    await redis.ping();
    health.services.redis = 'connected';
  } catch (error) {
    health.services.redis = 'disconnected';
    health.status = 'unhealthy';
  }
  
  // Check browser pool
  health.services.browserPool = browserPool.available > 0 ? 'ready' : 'exhausted';
  
  return health;
}
```

### Selector Monitoring

```javascript
async function validateSelectors(platform, url) {
  const config = platformConfigs[platform];
  const page = await browser.newPage();
  
  await page.goto(url);
  
  const results = {};
  
  for (const [field, selector] of Object.entries(config.selectors)) {
    try {
      const element = await page.$(selector.selector);
      results[field] = {
        found: !!element,
        selector: selector.selector
      };
    } catch (error) {
      results[field] = {
        found: false,
        selector: selector.selector,
        error: error.message
      };
    }
  }
  
  await page.close();
  
  return results;
}
```

---

## Platform-Specific Guidelines

### Daraz.pk

- **Rate Limit**: 30 requests/minute
- **Anti-Bot**: High (requires browser automation)
- **Captcha**: Yes (occasionally)
- **Dynamic Content**: Yes (React-based)
- **Best Time**: 2 AM - 6 AM PKT

### PriceOye

- **Rate Limit**: 40 requests/minute
- **Anti-Bot**: Moderate
- **Dynamic Content**: Partially
- **Best Strategy**: Cheerio for listings, Playwright for details

### Telemart

- **Rate Limit**: 45 requests/minute
- **Anti-Bot**: Low
- **Dynamic Content**: No
- **Best Strategy**: Cheerio (fastest)

---

## Summary Checklist

- [ ] Implement rate limiting (30-60 req/min)
- [ ] Use delays between requests (1-3 seconds)
- [ ] Handle errors gracefully
- [ ] Implement retries with backoff
- [ ] Validate scraped data
- [ ] Clean and normalize data
- [ ] Monitor selector health
- [ ] Log all operations
- [ ] Optimize browser usage
- [ ] Implement caching
- [ ] Test thoroughly
- [ ] Document platform quirks
- [ ] Respect server load
- [ ] Monitor impact on platforms

---

**Remember**: Responsible scraping benefits everyone. Scrape thoughtfully! 🤝

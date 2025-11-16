# Platform Reference Data

> E-commerce platforms supported by the scraping service

This document lists all supported platforms and their basic information for scraper configuration.

---

## 🏪 Supported Platforms

### 1. PriceOye (Priority Platform)

```javascript
{
  name: "PriceOye",
  domain: "priceoye.pk",
  base_url: "https://priceoye.pk",
  logo_url: "https://static.priceoye.pk/logo.svg",
  scraping_config: {
    selectors: {
      // To be defined by scraper implementation
    },
    rate_limit: 60,  // 60 requests per minute
    last_scraped: null
  }
}
```

**Focus Areas:**
- Mobile phones (primary)
- Laptops and computers
- Electronics and accessories

**URL Patterns:**
- Product listing: `https://priceoye.pk/mobiles`
- Product detail: `https://priceoye.pk/mobiles/samsung-galaxy-s23-ultra`
- Search: `https://priceoye.pk/search?q={query}`

---

### 2. Daraz

```javascript
{
  name: "Daraz",
  domain: "daraz.pk",
  base_url: "https://www.daraz.pk",
  logo_url: "https://img.alicdn.com/tfs/TB1vLMOgfDH8KJjy1XcXXcpdXXa-550-140.png",
  scraping_config: {
    selectors: {
      // To be defined by scraper implementation
    },
    rate_limit: 30,  // 30 requests per minute (more aggressive anti-bot)
    last_scraped: null
  }
}
```

**Focus Areas:**
- Wide variety of products
- Fashion and apparel
- Electronics
- Home and living

**URL Patterns:**
- Product listing: `https://www.daraz.pk/catalog/?q={query}`
- Product detail: `https://www.daraz.pk/products/product-name-i{id}.html`
- Category: `https://www.daraz.pk/smartphones/`

---

### 3. Telemart

```javascript
{
  name: "Telemart",
  domain: "telemart.pk",
  base_url: "https://www.telemart.pk",
  logo_url: "https://www.telemart.pk/images/logo.svg",
  scraping_config: {
    selectors: {
      // To be defined by scraper implementation
    },
    rate_limit: 45,  // 45 requests per minute
    last_scraped: null
  }
}
```

**Focus Areas:**
- Mobile phones
- Electronics
- Appliances
- Computing

**URL Patterns:**
- Product listing: `https://www.telemart.pk/mobile-phones`
- Product detail: `https://www.telemart.pk/product/product-name`
- Search: `https://www.telemart.pk/search?query={query}`

---

### 4. Homeshopping

```javascript
{
  name: "Homeshopping",
  domain: "homeshopping.pk",
  base_url: "https://www.homeshopping.pk",
  logo_url: "https://www.homeshopping.pk/assets/images/logo.png",
  scraping_config: {
    selectors: {
      // To be defined by scraper implementation
    },
    rate_limit: 50,  // 50 requests per minute
    last_scraped: null
  }
}
```

**Focus Areas:**
- Home appliances
- Electronics
- Fashion
- Health and beauty

**URL Patterns:**
- Product listing: `https://www.homeshopping.pk/categories/{category-name}`
- Product detail: `https://www.homeshopping.pk/{category}/{product-slug}.html`
- Search: `https://www.homeshopping.pk/search?q={query}`

---

### 5. Goto

```javascript
{
  name: "Goto",
  domain: "goto.com.pk",
  base_url: "https://www.goto.com.pk",
  logo_url: "https://www.goto.com.pk/images/logo.svg",
  scraping_config: {
    selectors: {
      // To be defined by scraper implementation
    },
    rate_limit: 40,  // 40 requests per minute
    last_scraped: null
  }
}
```

**Focus Areas:**
- Electronics
- Mobile phones
- Computing
- Accessories

**URL Patterns:**
- Product listing: `https://www.goto.com.pk/category/{category-name}`
- Product detail: `https://www.goto.com.pk/product/{product-name}`
- Search: `https://www.goto.com.pk/search.php?search_query={query}`

---

## 🎯 Platform Priority Order

1. **PriceOye** (Phase 2) - Start here
2. **Daraz** (Phase 4)
3. **Telemart** (Phase 4)
4. **Homeshopping** (Phase 4)
5. **Goto** (Phase 4)

---

## ⚙️ Rate Limiting Guidelines

### Respect Platform Limits

Each platform has different anti-bot measures and server capacity. Follow these rate limits:

| Platform | Rate Limit (req/min) | Recommended Delay | Notes |
|----------|---------------------|-------------------|-------|
| PriceOye | 60 | 1s between requests | Lenient, good for testing |
| Daraz | 30 | 2s between requests | Strict anti-bot, use caution |
| Telemart | 45 | 1.5s between requests | Moderate protection |
| Homeshopping | 50 | 1.2s between requests | Relatively lenient |
| Goto | 40 | 1.5s between requests | Moderate protection |

### Implementation Example

```javascript
// Rate limiter helper
class RateLimiter {
  constructor(requestsPerMinute) {
    this.delay = 60000 / requestsPerMinute; // ms between requests
    this.lastRequest = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.delay) {
      const waitTime = this.delay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }
}

// Usage
const limiter = new RateLimiter(60); // 60 requests per minute
await limiter.throttle();
// Make request
```

---

## 🔍 Scraper Detection & Prevention

### Common Anti-Bot Measures by Platform

#### PriceOye
- Basic user-agent checking
- Cloudflare protection
- Rate limiting

**Recommendations:**
- Use realistic user agents
- Respect rate limits
- Add random delays

#### Daraz
- Advanced bot detection (Alibaba Cloud)
- Browser fingerprinting
- CAPTCHA challenges
- IP blocking

**Recommendations:**
- Use stealth browser automation
- Rotate user agents
- Use proxies if needed
- Implement CAPTCHA solving (if ethical)

#### Telemart, Homeshopping, Goto
- Moderate protection
- Basic rate limiting
- User-agent checking

**Recommendations:**
- Standard stealth measures
- Respect rate limits
- Random delays

---

## 📝 Platform-Specific Notes

### PriceOye
- Clean HTML structure, easy to parse
- Consistent product page layouts
- Good for initial development and testing
- Reviews may be limited or absent
- Focus on electronics, especially mobile phones

### Daraz
- Dynamic content loading (React-based)
- Requires browser automation
- Large product catalog
- Many reviews available
- Complex page structure
- Frequent layout changes

### Telemart
- Server-side rendered pages
- Moderate complexity
- Good product specifications
- Regular price updates

### Homeshopping
- Traditional e-commerce structure
- Easy to scrape product data
- Variable product availability
- Sales and promotions frequent

### Goto
- Similar to Telemart
- Good electronics selection
- Regular price updates
- Moderate complexity

---

## 🚨 Important Reminders

1. **Legal Compliance**: Review each platform's Terms of Service
2. **Respectful Crawling**: Always respect robots.txt and rate limits
3. **Data Privacy**: Don't scrape personal information
4. **Attribution**: Maintain original_url to credit the platform
5. **Updates**: Platform structures change; maintain selector versions

---

## 🔗 Related Documentation

- See `SCRAPING_GUIDELINES.md` for best practices
- See `DATABASE_SCHEMA.md` for data structure
- See individual scraper configs in `src/scrapers/platforms/`

---

**Last Updated**: November 16, 2025  
**Version**: 1.0

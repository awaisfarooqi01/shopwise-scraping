# ShopWise Scraping Service

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Intelligent web scraping service for extracting product data from Pakistani e-commerce platforms.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Platform Configuration](#platform-configuration)
- [Development](#development)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)

## 🎯 Overview

ShopWise Scraping Service is a Node.js-based web scraping system designed to extract product information, prices, reviews, and seller data from Pakistani e-commerce platforms. It uses a universal scraping engine with JSON-based configuration, making it easy to add new platforms without code changes.

## ✨ Features

- **Universal Scraper Engine**: Configuration-driven scraping for easy platform addition
- **Multi-Strategy Support**: Static HTML, JavaScript-rendered, and API-based scraping
- **Browser Automation**: Playwright and Puppeteer for dynamic content
- **Anti-Detection**: Proxy rotation, user-agent randomization, stealth plugins
- **Queue-Based Processing**: Bull queues for distributed and scalable scraping
- **Automatic Retry**: Exponential backoff retry logic
- **Rate Limiting**: Respectful crawling with configurable rate limits
- **Circuit Breaker**: Automatic suspension of failing scrapers
- **Data Validation**: Schema-based validation of scraped data
- **Monitoring & Metrics**: Real-time scraping health monitoring
- **Debug Tools**: Screenshot capture and HTML dumps for troubleshooting

## 🛠️ Tech Stack

- **Runtime**: Node.js 18 LTS
- **Browser Automation**: Playwright (primary), Puppeteer (fallback)
- **HTML Parsing**: Cheerio
- **HTTP Client**: Axios
- **Queue Management**: Bull (Redis-based)
- **Database**: MongoDB (shared with backend)
- **Cache**: Redis
- **Testing**: Jest
- **Logging**: Winston

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis >= 6.0
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/shopwise-scraping.git
   cd shopwise-scraping
   ```

2. **Install dependencies**
   ```bash
   npm install
   
   # Install Playwright browsers
   npx playwright install chromium
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=4000
   SERVICE_NAME=shopwise-scraping
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/shopwise
   REDIS_URL=redis://localhost:6379
   
   # Browser
   HEADLESS=true
   BROWSER_TIMEOUT=30000
   MAX_CONCURRENT_PAGES=5
   
   # Proxy (optional)
   USE_PROXY=false
   PROXY_URL=
   PROXY_USERNAME=
   PROXY_PASSWORD=
   
   # Scraping
   MAX_RETRIES=3
   RETRY_DELAY=2000
   RATE_LIMIT_REQUESTS_PER_MIN=20
   
   # Monitoring
   ENABLE_SCREENSHOTS=true
   ENABLE_HTML_DUMPS=false
   ```

4. **Start MongoDB and Redis**
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d
   
   # Or start manually
   mongod
   redis-server
   ```

5. **Start the scraping service**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
src/
├── scrapers/
│   ├── universal/       # Universal scraper engine
│   ├── platforms/       # Platform-specific scrapers
│   ├── extractors/      # Data extraction utilities
│   └── factory/         # Scraper factory
├── browser/             # Browser management
├── proxy/               # Proxy rotation
├── anti-detection/      # Anti-bot measures
├── config/
│   └── platforms/       # Platform JSON configs
├── jobs/                # Scraping jobs & queues
├── validators/          # Data validation
├── parsers/             # Data parsing utilities
├── storage/             # Data storage layer
└── utils/               # Utility functions
```

For detailed structure, see [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)

## 🔧 Platform Configuration

### Adding a New Platform

1. **Create configuration file** in `src/config/platforms/`

Example `daraz-pk.json`:
```json
{
  "platform_id": "daraz-pk",
  "name": "Daraz Pakistan",
  "base_url": "https://www.daraz.pk",
  "requires_javascript": true,
  "anti_bot_protection": "advanced",
  
  "rate_limiting": {
    "requests_per_minute": 20,
    "min_delay_ms": 2000,
    "max_delay_ms": 5000
  },
  
  "scraping_strategy": "browser",
  
  "navigation": {
    "wait_for_selector": ".pdp-block_pdp-block",
    "wait_timeout": 30000,
    "scroll_to_load": true
  },
  
  "selectors": {
    "product_name": {
      "selector": ".pdp-mod-product-badge-title",
      "type": "text",
      "required": true
    },
    "price": {
      "selector": ".pdp-price_color_orange",
      "type": "text",
      "required": true,
      "parser": "price"
    },
    "images": {
      "selector": ".pdp-mod-common-image img",
      "type": "attribute",
      "attribute": "src",
      "multiple": true
    }
  }
}
```

2. **Test the configuration**
   ```bash
   npm run test:scraper -- daraz-pk https://www.daraz.pk/products/sample-product.html
   ```

3. **Validate selectors**
   ```bash
   npm run validate:config -- daraz-pk
   ```

### Supported Platforms

- ✅ Daraz.pk
- ✅ PriceOye
- ✅ Telemart
- ✅ HomeShopping
- 🔄 More platforms can be added via configuration

## 💻 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test

# Test specific platform scraper
npm run test:scraper -- <platform-id> <url>

# Validate platform configuration
npm run validate:config -- <platform-id>

# Update selectors for a platform
npm run update:selectors -- <platform-id>

# Benchmark scraper performance
npm run benchmark

# Export scraped data
npm run export -- --platform daraz --format json
```

### Scraping Workflow

```
Job Creation → Queue → Worker → Scraper → Extractor → Validator → Storage
```

### Manual Scraping

```javascript
const { ScraperFactory } = require('./src/scrapers/factory');

async function scrapeProduct(url) {
  const scraper = ScraperFactory.create('daraz-pk');
  const data = await scraper.scrape(url);
  console.log(data);
}

scrapeProduct('https://www.daraz.pk/products/...');
```

### Queue-Based Scraping

```javascript
const { addScrapingJob } = require('./src/jobs/queues/scraping.queue');

// Add to queue
await addScrapingJob(
  'https://www.daraz.pk/products/...',
  'daraz-pk',
  1 // priority (higher = first)
);
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Test scraper with real HTML
npm test -- scrapers/universal
```

### Test Structure

```
tests/
├── unit/
│   ├── scrapers/
│   ├── extractors/
│   └── parsers/
├── integration/
│   └── scrapers/
└── fixtures/
    ├── html/            # Sample HTML files
    └── data/            # Mock data
```

### Testing Best Practices

- Save real HTML samples in `tests/fixtures/html/`
- Test edge cases (missing data, malformed HTML)
- Mock browser calls in unit tests
- Validate data extraction accuracy

## 📊 Monitoring

### Scraping Metrics

Access metrics at: `http://localhost:4000/metrics`

Example metrics:
```json
{
  "totalScrapes": 1000,
  "successfulScrapes": 950,
  "failedScrapes": 50,
  "successRate": 95.0,
  "averageResponseTime": 2500,
  "platformMetrics": {
    "daraz-pk": {
      "total": 500,
      "successful": 480,
      "failed": 20
    }
  }
}
```

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "queue": "running"
  },
  "activeJobs": 5
}
```

### Logging

Logs are stored in:
- `logs/scraping/` - Scraping operation logs
- `logs/errors/` - Error logs
- `logs/combined.log` - All logs

View real-time logs:
```bash
tail -f logs/scraping/scraping.log
```

## 🛡️ Best Practices

### Performance

1. **Browser pooling** - Reuse browser instances
2. **Parallel scraping** - Within rate limits
3. **Caching** - Cache frequently accessed data
4. **Queue-based** - Distribute load across workers

### Reliability

1. **Retry logic** - Exponential backoff
2. **Circuit breaker** - Stop failing scrapers
3. **Error monitoring** - Alert on failures
4. **Data validation** - Ensure data quality

For comprehensive guidelines, see [BEST_PRACTICES.md](BEST_PRACTICES.md)

## 🐛 Debugging

### Enable Debug Mode

```env
ENABLE_SCREENSHOTS=true
ENABLE_HTML_DUMPS=true
HEADLESS=false
```

### Debug Screenshots

Screenshots are saved to `data/screenshots/` on errors:
```
data/screenshots/
├── daraz-pk_2024-10-04_12-30-45.png
└── priceoye_2024-10-04_12-35-10.png
```

### HTML Dumps

HTML dumps are saved to `data/html-dumps/`:
```
data/html-dumps/
├── daraz-pk_2024-10-04_12-30-45.html
└── priceoye_2024-10-04_12-35-10.html
```

### Troubleshooting

Common issues and solutions in [docs/troubleshooting.md](docs/troubleshooting.md)

## 📈 Scaling

### Horizontal Scaling

Run multiple worker instances:

```bash
# Worker 1
npm run worker

# Worker 2
npm run worker

# Worker 3
npm run worker
```

All workers will process jobs from the same Redis queue.

### Distributed Scraping

Use different worker pools for different platforms:

```bash
# Daraz workers
PLATFORMS=daraz-pk npm run worker

# PriceOye workers
PLATFORMS=priceoye npm run worker
```

## 🔐 Security

- Never commit `.env` files
- Use environment variables for secrets
- Rotate proxy credentials regularly
- Monitor for IP bans
- Sanitize all scraped data before storage

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Follow the code style guidelines
4. Add tests for new features
5. Update documentation
6. Submit a pull request

### Adding New Platform

See [docs/adding-new-platform.md](docs/adding-new-platform.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Playwright team
- Cheerio library
- Bull queue system
- Pakistani e-commerce platforms for providing public data

---

**Built with ❤️ for ethical web scraping**

## 📞 Support

- Email: support@shopwise.ai
- Documentation: https://docs.shopwise.ai/scraping
- Issues: https://github.com/yourusername/shopwise-scraping/issues

# Development Workflow

This guide outlines the development workflow for the ShopWise Scraping Service, from setting up your environment to deploying to production.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Development Process](#development-process)
3. [Testing Workflow](#testing-workflow)
4. [Debugging Guide](#debugging-guide)
5. [Deployment Process](#deployment-process)
6. [Maintenance Tasks](#maintenance-tasks)

---

## Environment Setup

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/shopwise/shopwise-scraping.git
cd shopwise-scraping

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install chromium

# 4. Setup environment
cp .env.example .env

# 5. Start dependencies (MongoDB, Redis)
docker-compose up -d

# 6. Verify setup
npm run db:test
npm test
```

### IDE Configuration (VS Code)

Install recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-playwright.playwright",
    "mongodb.mongodb-vscode",
    "visualstudioexptteam.vscodeintellicode"
  ]
}
```

Configure settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.associations": {
    "*.json": "jsonc"
  }
}
```

---

## Development Process

### Feature Development Workflow

#### 1. Create Feature Branch

```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-product-comparison

# Or for platform addition
git checkout -b platform/add-shophive
```

#### 2. Development Cycle

```
┌─────────────────────────────────────────────┐
│  1. Write Code                              │
│     ↓                                       │
│  2. Write Tests                             │
│     ↓                                       │
│  3. Run Tests Locally                       │
│     ↓                                       │
│  4. Fix Issues                              │
│     ↓                                       │
│  5. Commit Changes                          │
│     ↓                                       │
│  6. Push to Remote                          │
│     ↓                                       │
│  7. Create Pull Request                     │
│     ↓                                       │
│  8. Code Review                             │
│     ↓                                       │
│  9. Merge to Develop                        │
└─────────────────────────────────────────────┘
```

#### 3. Make Changes

```bash
# Example: Add new scraper
mkdir src/scrapers/platforms/shophive
touch src/scrapers/platforms/shophive/shophive.scraper.js
touch src/config/platforms/shophive.json

# Edit files...

# Run linter
npm run lint:fix

# Format code
npm run format
```

#### 4. Write Tests

```bash
# Create test file
touch tests/unit/scrapers/platforms/shophive.test.js

# Write tests
# Run specific test
npm test -- shophive

# Run all tests
npm test
```

#### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional message
git commit -m "feat(scraper): add ShopHive platform scraper

Implements scraping for ShopHive.pk including:
- Product details extraction
- Price and availability parsing
- Review scraping support

Closes #123"
```

#### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/add-product-comparison

# Create PR on GitHub
# Select develop as base branch
```

### Hot Fix Workflow

For urgent production fixes:

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/fix-price-parsing

# Make fix
# Test thoroughly
# Commit

# Merge to main AND develop
git checkout main
git merge hotfix/fix-price-parsing
git push origin main

git checkout develop
git merge hotfix/fix-price-parsing
git push origin develop
```

---

## Testing Workflow

### Test-Driven Development (TDD)

```
1. Write failing test
2. Write minimal code to pass test
3. Refactor code
4. Repeat
```

#### Example TDD Cycle

```javascript
// Step 1: Write failing test
describe('PriceParser', () => {
  it('should parse Pakistani rupee format', () => {
    const parser = new PriceParser();
    expect(parser.parse('Rs. 12,345')).toBe(12345);
  });
});

// Run test - it fails ❌

// Step 2: Write minimal code
class PriceParser {
  parse(text) {
    return parseInt(text.replace(/[^0-9]/g, ''));
  }
}

// Run test - it passes ✅

// Step 3: Refactor
class PriceParser {
  parse(text) {
    if (!text) return 0;
    
    const cleaned = text.replace(/[^0-9.]/g, '');
    const price = parseFloat(cleaned);
    
    return isNaN(price) ? 0 : price;
  }
}

// Run test - still passes ✅
```

### Testing Checklist

Before pushing code:

```bash
# ✅ Run all tests
npm test

# ✅ Check coverage (should be > 80%)
npm run test:coverage

# ✅ Run linter
npm run lint

# ✅ Format code
npm run format

# ✅ Test specific scraper manually
npm run test:scraper -- platform-id https://...

# ✅ Validate configurations
npm run validate:config
```

### Integration Testing

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Run E2E tests (use carefully!)
npm run test:e2e
```

---

## Debugging Guide

### Enabling Debug Mode

```env
# .env
NODE_ENV=development
LOG_LEVEL=debug
HEADLESS=false
ENABLE_SCREENSHOTS=true
ENABLE_HTML_DUMPS=true
```

### Browser Debugging

```javascript
// Launch browser with devtools
const browser = await playwright.chromium.launch({
  headless: false,
  devtools: true,
  slowMo: 1000  // Slow down by 1 second
});

// Pause execution for debugging
await page.pause();

// Take screenshot
await page.screenshot({ 
  path: 'debug.png',
  fullPage: true 
});

// Console logs
page.on('console', msg => console.log('PAGE LOG:', msg.text()));

// Network requests
page.on('request', req => console.log('REQUEST:', req.url()));
page.on('response', res => console.log('RESPONSE:', res.url(), res.status()));
```

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Scraper",
      "program": "${workspaceFolder}/scripts/test-scraper.js",
      "args": ["daraz-pk", "https://daraz.pk/..."],
      "env": {
        "NODE_ENV": "development",
        "HEADLESS": "false"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${fileBasename}", "--detectOpenHandles"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Common Issues

#### Issue: Selector not found

```javascript
// Debug selectors
const element = await page.$('.product-name');
console.log('Element:', element);  // null if not found

// Wait with timeout
try {
  await page.waitForSelector('.product-name', { timeout: 5000 });
} catch (error) {
  console.log('Selector not found');
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'selector-not-found.png' });
  
  // Dump HTML
  const html = await page.content();
  fs.writeFileSync('debug.html', html);
}
```

#### Issue: Rate limit hit

```bash
# Check logs
tail -f logs/errors/error-$(date +%Y-%m-%d).log

# Reduce rate in config
# src/config/platforms/platform.json
"rate_limiting": {
  "requests_per_minute": 10  // Reduce from 30
}
```

#### Issue: Memory leak

```javascript
// Profile memory usage
const used = process.memoryUsage();
console.log('Memory:', {
  rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
  heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`
});

// Force garbage collection
if (global.gc) {
  global.gc();
}

// Run with --expose-gc
node --expose-gc src/index.js
```

---

## Deployment Process

### Staging Deployment

```bash
# 1. Merge to develop
git checkout develop
git merge feature/my-feature
git push origin develop

# 2. CI/CD automatically deploys to staging
# GitHub Actions workflow runs:
#   - Tests
#   - Build
#   - Deploy to staging

# 3. Verify on staging
curl https://staging-scraping.shopwise.pk/health

# 4. Test scraping
npm run test:scraper -- --env=staging --platform=daraz
```

### Production Deployment

```bash
# 1. Create release branch
git checkout develop
git checkout -b release/v1.2.0

# 2. Update version
npm version patch  # or minor or major

# 3. Update CHANGELOG.md
# Add release notes

# 4. Test release branch
npm run test:coverage
npm run lint

# 5. Merge to main
git checkout main
git merge release/v1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin main --tags

# 6. Merge back to develop
git checkout develop
git merge release/v1.2.0
git push origin develop

# 7. Delete release branch
git branch -d release/v1.2.0

# CI/CD deploys to production automatically
```

### Deployment Checklist

Before deploying:

- [ ] All tests pass
- [ ] Code coverage > 80%
- [ ] Linter passes
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Environment variables configured
- [ ] Database migrations run (if any)
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Monitoring configured
- [ ] Stakeholders notified

### Rollback Procedure

If deployment fails:

```bash
# 1. Identify previous working version
git tag

# 2. Revert to previous version
git checkout v1.1.9

# 3. Deploy previous version
git push origin main --force-with-lease

# 4. Verify rollback
curl https://scraping.shopwise.pk/health

# 5. Investigate and fix issue
# 6. Re-deploy when fixed
```

---

## Maintenance Tasks

### Regular Maintenance

#### Daily

```bash
# Check error logs
npm run logs:errors

# Monitor scraping metrics
curl https://scraping.shopwise.pk/metrics

# Verify queue health
npm run queue:status
```

#### Weekly

```bash
# Validate selectors for all platforms
npm run validate:selectors

# Update dependencies
npm outdated
npm update

# Review failed jobs
npm run jobs:failed

# Optimize database
npm run db:optimize
```

#### Monthly

```bash
# Security audit
npm audit
npm audit fix

# Performance benchmark
npm run benchmark

# Clean old logs
npm run logs:clean

# Update browser versions
npx playwright install
```

### Selector Updates

When platform changes HTML structure:

```bash
# 1. Test current selectors
npm run validate:config -- daraz-pk

# 2. Update selectors in config
# Edit src/config/platforms/daraz-pk.json

# 3. Test new selectors
npm run test:scraper -- daraz-pk https://...

# 4. Verify in tests
npm test -- daraz-pk

# 5. Deploy update
git commit -m "fix(config): update Daraz selectors"
```

### Database Maintenance

```javascript
// Cleanup old price history (keep 1 year)
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

await SaleHistory.deleteMany({
  timestamp: { $lt: oneYearAgo }
});

// Remove inactive products (not updated in 3 months)
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

await Product.updateMany(
  { updatedAt: { $lt: threeMonthsAgo } },
  { $set: { is_active: false } }
);

// Create indexes
await Product.collection.createIndex({ original_url: 1 }, { unique: true });
await SaleHistory.collection.createIndex({ product_id: 1, timestamp: -1 });
```

### Performance Optimization

```bash
# Profile scraping performance
npm run benchmark

# Analyze bundle size
npm run analyze

# Check memory usage
npm run memory:profile

# Optimize database queries
npm run db:explain-queries
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

`.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
        
      - name: Run linter
        run: npm run lint
        
      - name: Run tests
        run: npm run test:coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        
  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to staging
        run: |
          # Deployment script
          
  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Production deployment script
```

---

## Git Workflow Summary

```
main (production)
  ↑
  └── release/v1.x.x
        ↑
        └── develop
              ↑
              ├── feature/feature-name
              ├── bugfix/bug-description
              └── platform/platform-name
```

### Branch Protection Rules

- **main**: 
  - Require PR reviews (2 approvers)
  - Require status checks to pass
  - No direct pushes

- **develop**:
  - Require PR reviews (1 approver)
  - Require status checks to pass

---

## Summary

### Daily Workflow

1. Pull latest `develop`
2. Create feature branch
3. Write code + tests
4. Run tests locally
5. Commit with conventional messages
6. Push and create PR
7. Address review comments
8. Merge to `develop`

### Release Workflow

1. Create release branch from `develop`
2. Update version and CHANGELOG
3. Test thoroughly
4. Merge to `main` and tag
5. Merge back to `develop`
6. Deploy automatically via CI/CD

### Maintenance Workflow

1. Monitor daily logs
2. Validate selectors weekly
3. Update dependencies monthly
4. Optimize database quarterly

---

**Happy Coding! 🚀**

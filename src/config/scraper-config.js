/**
 * PriceOye Scraper Configuration
 * All settings for scraping PriceOye website
 */

module.exports = {
  // ============================================
  // PLATFORM INFORMATION
  // ============================================
  platform: {
    priceoye: {
      name: 'PriceOye',
      baseUrl: 'https://priceoye.pk',
      country: 'Pakistan',
      currency: 'PKR',
    },
    daraz: {
      name: 'Daraz',
      baseUrl: 'https://www.daraz.pk',
      country: 'Pakistan',
      currency: 'PKR',
    },
  },

  // ============================================
  // BROWSER SETTINGS (Playwright)
  // ============================================
  browser: {
    // Browser type: chromium, firefox, webkit
    type: 'chromium',

    // Run headless or with UI
    headless: true,

    // Browser launch args
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],

    // Timeout for browser operations
    timeout: 30000, // 30 seconds

    // User agent
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // Viewport size
    viewport: {
      width: 1920,
      height: 1080,
    },

    // Locale
    locale: 'en-PK',

    // Timezone
    timezoneId: 'Asia/Karachi',
  },
  // ============================================
  // PAGE LOAD SETTINGS
  // ============================================
  page: {
    // Wait until condition before considering page loaded
    waitUntil: 'networkidle', // 'load', 'domcontentloaded', 'networkidle'

    // Timeout for page load (increased for slow pages)
    timeout: 120000, // 120 seconds (2 minutes)

    // Extra wait after page load (for dynamic content)
    extraWait: 2000, // 2 seconds

    // Take screenshot on error
    screenshotOnError: true,

    // Save HTML on error
    saveHtmlOnError: true,
  },

  // ============================================
  // RATE LIMITING
  // ============================================
  rateLimit: {
    // Maximum concurrent requests
    concurrent: 3,

    // Minimum interval between requests (ms)
    minInterval: 1000, // 1 second

    // Requests per interval
    requestsPerInterval: 3,

    // Interval window (ms)
    intervalWindow: 1000, // 1 second

    // Delay between pages in pagination (ms)
    paginationDelay: 1500, // 1.5 seconds

    // Delay between batches (ms)
    batchDelay: 2000, // 2 seconds

    // Random delay range (adds randomness)
    randomDelay: {
      min: 500,
      max: 1500,
    },
  },

  // ============================================
  // RETRY LOGIC
  // ============================================
  retry: {
    // Maximum retry attempts
    maxRetries: 3,

    // Retry delay strategy: 'fixed', 'exponential', 'linear'
    strategy: 'exponential',

    // Base delay for retries (ms)
    baseDelay: 2000, // 2 seconds

    // Factor for exponential backoff
    factor: 2, // 2s, 4s, 8s

    // Maximum delay (cap for exponential)
    maxDelay: 10000, // 10 seconds

    // Minimum timeout
    minTimeout: 2000,

    // Maximum timeout
    maxTimeout: 10000,

    // Retry on these error types
    retryOn: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'RATE_LIMIT_ERROR'],

    // Don't retry on these error types
    abortOn: ['VALIDATION_ERROR', 'AUTH_ERROR', 'NOT_FOUND'],
  },

  // ============================================
  // PAGINATION SETTINGS
  // ============================================
  pagination: {
    // Maximum pages to scrape (null = all)
    maxPages: null,

    // Products per page (typical)
    productsPerPage: 20,

    // Start from page
    startPage: 1,

    // Wait for pagination to load
    waitForPagination: true,

    // Selector for next button (fallback)
    nextButtonSelector: '.next, .next-page, a[rel="next"]',
  },

  // ============================================
  // DATA EXTRACTION SETTINGS
  // ============================================
  extraction: {
    // Wait for selectors before extracting
    waitForSelectors: true,

    // Timeout for selector wait
    selectorTimeout: 10000, // 10 seconds

    // Extract images
    extractImages: true,

    // Maximum images to extract
    maxImages: 10,

    // Extract specifications
    extractSpecifications: true,

    // Extract reviews
    extractReviews: true,

    // Maximum reviews to extract
    maxReviews: 10,

    // Extract variants
    extractVariants: true,

    // Clean extracted text
    cleanText: true,

    // Remove extra whitespace
    trimWhitespace: true,
  },

  // ============================================
  // DATABASE SETTINGS
  // ============================================
  database: {
    // Batch insert size
    batchSize: 50,

    // Check for duplicates before insert
    checkDuplicates: true,

    // Duplicate check field
    duplicateField: 'original_url',

    // Update existing products
    updateExisting: true,

    // Update fields (when product exists)
    updateFields: [
      'price',
      'sale_price',
      'sale_percentage',
      'availability',
      'average_rating',
      'review_count',
      'media.images',
    ],
  },

  // ============================================
  // LOGGING SETTINGS
  // ============================================
  logging: {
    // Log level: 'error', 'warn', 'info', 'debug'
    level: 'info',

    // Log to file
    logToFile: true,

    // Log to console
    logToConsole: true,

    // Log file path
    logFile: 'logs/scraper.log',

    // Error log file
    errorLogFile: 'logs/scraper-error.log',

    // Log HTTP requests
    logRequests: false,

    // Log extracted data
    logExtractedData: false,
  },

  // ============================================
  // PROGRESS TRACKING
  // ============================================
  progress: {
    // Show progress bar
    showProgress: true,

    // Update interval (ms)
    updateInterval: 1000, // 1 second

    // Save progress to file
    saveProgress: true,

    // Progress file path
    progressFile: 'data/progress.json',

    // Resume from saved progress
    resumeFromProgress: true,
  },

  // ============================================
  // OUTPUT SETTINGS
  // ============================================
  output: {
    // Save scraped data to JSON
    saveToJson: true,

    // JSON output directory
    jsonDir: 'data/scraped',

    // Save to database
    saveToDatabase: true,

    // Save screenshots
    saveScreenshots: false,

    // Screenshot directory
    screenshotDir: 'data/screenshots',

    // Save HTML
    saveHtml: false,

    // HTML directory
    htmlDir: 'data/html',
  },

  // ============================================
  // ERROR HANDLING
  // ============================================
  errors: {
    // Stop on first error
    stopOnError: false,

    // Maximum errors before stopping
    maxErrors: 10,

    // Save errors to file
    saveErrors: true,

    // Error file path
    errorFile: 'data/errors.json',

    // Take screenshot on error
    screenshotOnError: true,

    // Save HTML on error
    saveHtmlOnError: true,
  },

  // ============================================
  // VALIDATION SETTINGS
  // ============================================
  validation: {
    // Validate product data before saving
    validateBeforeSave: true,

    // Required fields
    requiredFields: ['name', 'price', 'original_url', 'platform_id'],

    // Skip invalid products
    skipInvalid: true,

    // Log validation errors
    logValidationErrors: true,
  },

  // ============================================
  // PERFORMANCE SETTINGS
  // ============================================
  performance: {
    // Enable request caching
    cacheRequests: false,

    // Cache TTL (ms)
    cacheTTL: 3600000, // 1 hour

    // Reuse browser instance
    reuseBrowser: true,

    // Close browser after N products
    closeBrowserAfter: 100,

    // Memory limit (MB)
    memoryLimit: 500,

    // Check memory usage
    checkMemory: true,

    // GC interval (ms)
    gcInterval: 60000, // 1 minute
  },

  // ============================================
  // DEVELOPMENT/DEBUG SETTINGS
  // ============================================
  debug: {
    // Enable debug mode
    enabled: false,

    // Verbose logging
    verbose: false,

    // Limit products (for testing)
    limitProducts: null, // Set to number for testing

    // Test mode (don't save to DB)
    testMode: false,

    // Dry run (simulate without scraping)
    dryRun: false,
  },
};

/**
 * Application Configuration
 * Loads and validates environment variables
 * @module config/config
 */

require('dotenv').config();

const config = {
  // Application
  app: {
    name: process.env.APP_NAME || 'ShopWise Scraping Service',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shopwise',
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 10,
      minPoolSize: 5,
    },
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // Backend API
  backendApi: {
    baseUrl: process.env.BACKEND_API_URL || 'http://localhost:5000/api/v1',
    timeout: parseInt(process.env.BACKEND_API_TIMEOUT, 10) || 10000,
  },

  // Scraping
  scraping: {
    // Browser settings
    browser: {
      headless: process.env.BROWSER_HEADLESS !== 'false',
      timeout: parseInt(process.env.BROWSER_TIMEOUT, 10) || 30000,
    },

    // Rate limiting
    rateLimit: {
      requestsPerMinute: parseInt(process.env.RATE_LIMIT_RPM, 10) || 30,
      delayBetweenRequests: parseInt(process.env.DELAY_BETWEEN_REQUESTS, 10) || 2000,
    },

    // Retry settings
    retry: {
      maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
      initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY, 10) || 1000,
    },

    // Proxy settings (optional)
    proxy: {
      enabled: process.env.PROXY_ENABLED === 'true',
      url: process.env.PROXY_URL || undefined,
    },
  },

  // Cache settings
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 3600, // 1 hour
    enabled: process.env.CACHE_ENABLED !== 'false',
  },

  // Queue settings (Bull)
  queue: {
    attempts: parseInt(process.env.QUEUE_ATTEMPTS, 10) || 3,
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.QUEUE_BACKOFF_DELAY, 10) || 1000,
    },
    removeOnComplete: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE, 10) || 100,
    removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL, 10) || 100,
  },
};

/**
 * Validate required configuration
 */
function validateConfig() {
  const required = [
    'MONGODB_URI',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate on load (optional in development)
if (config.app.env === 'production') {
  validateConfig();
}

module.exports = config;

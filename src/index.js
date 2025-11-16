/**
 * ShopWise Scraping Service
 * Main application entry point
 * @module index
 */

const config = require('./config/config');
const { logger } = require('./utils/logger');
const { databaseManager } = require('./utils/database');
const { redisManager } = require('./utils/redis');
const backendAPIClient = require('./services/backend-api-client');
const normalizationService = require('./services/normalization-service');

class ScrapingService {
  constructor() {
    this.isReady = false;
  }

  /**
   * Initialize the scraping service
   */
  async initialize() {
    try {
      logger.info('Starting ShopWise Scraping Service...');
      logger.info(`Environment: ${config.app.env}`);
      logger.info(`Log Level: ${config.app.logLevel}`);

      // Connect to MongoDB
      logger.info('Connecting to MongoDB...');
      await databaseManager.connect(config.mongodb.uri, config.mongodb.options);

      // Connect to Redis
      logger.info('Connecting to Redis...');
      await redisManager.connect(config.redis);

      // Test Backend API connection
      logger.info('Testing Backend API connection...');
      const backendHealthy = await backendAPIClient.healthCheck();
      if (backendHealthy) {
        logger.info('✅ Backend API is accessible');
      } else {
        logger.warn('⚠️ Backend API is not accessible - normalization features may not work');
      }

      // Initialize normalization cache
      logger.info('Initializing normalization service...');
      // Cache initialization happens automatically in the service constructor

      this.isReady = true;
      logger.info('✅ ShopWise Scraping Service initialized successfully');
      logger.info('Service is ready to scrape!');

      // Log service info
      this.logServiceInfo();
    } catch (error) {
      logger.error('Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown() {
    logger.info('Shutting down ShopWise Scraping Service...');

    try {
      // Close Redis connection
      if (redisManager.isConnected) {
        await redisManager.disconnect();
      }

      // Close MongoDB connection
      if (databaseManager.isConnected) {
        await databaseManager.disconnect();
      }

      logger.info('✅ Service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Log service information
   */
  logServiceInfo() {
    const dbStatus = databaseManager.getStatus();
    const redisStatus = redisManager.getStatus();
    const cacheStats = normalizationService.getCacheStats();

    logger.info('='.repeat(60));
    logger.info('SERVICE STATUS');
    logger.info('='.repeat(60));
    logger.info(`MongoDB: ${dbStatus.isConnected ? '✅ Connected' : '❌ Disconnected'}`);
    logger.info(`  Host: ${dbStatus.host}:${dbStatus.port}`);
    logger.info(`  Database: ${dbStatus.database}`);
    logger.info(`Redis: ${redisStatus.isConnected ? '✅ Connected' : '❌ Disconnected'}`);
    logger.info(`  Ready: ${redisStatus.isReady ? 'Yes' : 'No'}`);
    logger.info(`Backend API: ${config.backendApi.baseUrl}`);
    logger.info(`Normalization Cache:`);
    logger.info(`  Brands Cached: ${cacheStats.brandCacheSize}`);
    logger.info(`  Categories Cached: ${cacheStats.categoryCacheSize}`);
    logger.info(`  Brand Hit Rate: ${cacheStats.brandHitRate}%`);
    logger.info(`  Category Hit Rate: ${cacheStats.categoryHitRate}%`);
    logger.info('='.repeat(60));
  }

  /**
   * Health check
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const dbHealth = await databaseManager.healthCheck();
    const redisHealth = await redisManager.healthCheck();
    const backendHealth = await backendAPIClient.healthCheck();
    const cacheStats = normalizationService.getCacheStats();

    return {
      status: dbHealth && redisHealth && backendHealth ? 'healthy' : 'degraded',
      service: 'ShopWise Scraping Service',
      timestamp: new Date().toISOString(),
      checks: {
        mongodb: dbHealth,
        redis: redisHealth,
        backendAPI: backendHealth,
      },
      cache: cacheStats,
    };
  }
}

// Create service instance
const service = new ScrapingService();

// Handle process signals
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal');
  await service.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal');
  await service.shutdown();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the service
if (require.main === module) {
  service.initialize().catch((error) => {
    logger.error('Failed to start service:', error);
    process.exit(1);
  });
}

module.exports = service;

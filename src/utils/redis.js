/**
 * Redis Client Manager
 * Redis connection for caching and queues
 * @module utils/redis
 */

const redis = require('redis');
const { logger } = require('./logger');

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Connect to Redis
   * @param {Object} options - Redis connection options
   * @returns {Promise<redis.RedisClientType>}
   */
  async connect(options = {}) {
    if (this.isConnected) {
      logger.info('Redis already connected');
      return this.client;
    }

    const defaultOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    const connectionOptions = { ...defaultOptions, ...options };

    try {
      logger.info('Connecting to Redis...');

      this.client = redis.createClient({
        socket: {
          host: connectionOptions.host,
          port: connectionOptions.port,
        },
        password: connectionOptions.password,
      });

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
      });

      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected || !this.client) {
      logger.info('Redis already disconnected');
      return;
    }

    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Check Redis connection health
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Get Redis client
   * @returns {redis.RedisClientType}
   */
  getClient() {
    return this.client;
  }

  /**
   * Get connection status
   * @returns {Object}
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isReady: this.client?.isReady || false,
    };
  }

  /**
   * Set a key-value pair with optional expiry
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<string>}
   */
  async set(key, value, ttl = null) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttl) {
        return await this.client.setEx(key, ttl, stringValue);
      }
      
      return await this.client.set(key, stringValue);
    } catch (error) {
      logger.error('Redis SET error:', error);
      throw error;
    }
  }

  /**
   * Get a value by key
   * @param {string} key - Cache key
   * @param {boolean} parseJSON - Whether to parse as JSON
   * @returns {Promise<*>}
   */
  async get(key, parseJSON = true) {
    try {
      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }
      
      if (parseJSON) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      
      return value;
    } catch (error) {
      logger.error('Redis GET error:', error);
      throw error;
    }
  }

  /**
   * Delete a key
   * @param {string} key - Cache key
   * @returns {Promise<number>}
   */
  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
      throw error;
    }
  }

  /**
   * Clear all keys
   * @returns {Promise<string>}
   */
  async flushAll() {
    try {
      return await this.client.flushAll();
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error);
      throw error;
    }
  }
}

// Singleton instance
const redisManager = new RedisManager();

module.exports = { redisManager, RedisManager };

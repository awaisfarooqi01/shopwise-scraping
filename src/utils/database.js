/**
 * Database Connection Manager
 * MongoDB connection with connection pooling and health checks
 * @module utils/database
 */

const mongoose = require('mongoose');
const { logger } = require('./logger');

class DatabaseManager {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   * @param {string} uri - MongoDB connection URI
   * @param {Object} options - Mongoose connection options
   * @returns {Promise<mongoose.Connection>}
   */
  async connect(uri, options = {}) {
    if (this.isConnected) {
      logger.info('Database already connected');
      return this.connection;
    }

    const defaultOptions = {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4, // Use IPv4
    };

    const connectionOptions = { ...defaultOptions, ...options };

    try {
      logger.info('Connecting to MongoDB...');
      
      await mongoose.connect(uri, connectionOptions);
      
      this.connection = mongoose.connection;
      this.isConnected = true;

      // Connection event handlers
      this.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
      });

      this.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      this.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      logger.info(`MongoDB connected to: ${this.connection.host}:${this.connection.port}/${this.connection.name}`);
      
      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      logger.info('Database already disconnected');
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('MongoDB disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check database connection health
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get connection status
   * @returns {Object}
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: this.connection?.host,
      port: this.connection?.port,
      database: this.connection?.name,
    };
  }

  /**
   * Get database connection
   * @returns {mongoose.Connection}
   */
  getConnection() {
    return this.connection;
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

module.exports = { databaseManager, DatabaseManager };

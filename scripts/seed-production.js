#!/usr/bin/env node
/**
 * Production Database Seeder Script
 * Seeds the production database with essential data:
 * - Platforms (PriceOye, Daraz, Telemart, etc.)
 * - Categories (Electronics, Home Appliances, Vehicles, etc.)
 * - Brands (60+ brands across categories)
 * - Category Mappings (PriceOye URL slugs to our categories)
 * 
 * Usage:
 *   npm run seed:production           - Seed all collections
 *   npm run seed:production -- --clear   - Clear and reseed
 *   npm run seed:production -- --essential - Only platforms, categories
 *   npm run seed:production -- --help  - Show help
 * 
 * Environment:
 *   MONGODB_URI - MongoDB connection string (required)
 *   Example: mongodb+srv://user:pass@cluster.mongodb.net/shopwise
 */

const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { logger } = require('../src/utils/logger');
const { seedAll, seedEssential, seedPlatforms, seedCategories, seedBrands, seedCategoryMappings } = require('../src/database/seeders');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldClear = args.includes('--clear');
const essentialOnly = args.includes('--essential');
const showHelp = args.includes('--help') || args.includes('-h');
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

/**
 * Display help message
 */
const displayHelp = () => {
  console.log(`
📦 ShopWise Production Database Seeder
=======================================

Usage:
  npm run seed:production                 Seed all collections
  npm run seed:production -- --essential  Seed only platforms & categories
  npm run seed:production -- --clear      Clear all data before seeding

Options:
  --clear           Clear existing data before seeding
  --essential       Only seed platforms and categories (faster)
  --help, -h        Show this help message

Environment Variables:
  MONGODB_URI       MongoDB connection string (required)
                    Example: mongodb+srv://user:pass@cluster.mongodb.net/shopwise

Examples:
  # Full production seed
  npm run seed:production

  # Quick setup with just platforms and categories
  npm run seed:production -- --essential

  # Clear and reseed everything
  npm run seed:production -- --clear

MongoDB URI Strategy:
  For production, use: mongodb+srv://user:pass@cluster.mongodb.net/shopwise
  The database name 'shopwise' should be at the end of the URI.
  This ensures all services connect to the same database.

Note: 
  - Uses upsert, so running multiple times is safe
  - Will update existing records if they exist
  - After seeding, copy the UNMAPPED_CATEGORY_ID to your .env
  `);
};

/**
 * Connect to MongoDB
 */
const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }
  
  // Extract database name for logging
  const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'unknown';
  logger.info(`📡 Connecting to MongoDB database: ${dbName}`);
  
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  
  logger.info('✅ Connected to MongoDB');
  return mongoose.connection;
};

/**
 * Clear all seeded collections
 */
const clearAll = async () => {
  const models = [
    require('../src/models/Platform'),
    require('../src/models/Category'),
    require('../src/models/Brand'),
    require('../src/models/CategoryMapping'),
  ];
  
  logger.info('🗑️  Clearing seeded collections...');
  
  for (const Model of models) {
    const count = await Model.countDocuments();
    await Model.deleteMany({});
    logger.info(`   ✓ Cleared ${Model.modelName} (${count} documents)`);
  }
  
  logger.info('✅ Collections cleared');
};

/**
 * Main seeder function
 */
const runSeeder = async () => {
  try {
    // Show help if requested
    if (showHelp) {
      displayHelp();
      process.exit(0);
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           ShopWise Production Database Seeder              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Connect to database
    await connectDatabase();

    // Clear if requested
    if (shouldClear) {
      await clearAll();
    }

    // Run appropriate seeder
    let result;
    if (essentialOnly) {
      logger.info('📋 Running essential seed (platforms & categories only)...');
      result = await seedEssential();
    } else {
      logger.info('📋 Running full production seed...');
      result = await seedAll();
    }

    // Print important IDs for .env configuration
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    IMPORTANT - Copy to .env                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    if (result.unmappedCategory) {
      console.log(`UNMAPPED_CATEGORY_ID=${result.unmappedCategory._id}`);
    }
    
    if (result.platforms) {
      const priceoye = result.platforms.find(p => p.name === 'PriceOye');
      if (priceoye) {
        console.log(`PRICEOYE_PLATFORM_ID=${priceoye._id}`);
      }
    }
    
    console.log('');
    console.log('Add these to your .env file for the scraper to work correctly.');
    console.log('');

    // Close database connection
    await mongoose.connection.close();
    logger.info('📊 Database connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeder failed:', error);
    
    // Ensure connection is closed on error
    try {
      await mongoose.connection.close();
    } catch (e) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the seeder
runSeeder();

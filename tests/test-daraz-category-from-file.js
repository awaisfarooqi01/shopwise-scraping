/**
 * Test runner: load first enabled category from daraz-categories.json
 * and run scrapeCategoryByUrl() for a short test (3 pages, reviews enabled)
 */

require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const DarazScraper = require('../src/scrapers/daraz/daraz-scraper');
const { logger } = require('../src/utils/logger');

async function runTestFromConfig() {
  let scraper;
  try {
    const configPath = path.resolve(
      __dirname,
      '..',
      'src',
      'scrapers',
      'daraz',
      'daraz-categories.json'
    );
    const cfg = require(configPath);

    if (!cfg || !Array.isArray(cfg.categories) || cfg.categories.length === 0) {
      throw new Error('No categories found in daraz-categories.json');
    }

    // Pick first enabled category
    const category = cfg.categories.find(c => c.enabled) || cfg.categories[0];
    logger.info(`🚀 Testing Daraz category from config: ${category.name}`);

    // Connect to DB
    logger.info('📦 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Database connected');

    // Initialize scraper
    scraper = new DarazScraper();
    await scraper.initialize();
    logger.info('✅ Scraper initialized');

    // Run category scrape (limit listing pages to 3 for test)
    const products = await scraper.scrapeCategoryByUrl(category.base, {
      maxPages: 3,
      maxProducts: null,
      includeReviews: true, // test review pagination
      maxReviewPages: 3,
      name: category.name,
    });

    logger.info('\n📊 Test Results:');
    logger.info(`   Category: ${category.name}`);
    logger.info(`   Total products scraped: ${products.length}`);

    products.forEach((p, i) => {
      logger.info(`\n   ${i + 1}. ${p.name}`);
      logger.info(`      Price: Rs. ${p.price || p.sale_price || 0}`);
      logger.info(`      URL: ${p.original_url}`);
      logger.info(`      Reviews scraped: ${p.reviews ? p.reviews.length : 0}`);
    });

    logger.info('\n✅ Test finished');
  } catch (error) {
    logger.error('\n❌ Test failed:', error);
    process.exitCode = 1;
  } finally {
    if (scraper) {
      try {
        await scraper.close();
      } catch (e) {
        logger.warn('Failed to close scraper cleanly', e.message);
      }
    }

    try {
      await mongoose.connection.close();
    } catch (e) {
      logger.warn('Failed to close mongoose connection', e.message);
    }
  }
}

runTestFromConfig();

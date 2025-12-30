/**
 * Test script for Daraz category scraping
 * Tests the new scrapeCategoryByUrl() method
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DarazScraper = require('../src/scrapers/daraz/daraz-scraper');
const { logger } = require('../src/utils/logger');

/**
 * Test category scraping
 */
async function testCategoryScraping() {
  let scraper;
  try {
    logger.info('🚀 Starting Daraz Category Scraping Test\n');

    // Connect to database
    logger.info('📦 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Database connected\n');

    // Initialize scraper
    logger.info('🔧 Initializing scraper...');
    scraper = new DarazScraper();
    await scraper.initialize();
    logger.info('✅ Scraper initialized\n');

    // Test category URL
    // Small category for quick testing: iPhone 15 (should have ~10-20 products)
    const categoryUrl = 'https://www.daraz.pk/catalog?q=iphone+15'; // Scrape category with options
    const products = await scraper.scrapeCategoryByUrl(categoryUrl, {
      maxPages: 2, // Only scrape first 2 pages for testing
      maxProducts: 10, // Limit to 10 products for quick testing
      includeReviews: false, // Reviews not yet implemented for category mode
      maxReviewPages: 3, // Max 3 review pages per product
      name: 'iPhone 15', // Optional: provide category name
    });

    logger.info('\n📊 Category Scraping Results:');
    logger.info(`   Total products scraped: ${products.length}`);

    // Display product summary
    products.forEach((product, index) => {
      logger.info(`\n   ${index + 1}. ${product.name}`);
      logger.info(`      Price: Rs. ${product.price.toLocaleString()}`);
      logger.info(`      Brand: ${product.brand || 'N/A'}`);
      logger.info(`      Category: ${product.category_name || 'N/A'}`);
      logger.info(`      URL: ${product.original_url}`);
    });

    logger.info('\n✅ Test completed successfully!');
  } catch (error) {
    logger.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (scraper) {
      await scraper.close();
    }
    await mongoose.connection.close();
  }
}

/**
 * Test with different category URLs
 */
async function testMultipleCategories() {
  let scraper;
  try {
    logger.info('🚀 Starting Multiple Category Test\n');

    await mongoose.connect(process.env.MONGODB_URI);

    scraper = new DarazScraper();
    await scraper.initialize();

    // Test different category types
    const categories = [
      {
        url: 'https://www.daraz.pk/catalog?q=Smart+Phones',
        name: 'Smart Phones',
        maxProducts: 3,
      },
      {
        url: 'https://www.daraz.pk/catalog?q=Wireless+Earbuds',
        name: 'Wireless Earbuds',
        maxProducts: 3,
      },
      {
        url: 'https://www.daraz.pk/catalog?q=Power+Banks',
        name: 'Power Banks',
        maxProducts: 3,
      },
    ];

    const allResults = [];

    for (const category of categories) {
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`Testing category: ${category.name}`);
      logger.info(`${'='.repeat(80)}\n`);

      const products = await scraper.scrapeCategoryByUrl(category.url, {
        maxPages: 1,
        maxProducts: category.maxProducts,
        includeReviews: false, // Skip reviews for speed
        name: category.name,
      });

      allResults.push({
        category: category.name,
        count: products.length,
        products,
      });

      // Delay between categories
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Summary
    logger.info('\n📊 Multi-Category Test Summary:');
    allResults.forEach(result => {
      logger.info(`   ${result.category}: ${result.count} products`);
    });

    logger.info('\n✅ All categories tested successfully!');
  } catch (error) {
    logger.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    if (scraper) {
      await scraper.close();
    }
    await mongoose.connection.close();
  }
}

// Run tests
const testType = process.argv[2] || 'single';

if (testType === 'multiple') {
  testMultipleCategories();
} else {
  testCategoryScraping();
}

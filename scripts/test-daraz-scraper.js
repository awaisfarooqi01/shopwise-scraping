/**
 * Daraz Scraper Test Script
 * Tests single product scraping functionality
 *
 * Usage: node scripts/test-daraz-scraper.js [url]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { DarazScraper } = require('../src/scrapers/daraz');
const { logger } = require('../src/utils/logger');

// Test URLs (various product types)
const TEST_URLS = {
  // Grocery - Nestle Nido (Volumetric variant)
  grocery:
    'https://www.daraz.pk/products/nestle-nido-growing-up-formula-1-powder-900gm-i4157310-s27320176.html',

  // Electronics - P47 Headset (Color Family variant)
  electronics:
    'https://www.daraz.pk/products/orignal-p47-wireless-headset-bluetooth-foldable-on-ear-headphone-wireless-earbuds-invisible-ultra-small-bluetooth-handfree-for-all-cell-phones-i666091510-s3050003892.html',

  // Fashion - Ladies Handbag (Color Family variant)
  fashion:
    'https://www.daraz.pk/products/new-design-ladies-handbags-with-long-shoulders-stylish-designs-2025-ladies-hand-bags-for-girls-casual-women-pu-leather-bag-stylish-hand-bag-for-girls-fashionable-large-capacity-crossbody-shoulder-bags-women-purse-handbag-ladies-bags-for-gifts-i909611731-s4011612621.html',

  // Mobile - Samsung Galaxy (Color Family + Storage Capacity variants)
  mobile:
    'https://www.daraz.pk/products/samsung-galaxy-a07-4gb64gb-pta-approved-i924758885-s3981951158.html',

  // Beauty - Jenpharm Moisturizer (Scent variant)
  beauty:
    'https://www.daraz.pk/products/jenpharm-dermive-oil-free-moisturizer-100ml-for-men-women-i3127508-s16437206.html',
};

async function testScraper() {
  let scraper = null;

  try {
    // Get URL from command line or use default
    const testUrl = process.argv[2] || TEST_URLS.mobile;

    logger.info('='.repeat(60));
    logger.info('🧪 DARAZ SCRAPER TEST');
    logger.info('='.repeat(60));
    logger.info(`📍 Test URL: ${testUrl}`);

    // Connect to MongoDB
    logger.info('\n📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ MongoDB connected');

    // Initialize scraper
    scraper = new DarazScraper();
    await scraper.initialize();

    // Test single product scraping
    logger.info('\n' + '='.repeat(60));
    logger.info('📦 TESTING SINGLE PRODUCT SCRAPING');
    logger.info('='.repeat(60));

    const productData = await scraper.scrapeProduct(testUrl);

    if (productData) {
      logger.info('\n✅ EXTRACTION SUCCESSFUL');
      logger.info('-'.repeat(40));

      // Display extracted data
      console.log('\n📋 EXTRACTED DATA:');
      console.log(
        JSON.stringify(
          {
            name: productData.name,
            brand: productData.brand,
            brand_id: productData.brand_id,
            category_name: productData.category_name,
            category_id: productData.category_id,
            price: productData.price,
            original_price: productData.original_price,
            sale_percentage: productData.sale_percentage,
            currency: productData.currency,
            availability: productData.availability,
            stock_quantity: productData.stock_quantity,
            images_count: productData.media?.images?.length || 0,
            variants:
              productData.variants instanceof Map
                ? Object.fromEntries(productData.variants)
                : productData.variants,
            ratings: productData.ratings,
            seller: productData.seller,
            platform_metadata: productData.platform_metadata,
          },
          null,
          2
        )
      );

      // Optionally save to database
      const saveToDb = process.argv.includes('--save');
      if (saveToDb) {
        logger.info('\n💾 Saving to database...');
        const savedProduct = await scraper.saveProduct(productData);
        logger.info(`✅ Product saved with ID: ${savedProduct._id}`);
      }
    } else {
      logger.error('\n❌ EXTRACTION FAILED - No data returned');
    }
  } catch (error) {
    logger.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    // Cleanup
    if (scraper) {
      await scraper.close();
    }

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      logger.info('📦 MongoDB disconnected');
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('🏁 TEST COMPLETE');
    logger.info('='.repeat(60));
  }
}

// Run tests
testScraper().catch(console.error);

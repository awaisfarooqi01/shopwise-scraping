/**
 * Daraz Scraper Test Script
 * Tests single product scraping functionality
 *
 * Usage: node scripts/test-daraz-scraper.js [url]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
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

// Multi-product test URLs
const MULTI_TEST_URLS = [
  'https://www.daraz.pk/products/honor-x6c-i888061513.html?spm=a2a0e.searchlist.list.7.3a7f6b3eFNIWIY',
  'https://www.daraz.pk/products/10000-i927468241.html?spm=a2a0e.searchlist.list.11.3e571a5bYQkNKt',
  'https://www.daraz.pk/products/airpods-air-pro-3rd-gen-air-31-airpods-dual-52-earbuds-m10-m90-tws-airpods-_-airpods-pro-2nd-generation-airpro-air-31-tws-i12-airpods_-airpods-pro-2nd-generation-original-i12-double-airpods-wireless-bluetooth-hand-free-airpods-pro-made-i876560689.html?spm=a2a0e.searchlist.list.1.2662ec13ou57wQ',
  'https://www.daraz.pk/products/electric-hair-cutting-machine-vintage-t9-clipper-hair-rechargeable-man-shaver-trimmer-for-mens-barber-professional-new-goodabs-black-dragon-i838836813.html?spm=a2a0e.searchlist.list.11.2f116128g2owBs',
];

// Helper to delay between requests
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testScraper() {
  let scraper = null;

  try {
    // Parse command line arguments
    const rawArgs = process.argv.slice(2);
    const flags = rawArgs.filter(arg => arg.startsWith('--'));
    const nonFlags = rawArgs.filter(arg => !arg.startsWith('--'));

    const runMulti = flags.includes('--multi');
    const saveToDb = flags.includes('--save');
    const singleUrl = nonFlags[0];

    // Determine which URLs to test
    const urlsToTest = runMulti ? MULTI_TEST_URLS : singleUrl ? [singleUrl] : [TEST_URLS.mobile];

    logger.info('='.repeat(60));
    logger.info('🧪 DARAZ SCRAPER MULTI-PRODUCT TEST');
    logger.info('='.repeat(60));
    logger.info(`📋 Testing ${urlsToTest.length} product(s)`);
    logger.info(`💾 Save to DB: ${saveToDb ? 'YES' : 'NO'}`);
    logger.info(`📝 Scrape reviews: YES (all available)`);

    // Connect to MongoDB
    logger.info('\n📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ MongoDB connected');

    // Initialize scraper
    scraper = new DarazScraper();
    await scraper.initialize();

    // Summary stats
    const results = {
      total: urlsToTest.length,
      successful: 0,
      failed: 0,
      totalReviews: 0,
    };

    // Test each product sequentially
    for (let i = 0; i < urlsToTest.length; i++) {
      const url = urlsToTest[i];

      logger.info('\n' + '='.repeat(60));
      logger.info(`📦 PRODUCT ${i + 1}/${urlsToTest.length}`);
      logger.info('='.repeat(60));
      logger.info(`📍 URL: ${url}`);

      try {
        // Scrape product data
        logger.info('\n🔍 Scraping product data...');
        const productData = await scraper.scrapeProduct(url);

        if (!productData || !productData.name) {
          logger.error('❌ Product extraction failed - No data returned');
          results.failed++;
          continue;
        }

        logger.info('\n✅ PRODUCT EXTRACTION SUCCESSFUL');
        logger.info('-'.repeat(40));

        // Display extracted data summary
        console.log('\n📋 PRODUCT DATA:');
        console.log(
          JSON.stringify(
            {
              name: productData.name,
              brand: productData.brand,
              brand_id: productData.brand_id,
              category_name: productData.category_name,
              category_id: productData.category_id,
              price: productData.price,
              sale_price: productData.sale_price,
              sale_percentage: productData.sale_percentage,
              currency: productData.currency,
              availability: productData.availability,
              average_rating: productData.average_rating,
              review_count: productData.review_count,
              images_count: productData.media?.images?.length || 0,
              variants:
                productData.variants instanceof Map
                  ? Object.fromEntries(productData.variants)
                  : productData.variants,
              specs_count:
                productData.specifications instanceof Map
                  ? productData.specifications.size
                  : Object.keys(productData.specifications || {}).length,
            },
            null,
            2
          )
        );

        let savedProduct = null;

        // Save product to database if requested
        if (saveToDb) {
          logger.info('\n💾 Saving product to database...');
          savedProduct = await scraper.saveProduct(productData);
          logger.info(`✅ Product saved with ID: ${savedProduct._id}`);
        }

        // Scrape all reviews
        const expectedReviews = productData.review_count || 50;
        const maxPagesNeeded = Math.ceil(expectedReviews / 5) + 2; // 5 reviews per page + buffer

        logger.info(
          `\n📝 Scraping reviews (expecting ~${expectedReviews}, max ${maxPagesNeeded} pages)...`
        );

        const reviews = await scraper.scrapeReviews(url, {
          maxPages: maxPagesNeeded,
          maxReviews: expectedReviews + 10, // Buffer for any extra
          scrollToReviews: true,
        });

        logger.info(`✅ Scraped ${reviews.length} reviews`);
        results.totalReviews += reviews.length;

        // Save reviews to database if requested
        if (saveToDb && savedProduct && reviews.length > 0) {
          logger.info('💾 Saving reviews to database...');
          const saveResult = await scraper.saveReviews(savedProduct._id, reviews);
          logger.info(
            `✅ ${saveResult.saved} new reviews saved, ${saveResult.skipped} duplicates skipped`
          );
        } else if (!saveToDb && reviews.length > 0) {
          logger.info('ℹ️  Reviews not saved (--save flag not provided)');
        }

        results.successful++;

        // Add delay between products to avoid rate limiting
        if (i < urlsToTest.length - 1) {
          const delayMs = 2000 + Math.floor(Math.random() * 2000);
          logger.info(`\n⏳ Waiting ${delayMs}ms before next product...`);
          await sleep(delayMs);
        }
      } catch (error) {
        logger.error(`❌ Error processing product:`, error.message);
        console.error(error);
        results.failed++;
      }
    }

    // Display final summary
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 FINAL SUMMARY');
    logger.info('='.repeat(60));
    logger.info(`✅ Successful: ${results.successful}/${results.total}`);
    logger.info(`❌ Failed: ${results.failed}/${results.total}`);
    logger.info(`📝 Total reviews scraped: ${results.totalReviews}`);
    logger.info(`💾 Data saved to DB: ${saveToDb ? 'YES' : 'NO'}`);
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

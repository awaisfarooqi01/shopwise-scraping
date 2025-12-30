/**
 * Test Daraz Pagination - URL Collection Only
 * Tests pagination through all pages and counts total product URLs
 * Does NOT scrape individual products (fast test)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DarazScraper = require('../src/scrapers/daraz/daraz-scraper');

async function testPagination() {
  let scraper = null;

  try {
    console.log('🚀 Starting Daraz Pagination Test (URL Collection Only)\n');

    // Connect to database
    console.log('📦 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected\n'); // Initialize scraper
    console.log('🔧 Initializing scraper...');
    scraper = new DarazScraper();
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');

    // Test category URL - you said it has 1971 products
    const categoryUrl = 'https://www.daraz.pk/catalog?q=iphone+15';

    console.log('='.repeat(80));
    console.log('📋 PAGINATION TEST');
    console.log('='.repeat(80));
    console.log(`Category: iPhone 15`);
    console.log(`URL: ${categoryUrl}`);
    console.log(`Goal: Extract ALL product URLs (expecting ~1971)`);
    console.log(`Mode: URL collection only (no product scraping)`);
    console.log('='.repeat(80));

    // Call scrapeListingPage with high maxPages to get all products
    console.log('\n🔄 Starting URL extraction from all pages...\n');

    const startTime = Date.now();

    // Extract all product URLs (no limit on pages or products)
    const productUrls = await scraper.scrapeListingPage(categoryUrl, {
      maxPages: 999, // Very high number to ensure we get all pages
      maxProducts: null, // No product limit
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Results
    console.log('\n' + '='.repeat(80));
    console.log('📊 PAGINATION TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`✅ Total URLs extracted: ${productUrls.length}`);
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log(`📈 Average time per URL: ${(duration / productUrls.length).toFixed(3)} seconds`);
    console.log('='.repeat(80));

    // Show first and last 5 URLs
    console.log('\n📋 First 5 URLs:');
    productUrls.slice(0, 5).forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`);
    });

    if (productUrls.length > 5) {
      console.log('\n📋 Last 5 URLs:');
      productUrls.slice(-5).forEach((url, i) => {
        console.log(`   ${productUrls.length - 4 + i}. ${url}`);
      });
    }

    // Expected vs Actual
    const expected = 1971;
    const difference = Math.abs(productUrls.length - expected);
    const percentage = ((difference / expected) * 100).toFixed(1);

    console.log('\n📊 Comparison with Expected:');
    console.log(`   Expected: ~${expected} products`);
    console.log(`   Actual: ${productUrls.length} products`);
    console.log(`   Difference: ${difference} (${percentage}%)`);

    if (Math.abs(productUrls.length - expected) < 100) {
      console.log('   ✅ Close to expected count!');
    } else if (productUrls.length > expected) {
      console.log('   ℹ️  More products than expected (Daraz may have added more)');
    } else {
      console.log('   ⚠️  Fewer products than expected (may need more pages)');
    }

    console.log('\n✅ Pagination test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (scraper) {
      await scraper.close();
    }
    await mongoose.connection.close();
    console.log('\n🔒 Cleanup complete');
  }
}

// Run the test
testPagination().catch(console.error);

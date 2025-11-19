/**
 * Test Multiple Products - Verify scraper works with different products
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');

async function testMultipleProducts() {
  let scraper = null;
  
  try {
    console.log('🚀 Starting Multiple Products Test\n');
    
    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Initialize scraper
    console.log('🔧 Initializing PriceOye scraper...');
    scraper = new PriceOyeScraper();
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');
    
    // Test products
    const testProducts = [
      {
        name: 'Samsung Galaxy S23 Ultra',
        url: 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra'
      },
      {
        name: 'Apple iPhone 15 Pro Max',
        url: 'https://priceoye.pk/mobiles/apple/apple-iphone-15-pro-max'
      },
      {
        name: 'Infinix Note 40 Pro',
        url: 'https://priceoye.pk/mobiles/infinix/infinix-note-40-pro'
      },
      {
        name: 'Xiaomi Redmi Note 13 Pro',
        url: 'https://priceoye.pk/mobiles/xiaomi/xiaomi-redmi-note-13-pro'
      },
      {
        name: 'OPPO Reno 11 Pro',
        url: 'https://priceoye.pk/mobiles/oppo/oppo-reno-11-pro-5g'
      }
    ];
    
    console.log(`📋 Testing ${testProducts.length} products\n`);
    console.log('='.repeat(80));
    
    const results = [];
    
    for (let i = 0; i < testProducts.length; i++) {
      const testProduct = testProducts[i];
      console.log(`\n[${i + 1}/${testProducts.length}] Testing: ${testProduct.name}`);
      console.log('-'.repeat(80));
      
      try {
        const startTime = Date.now();
        const product = await scraper.scrapeProduct(testProduct.url);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`✅ Success! (${duration}s)`);
        console.log(`   Name: ${product.name}`);
        console.log(`   Price: Rs ${product.price}`);
        console.log(`   Brand: ${product.brand}`);
        console.log(`   Category: ${product.category_name}`);
        console.log(`   Images: ${product.media?.images?.length || 0}`);
        console.log(`   Specs: ${product.specifications?.size || 0}`);
        console.log(`   Rating: ${product.average_rating || 'N/A'}`);
        console.log(`   Availability: ${product.availability}`);
        console.log(`   Database ID: ${product._id}`);
        
        results.push({
          name: testProduct.name,
          status: 'success',
          duration: duration,
          price: product.price,
          images: product.media?.images?.length || 0,
          specs: product.specifications?.size || 0
        });
        
        // Rate limiting - wait 2 seconds between requests
        if (i < testProducts.length - 1) {
          console.log('   ⏳ Waiting 2 seconds before next request...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.log(`❌ Failed!`);
        console.log(`   Error: ${error.message}`);
        
        results.push({
          name: testProduct.name,
          status: 'failed',
          error: error.message
        });
        
        // Continue to next product even if this one failed
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const successRate = ((successful / results.length) * 100).toFixed(2);
    
    console.log(`\nTotal Products: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${successRate}%`);
    
    // Detailed results
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(80));
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.name}`);
      console.log(`   Status: ${result.status === 'success' ? '✅' : '❌'} ${result.status.toUpperCase()}`);
      if (result.status === 'success') {
        console.log(`   Duration: ${result.duration}s`);
        console.log(`   Price: Rs ${result.price}`);
        console.log(`   Images: ${result.images}`);
        console.log(`   Specs: ${result.specs}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Scraper statistics
    const stats = scraper.getStats();
    console.log('\n' + '='.repeat(80));
    console.log('📈 SCRAPER STATISTICS:');
    console.log('='.repeat(80));
    console.log(`Pages Visited: ${stats.pagesVisited}`);
    console.log(`Products Scraped: ${stats.productsScraped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Duration: ${(stats.duration / 1000).toFixed(2)}s`);
    console.log(`Average Time per Product: ${(stats.duration / stats.pagesVisited / 1000).toFixed(2)}s`);
    
    console.log('\n✅ Multiple products test completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    if (scraper) {
      try {
        await scraper.cleanup();
        console.log('✅ Scraper cleaned up');
      } catch (cleanupError) {
        console.error('⚠️  Cleanup error:', cleanupError.message);
      }
    }
    
    try {
      await mongoose.disconnect();
      console.log('✅ Database disconnected');
    } catch (dbError) {
      console.error('⚠️  Database disconnect error:', dbError.message);
    }
    
    console.log('\n👋 Test finished\n');
    process.exit(0);
  }
}

// Run test
testMultipleProducts();

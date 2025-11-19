/**
 * Debug Test Script: Scrape Single Product with Detailed Logging
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');

async function testWithDebug() {
  let scraper = null;
  
  try {
    console.log('🚀 Starting Debug Test\n');
    
    // Connect to database with timeout
    console.log('📡 Connecting to MongoDB...');    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Initialize scraper
    console.log('🔧 Initializing PriceOye scraper...');
    scraper = new PriceOyeScraper();
    
    console.log('🌐 Initializing browser...');
    await scraper.initialize();
    console.log('✅ Browser initialized\n');
    
    // Test product URL
    const productUrl = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';
    
    console.log(`\n🎯 Test Product: ${productUrl}\n`);
    console.log('='.repeat(60));
    
    console.log('⏳ Navigating to product page...');
    
    // Set a timeout for the entire scraping operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Scraping timeout after 60 seconds')), 60000);
    });
    
    const scrapePromise = scraper.scrapeProduct(productUrl);
    
    const product = await Promise.race([scrapePromise, timeoutPromise]);
    
    console.log('✅ Product scraped successfully!\n');
    
    // Display results
    console.log('='.repeat(60));
    console.log('📊 SCRAPED PRODUCT DATA:');
    console.log('='.repeat(60));
    console.log(`Name: ${product.name || 'N/A'}`);
    console.log(`Brand: ${product.brand || 'N/A'} (ID: ${product.brand_id || 'N/A'})`);
    console.log(`Category: ${product.category_name || 'N/A'} (ID: ${product.category_id || 'N/A'})`);
    console.log(`Price: Rs ${product.price || 'N/A'}`);
    if (product.sale_price) {
      console.log(`Sale Price: Rs ${product.sale_price}`);
      console.log(`Discount: ${product.sale_percentage}%`);
    }
    if (product.average_rating) {
      console.log(`Rating: ${product.average_rating}/5 (${product.review_count} reviews)`);
    }
    console.log(`Availability: ${product.availability || 'N/A'}`);
    if (product.delivery_time) {
      console.log(`Delivery: ${product.delivery_time}`);
    }
    console.log(`Images: ${product.media?.images?.length || 0}`);
    console.log(`Specifications: ${product.specifications?.size || 0}`);
    console.log(`URL: ${product.original_url || 'N/A'}`);
    console.log(`Database ID: ${product._id || 'N/A'}`);
    console.log('='.repeat(60));
    
    // Show specifications (first 10)
    if (product.specifications && product.specifications.size > 0) {
      console.log('\n📋 SPECIFICATIONS (First 10):');
      console.log('-'.repeat(60));
      let count = 0;
      for (const [key, value] of product.specifications) {
        if (count++ >= 10) break;
        console.log(`  ${key}: ${value}`);
      }
      if (product.specifications.size > 10) {
        console.log(`  ... and ${product.specifications.size - 10} more`);
      }
    }
    
    // Show mapping metadata
    if (product.mapping_metadata) {
      console.log('\n🔍 MAPPING METADATA:');
      console.log('-'.repeat(60));
      console.log(`  Brand Source: ${product.mapping_metadata.brand_source || 'N/A'}`);
      console.log(`  Brand Confidence: ${product.mapping_metadata.brand_confidence || 'N/A'}`);
      console.log(`  Category Source: ${product.mapping_metadata.category_source || 'N/A'}`);
      console.log(`  Category Confidence: ${product.mapping_metadata.category_confidence || 'N/A'}`);
    }
    
    // Show scraper statistics
    const stats = scraper.getStats();
    console.log('\n📈 SCRAPER STATISTICS:');
    console.log('-'.repeat(60));
    console.log(`  Pages Visited: ${stats.pagesVisited}`);
    console.log(`  Products Scraped: ${stats.productsScraped}`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  Duration: ${stats.duration}ms`);
    
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (scraper) {
      const stats = scraper.getStats();
      console.log('\n📈 Scraper Statistics (at error):');
      console.log(`  Pages Visited: ${stats.pagesVisited}`);
      console.log(`  Products Scraped: ${stats.productsScraped}`);
      console.log(`  Errors: ${stats.errors}`);
    }
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
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
testWithDebug();

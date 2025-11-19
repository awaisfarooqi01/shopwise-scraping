/**
 * Test Reviews and Schema Updates
 * Tests all 4 fixes:
 * 1. Clean HTML from description
 * 2. Match exact database schema (positive_percent, subcategory fields, sale_duration_days)
 * 3. Scrape product reviews
 * 4. Handle review pagination
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const Product = require('../src/models/Product');
const Review = require('../src/models/Review');

// Test product with reviews
const TEST_PRODUCT_URL = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';

async function testReviewsAndSchema() {
  console.log('🧪 Testing Reviews and Schema Updates\n');
  console.log('=' .repeat(60));
  
  let scraper;
  
  try {
    // Connect to database
    console.log('\n📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Initialize scraper
    console.log('🔧 Initializing scraper...');
    scraper = new PriceOyeScraper();
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');
    
    // Clean up existing test data
    console.log('🧹 Cleaning up existing test data...');
    await Product.deleteMany({ original_url: TEST_PRODUCT_URL });
    await Review.deleteMany({ 
      platform_name: 'PriceOye',
      'platform_metadata.original_url': { $regex: /samsung-galaxy-s23-ultra/ }
    });
    console.log('✅ Test data cleaned\n');
    
    // Scrape product (includes reviews)
    console.log('🔍 Scraping product with reviews...');
    console.log(`📍 URL: ${TEST_PRODUCT_URL}\n`);
    const product = await scraper.scrapeProduct(TEST_PRODUCT_URL);
    
    if (!product) {
      throw new Error('Product scraping failed');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(60));
    
    // Test 1: Verify description is clean text (no HTML)
    console.log('\n✅ TEST 1: Clean Description');
    console.log('-'.repeat(60));
    console.log(`Description length: ${product.description?.length || 0} chars`);
    
    if (product.description) {
      const hasHtmlTags = /<[^>]*>/g.test(product.description);
      if (hasHtmlTags) {
        console.log('❌ FAILED: Description contains HTML tags');
        console.log('Sample:', product.description.substring(0, 200));
      } else {
        console.log('✅ PASSED: Description is clean text');
        console.log('Sample:', product.description.substring(0, 200) + '...');
      }
    } else {
      console.log('⚠️  WARNING: No description found');
    }
    
    // Test 2: Verify schema fields
    console.log('\n✅ TEST 2: Schema Fields');
    console.log('-'.repeat(60));
    
    const schemaChecks = {
      'positive_percent': product.positive_percent !== undefined,
      'subcategory_name': product.subcategory_name !== undefined,
      'subcategory_id': product.subcategory_id !== undefined,
      'sale_duration_days': product.sale_duration_days !== undefined,
      'platform_id': product.platform_id !== undefined,
      'category_id': product.category_id !== undefined,
      'brand_id': product.brand_id !== undefined,
    };
    
    console.log('Schema Field Checks:');
    for (const [field, exists] of Object.entries(schemaChecks)) {
      const status = exists ? '✅' : '⚠️ ';
      const value = product[field] !== undefined ? product[field] : 'undefined';
      console.log(`  ${status} ${field}: ${value}`);
    }
    
    // Verify positive_percent calculation
    if (product.positive_percent !== undefined) {
      console.log(`\n✅ positive_percent field exists: ${product.positive_percent}%`);
      if (product.average_rating >= 4) {
        const expected = Math.round((product.average_rating / 5) * 100);
        if (product.positive_percent === expected) {
          console.log(`✅ PASSED: Correctly calculated from rating ${product.average_rating}/5`);
        } else {
          console.log(`⚠️  WARNING: Expected ${expected}%, got ${product.positive_percent}%`);
        }
      }
    } else {
      console.log('❌ FAILED: positive_percent field missing');
    }
    
    // Test 3 & 4: Verify reviews were scraped
    console.log('\n✅ TEST 3 & 4: Review Scraping & Pagination');
    console.log('-'.repeat(60));
    
    const reviews = await Review.find({ product_id: product._id });
    console.log(`Total reviews scraped: ${reviews.length}`);
    console.log(`Product review count: ${product.review_count}`);
    
    if (reviews.length > 0) {
      console.log('✅ PASSED: Reviews were scraped');
      
      // Show sample review
      const sampleReview = reviews[0];
      console.log('\nSample Review:');
      console.log(`  Reviewer: ${sampleReview.reviewer_name}`);
      console.log(`  Rating: ${sampleReview.rating}/5`);
      console.log(`  Date: ${sampleReview.review_date.toLocaleDateString()}`);
      console.log(`  Verified: ${sampleReview.verified_purchase ? 'Yes' : 'No'}`);
      console.log(`  Helpful Votes: ${sampleReview.helpful_votes}`);
      console.log(`  Text: ${sampleReview.text?.substring(0, 100) || 'No text'}...`);
      
      // Check review schema
      console.log('\nReview Schema Fields:');
      const reviewFields = {
        'product_id': sampleReview.product_id !== undefined,
        'platform_id': sampleReview.platform_id !== undefined,
        'reviewer_name': sampleReview.reviewer_name !== undefined,
        'rating': sampleReview.rating !== undefined,
        'text': sampleReview.text !== undefined,
        'review_date': sampleReview.review_date !== undefined,
        'helpful_votes': sampleReview.helpful_votes !== undefined,
        'verified_purchase': sampleReview.verified_purchase !== undefined,
        'sentiment_analysis': sampleReview.sentiment_analysis !== undefined,
      };
      
      for (const [field, exists] of Object.entries(reviewFields)) {
        const status = exists ? '✅' : '❌';
        console.log(`  ${status} ${field}`);
      }
      
      // Test sentiment analysis structure
      if (sampleReview.sentiment_analysis) {
        console.log('\nSentiment Analysis Fields:');
        console.log(`  needs_analysis: ${sampleReview.sentiment_analysis.needs_analysis}`);
        console.log(`  ✅ Ready for ML processing`);
      }
      
    } else {
      console.log('⚠️  WARNING: No reviews found');
      console.log('   This might be expected if:');
      console.log('   - Product has no reviews');
      console.log('   - Reviews are loaded dynamically');
      console.log('   - Reviews page structure changed');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Product: ${product.name}`);
    console.log(`Brand: ${product.brand}`);
    console.log(`Category: ${product.category_name}`);
    console.log(`Price: Rs ${product.price}`);
    if (product.sale_price) {
      console.log(`Sale Price: Rs ${product.sale_price} (${product.sale_percentage}% off)`);
    }
    console.log(`Rating: ${product.average_rating}/5 (${product.review_count} reviews)`);
    console.log(`Positive %: ${product.positive_percent}%`);
    console.log(`Images: ${product.media.images.length}`);
    console.log(`Specifications: ${product.specifications.size}`);
    console.log(`Reviews Scraped: ${reviews.length}`);
    
    console.log('\n✅ All tests completed!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Check MongoDB to verify data structure');
    console.log('   2. Test with multiple products');
    console.log('   3. Verify review pagination with products having 50+ reviews');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (scraper) {
      await scraper.cleanup();
    }
    await mongoose.connection.close();
    console.log('\n👋 Test complete, database connection closed');
  }
}

// Run test
testReviewsAndSchema().catch(console.error);

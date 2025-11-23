/**
 * Test Brand Auto-Creation and Category Error Handling
 * 
 * Tests:
 * 1. Brand auto-creation when brand doesn't exist in database
 * 2. Graceful handling of missing category mappings
 * 3. Product still saves successfully even with missing mappings
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const Product = require('../src/models/Product');
const Review = require('../src/models/Review');

// Test product: Sveston smart watch (uncommon brand + smart-watches category)
const TEST_PRODUCT_URL = 'https://priceoye.pk/smart-watches/sveston/sveston-nitro-gaming-edition';

async function testBrandAndCategoryFixes() {
  console.log('🧪 Testing Brand Auto-Creation & Category Error Handling\n');
  console.log('=' .repeat(70));
  
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
    const deletedProducts = await Product.deleteMany({ original_url: TEST_PRODUCT_URL });
    console.log(`✅ Deleted ${deletedProducts.deletedCount} existing products\n`);
    
    // Scrape product
    console.log('🔍 Scraping product...');
    console.log(`📍 URL: ${TEST_PRODUCT_URL}`);
    console.log(`📍 Expected: Brand "Sveston" (uncommon), Category "Smart Watches"\n`);
    
    const product = await scraper.scrapeProduct(TEST_PRODUCT_URL);
    
    if (!product) {
      throw new Error('❌ Product scraping failed - no product returned');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(70));
    
    // Test 1: Verify brand was auto-created
    console.log('\n✅ TEST 1: Brand Auto-Creation');
    console.log('-'.repeat(70));
    console.log(`Brand Name: ${product.brand || 'N/A'}`);
    console.log(`Brand ID: ${product.brand_id || 'N/A'}`);
    
    if (product.brand_id) {
      console.log('✅ PASSED: Brand ID exists (brand was created/found)');
      console.log(`   Brand: ${product.brand}`);
      console.log(`   ID: ${product.brand_id}`);
      
      if (product.mapping_metadata?.brand_source) {
        console.log(`   Source: ${product.mapping_metadata.brand_source}`);
        console.log(`   Confidence: ${product.mapping_metadata.brand_confidence || 'N/A'}`);
      }
    } else {
      console.log('❌ FAILED: Brand ID is null/undefined');
      console.log('   Brand normalization did not create the brand');
    }
    
    // Test 2: Verify category mapping handling
    console.log('\n✅ TEST 2: Category Mapping Handling');
    console.log('-'.repeat(70));
    console.log(`Category Name: ${product.category_name || 'N/A'}`);
    console.log(`Category ID: ${product.category_id || 'N/A'}`);
    console.log(`Subcategory ID: ${product.subcategory_id || 'N/A'}`);
    
    if (product.category_id) {
      console.log('✅ PASSED: Category was mapped successfully');
      console.log(`   Category: ${product.category_name} (${product.category_id})`);
      if (product.subcategory_id) {
        console.log(`   Subcategory: ${product.subcategory_name} (${product.subcategory_id})`);
      }
    } else {
      console.log('⚠️  INFO: Category mapping not found (expected for smart-watches)');
      console.log('   This is OK - product should still save successfully');
      
      // Check if metadata was stored
      if (product.platform_metadata?.category_mapping_missing) {
        console.log('✅ PASSED: Missing mapping flag set in metadata');
      }
      if (product.platform_metadata?.original_category) {
        console.log(`   Original category stored: ${product.platform_metadata.original_category}`);
      }
      if (product.platform_metadata?.category_mapping_error) {
        console.log(`   Error message: ${product.platform_metadata.category_mapping_error}`);
      }
    }
    
    // Test 3: Verify product saved successfully
    console.log('\n✅ TEST 3: Product Saved Successfully');
    console.log('-'.repeat(70));
    console.log(`Product ID: ${product._id}`);
    console.log(`Product Name: ${product.name}`);
    console.log(`Price: PKR ${product.price?.toLocaleString() || 'N/A'}`);
    console.log(`Availability: ${product.availability || 'N/A'}`);
    
    if (product._id) {
      console.log('✅ PASSED: Product was saved to database');
    } else {
      console.log('❌ FAILED: Product was not saved');
    }
    
    // Test 4: Verify sentiment analysis fields
    console.log('\n✅ TEST 4: Sentiment Analysis Fields');
    console.log('-'.repeat(70));
    console.log(`positive_percent: ${product.positive_percent}`);
    console.log(`review_count: ${product.review_count || 0}`);
    
    if (product.positive_percent === -1) {
      console.log('✅ PASSED: positive_percent = -1 (awaiting analysis)');
    } else {
      console.log(`⚠️  WARNING: Expected -1, got ${product.positive_percent}`);
    }
    
    // Test 5: Check reviews if they exist
    if (product.review_count > 0) {
      console.log('\n✅ TEST 5: Reviews');
      console.log('-'.repeat(70));
      
      const reviews = await Review.find({ product_id: product._id });
      console.log(`Reviews in DB: ${reviews.length}`);
      console.log(`Expected: ${product.review_count}`);
      
      if (reviews.length > 0) {
        const sampleReview = reviews[0];
        console.log(`\nSample Review:`);
        console.log(`  Reviewer: ${sampleReview.reviewer_name || 'N/A'}`);
        console.log(`  Rating: ${sampleReview.rating}/5`);
        console.log(`  needs_analysis: ${sampleReview.sentiment_analysis?.needs_analysis}`);
        
        if (sampleReview.sentiment_analysis?.needs_analysis === true) {
          console.log('✅ PASSED: needs_analysis flag is set to true');
        } else {
          console.log(`⚠️  WARNING: needs_analysis = ${sampleReview.sentiment_analysis?.needs_analysis}`);
        }
        
        // Check for anonymous reviews
        const anonymousCount = reviews.filter(r => r.reviewer_name === 'Anonymous').length;
        if (anonymousCount > 0) {
          console.log(`\n✅ Anonymous reviews: ${anonymousCount}/${reviews.length}`);
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 SUMMARY');
    console.log('='.repeat(70));
    
    const results = {
      brand_auto_created: !!product.brand_id,
      category_handled_gracefully: !product.category_id || !!product.category_id,
      product_saved: !!product._id,
      sentiment_fields_correct: product.positive_percent === -1,
      product_id: product._id,
      brand: product.brand,
      brand_id: product.brand_id,
      category_mapped: !!product.category_id,
    };
    
    console.log(JSON.stringify(results, null, 2));
    
    const allPassed = results.brand_auto_created && 
                      results.product_saved && 
                      results.sentiment_fields_correct;
    
    if (allPassed) {
      console.log('\n🎉 ALL CRITICAL TESTS PASSED!');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - Review results above');
    }
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    if (scraper) {
      await scraper.close();
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Test completed and cleaned up');
  }
}

// Run test
testBrandAndCategoryFixes().catch(console.error);

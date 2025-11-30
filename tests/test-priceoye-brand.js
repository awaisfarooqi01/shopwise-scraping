/**
 * Test Brand Scraping
 * Tests scraping entire brand catalog with all features:
 * 1. Clean HTML from descriptions
 * 2. Match exact database schema (positive_percent = -1 for unanalyzed reviews)
 * 3. Scrape product reviews with pagination
 * 4. Verify data consistency across multiple products
 * 5. Test brand normalization
 * 6. Test category mapping
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const Product = require('../src/models/Product');
const Review = require('../src/models/Review');
const { logger } = require('../src/utils/logger');

// Test brand - Nothing (smaller catalog, faster testing)
const TEST_BRAND_URL = 'https://priceoye.pk/mobiles/';
const TEST_BRAND_NAME = 'Apple';

// Statistics tracking
const stats = {
  totalProducts: 0,
  successfulProducts: 0,
  failedProducts: 0,
  totalReviews: 0,
  productsWithReviews: 0,
  productsWithImages: 0,
  productsWithSpecs: 0,
  schemaValidationPassed: 0,
  schemaValidationFailed: 0,
  errors: [],
};

async function testBrandScraping() {
  console.log('🧪 Testing Brand Scraping (Nothing Phones)\n');
  console.log('=' .repeat(70));
  
  let scraper;
  const scrapedProducts = [];
  
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
    
    // Optional: Clean up existing test data
    // const shouldCleanup = process.argv.includes('--clean');
    // if (shouldCleanup) {
    //   console.log('🧹 Cleaning up existing Nothing brand products...');
    //   const deleteResult = await Product.deleteMany({ 
    //     brand: { $regex: /^nothing$/i } 
    //   });
    //   console.log(`   Deleted ${deleteResult.deletedCount} existing products`);
      
    //   const reviewDeleteResult = await Review.deleteMany({
    //     platform_name: 'PriceOye',
    //   });
    //   console.log(`   Deleted ${reviewDeleteResult.deletedCount} existing reviews\n`);
    // }
    
    console.log('=' .repeat(70));
    console.log('🏷️  STARTING BRAND SCRAPING');
    console.log('=' .repeat(70));
    console.log(`📍 Brand URL: ${TEST_BRAND_URL}`);
    console.log(`🏢 Brand Name: ${TEST_BRAND_NAME}\n`);
    
    // Scrape the entire brand
    console.log('🔍 Discovering products...\n');
    //https://priceoye.pk/bluetooth-speakers/faster
    // const products = await scraper.scrapeBrand('qmobile', 'mobiles');
    const products = await scraper.scrapeBrandByUrl('https://priceoye.pk/power-banks');
    
    stats.totalProducts = products.length;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 VERIFICATION & ANALYSIS');
    console.log('='.repeat(70));
    
    // Analyze each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      if (!product) {
        stats.failedProducts++;
        continue;
      }
      
      stats.successfulProducts++;
      scrapedProducts.push(product);
      
      console.log(`\n[${i + 1}/${products.length}] Analyzing: ${product.name}`);
      console.log('-'.repeat(70));
      
      // Test 1: Verify schema compliance
      const schemaCheck = validateProductSchema(product);
      if (schemaCheck.valid) {
        stats.schemaValidationPassed++;
        console.log('✅ Schema validation: PASSED');
      } else {
        stats.schemaValidationFailed++;
        console.log('❌ Schema validation: FAILED');
        console.log('   Missing fields:', schemaCheck.missingFields.join(', '));
        stats.errors.push({
          product: product.name,
          type: 'schema',
          fields: schemaCheck.missingFields,
        });
      }
      
      // Test 2: Verify description is clean
      if (product.description) {
        const hasHtml = /<[^>]*>/g.test(product.description);
        if (hasHtml) {
          console.log('❌ Description contains HTML tags');
          stats.errors.push({
            product: product.name,
            type: 'html_in_description',
          });
        } else {
          console.log('✅ Description is clean text');
        }
      }
      
      // Test 3: Verify positive_percent is -1 (unanalyzed)
      if (product.positive_percent === -1) {
        console.log('✅ positive_percent = -1 (awaiting sentiment analysis)');
      } else if (product.positive_percent >= 0 && product.positive_percent <= 100) {
        console.log(`⚠️  positive_percent = ${product.positive_percent}% (already analyzed)`);
      } else {
        console.log(`❌ positive_percent = ${product.positive_percent} (invalid value)`);
        stats.errors.push({
          product: product.name,
          type: 'invalid_positive_percent',
          value: product.positive_percent,
        });
      }
      
      // Test 4: Check reviews
      const reviews = await Review.find({ product_id: product._id });
      if (reviews.length > 0) {
        stats.productsWithReviews++;
        stats.totalReviews += reviews.length;
        console.log(`✅ Reviews: ${reviews.length} scraped`);
        
        // Verify review schema
        const sampleReview = reviews[0];
        const reviewSchemaCheck = validateReviewSchema(sampleReview);
        if (reviewSchemaCheck.valid) {
          console.log('✅ Review schema: PASSED');
        } else {
          console.log('❌ Review schema: FAILED');
          console.log('   Missing fields:', reviewSchemaCheck.missingFields.join(', '));
        }
        
        // Check sentiment analysis flag
        const needsAnalysis = reviews.filter(r => r.sentiment_analysis?.needs_analysis).length;
        console.log(`✅ Reviews needing analysis: ${needsAnalysis}/${reviews.length}`);
      } else {
        console.log('ℹ️  No reviews scraped');
      }
      
      // Test 5: Verify media
      if (product.media?.images?.length > 0) {
        stats.productsWithImages++;
        console.log(`✅ Images: ${product.media.images.length}`);
      } else {
        console.log('⚠️  No images found');
      }
      
      // Test 6: Verify specifications
      if (product.specifications && product.specifications.size > 0) {
        stats.productsWithSpecs++;
        console.log(`✅ Specifications: ${product.specifications.size}`);
      } else {
        console.log('⚠️  No specifications found');
      }
      
      // Display key details
      console.log(`\nProduct Details:`);
      console.log(`  Brand: ${product.brand} (ID: ${product.brand_id || 'N/A'})`);
      console.log(`  Category: ${product.category_name} (ID: ${product.category_id || 'N/A'})`);
      console.log(`  Price: Rs ${product.price.toLocaleString()}`);
      if (product.sale_price) {
        console.log(`  Sale: Rs ${product.sale_price.toLocaleString()} (-${product.sale_percentage}%)`);
      }
      console.log(`  Rating: ${product.average_rating}/5 (${product.review_count} reviews)`);
      console.log(`  Availability: ${product.availability}`);
    }
    
    // Final Summary Report
    console.log('\n' + '='.repeat(70));
    console.log('📈 FINAL SUMMARY REPORT');
    console.log('='.repeat(70));
    
    console.log('\n📊 Product Statistics:');
    console.log(`  Total products found: ${stats.totalProducts}`);
    console.log(`  Successfully scraped: ${stats.successfulProducts}`);
    console.log(`  Failed to scrape: ${stats.failedProducts}`);
    console.log(`  Success rate: ${((stats.successfulProducts / stats.totalProducts) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Schema Validation:');
    console.log(`  Passed: ${stats.schemaValidationPassed}`);
    console.log(`  Failed: ${stats.schemaValidationFailed}`);
    console.log(`  Pass rate: ${((stats.schemaValidationPassed / stats.successfulProducts) * 100).toFixed(1)}%`);
    
    console.log('\n💬 Reviews Statistics:');
    console.log(`  Total reviews scraped: ${stats.totalReviews}`);
    console.log(`  Products with reviews: ${stats.productsWithReviews}`);
    console.log(`  Average reviews per product: ${(stats.totalReviews / stats.productsWithReviews || 0).toFixed(1)}`);
    
    console.log('\n🖼️  Media Statistics:');
    console.log(`  Products with images: ${stats.productsWithImages}`);
    console.log(`  Coverage: ${((stats.productsWithImages / stats.successfulProducts) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Specification Statistics:');
    console.log(`  Products with specs: ${stats.productsWithSpecs}`);
    console.log(`  Coverage: ${((stats.productsWithSpecs / stats.successfulProducts) * 100).toFixed(1)}%`);
    
    // Error Report
    if (stats.errors.length > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      console.log('-'.repeat(70));
      
      const errorsByType = {};
      stats.errors.forEach(error => {
        if (!errorsByType[error.type]) {
          errorsByType[error.type] = [];
        }
        errorsByType[error.type].push(error);
      });
      
      for (const [type, errors] of Object.entries(errorsByType)) {
        console.log(`\n  ${type.toUpperCase().replace(/_/g, ' ')}:`);
        errors.forEach(err => {
          console.log(`    • ${err.product}`);
          if (err.fields) {
            console.log(`      Missing: ${err.fields.join(', ')}`);
          }
          if (err.value !== undefined) {
            console.log(`      Value: ${err.value}`);
          }
        });
      }
    }
    
    // Data Quality Report
    console.log('\n' + '='.repeat(70));
    console.log('✅ DATA QUALITY CHECKS');
    console.log('='.repeat(70));
    
    const qualityChecks = {
      'All products have clean descriptions': stats.errors.filter(e => e.type === 'html_in_description').length === 0,
      'All products have positive_percent = -1': stats.errors.filter(e => e.type === 'invalid_positive_percent').length === 0,
      'Schema validation pass rate > 90%': (stats.schemaValidationPassed / stats.successfulProducts) > 0.9,
      'Image coverage > 80%': (stats.productsWithImages / stats.successfulProducts) > 0.8,
      'Specification coverage > 80%': (stats.productsWithSpecs / stats.successfulProducts) > 0.8,
    };
    
    for (const [check, passed] of Object.entries(qualityChecks)) {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    }
    
    // Next Steps
    console.log('\n' + '='.repeat(70));
    console.log('💡 NEXT STEPS');
    console.log('='.repeat(70));
    console.log('\n1. ✅ Products scraped and saved to database');
    console.log('2. ⏳ Run sentiment analysis on reviews:');
    console.log('   npm run analyze-sentiment');
    console.log('3. ⏳ After analysis, positive_percent will be updated automatically');
    console.log('4. ✅ Frontend can check: positive_percent === -1 means "analysis pending"');
    console.log('5. ✅ Frontend can check: positive_percent >= 0 means "analysis complete"');
    
    console.log('\n📁 Database Collections:');
    console.log(`   Products: ${stats.successfulProducts} documents`);
    console.log(`   Reviews: ${stats.totalReviews} documents`);
    console.log(`   Brand: ${TEST_BRAND_NAME}`);
    
    // Sample MongoDB queries
    console.log('\n🔍 Sample MongoDB Queries:');
    console.log('   // Get all Nothing products');
    console.log('   db.products.find({ brand: "Nothing" })');
    console.log('\n   // Get products awaiting sentiment analysis');
    console.log('   db.products.find({ positive_percent: -1 })');
    console.log('\n   // Get reviews needing analysis');
    console.log('   db.reviews.find({ "sentiment_analysis.needs_analysis": true })');
    
    // Test completion status
    console.log('\n' + '='.repeat(70));
    const allTestsPassed = Object.values(qualityChecks).every(v => v);
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED!');
    } else {
      console.log('⚠️  SOME TESTS FAILED - Review errors above');
    }
    console.log('='.repeat(70));
    
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

/**
 * Validate product schema compliance
 */
function validateProductSchema(product) {
  const requiredFields = [
    'name',
    'brand',
    'category_name',
    'price',
    'currency',
    'platform_id',
    'platform_name',
    'original_url',
    'average_rating',
    'review_count',
    'positive_percent',
    'availability',
    'media',
    'specifications',
    'is_active',
  ];
  
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (product[field] === undefined || product[field] === null) {
      missingFields.push(field);
    }
  }
  
  // Special validation for nested fields
  if (!product.media?.images) {
    missingFields.push('media.images');
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate review schema compliance
 */
function validateReviewSchema(review) {
  const requiredFields = [
    'product_id',
    'platform_id',
    'platform_name',
    'reviewer_name',
    'rating',
    'review_date',
    'sentiment_analysis',
    'is_active',
  ];
  
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (review[field] === undefined || review[field] === null) {
      missingFields.push(field);
    }
  }
  
  // Special validation for sentiment_analysis
  if (!review.sentiment_analysis?.needs_analysis === undefined) {
    missingFields.push('sentiment_analysis.needs_analysis');
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

// Run test
console.log('🚀 Starting Brand Scraping Test...');
console.log('📌 Use --clean flag to remove existing data first\n');

testBrandScraping().catch(console.error);

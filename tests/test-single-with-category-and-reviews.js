/**
 * Test Script: Scrape Single Product with Category Mapping & Reviews Verification
 * Tests the PriceOye scraper with category mapping and review extraction
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const logger = require('../src/utils/logger');

async function testSingleProductComplete() {
  try {
    logger.info('🚀 Starting Complete Single Product Test\n');
    logger.info('This test will verify:');
    logger.info('  1. ✅ Category mapping (Mobiles → Mobile Phones under Electronics)');
    logger.info('  2. ✅ Review extraction and saving to database\n');
    
    // Connect to database
    logger.info('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB\n');
    
    // Get models
    const Product = mongoose.model('Product');
    const Review = mongoose.model('Review');
    const Category = mongoose.model('Category');
    
    // Initialize scraper
    const scraper = new PriceOyeScraper();
    await scraper.initialize();
    
    // Test product URL - Samsung Galaxy S23 Ultra (has reviews)
    const productUrl = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';
    
    logger.info(`\n🎯 Test Product: ${productUrl}\n`);
    logger.info('='  .repeat(80));
    
    // Scrape product
    logger.info('🔄 Scraping product...\n');
    const product = await scraper.scrapeProduct(productUrl);
    
    // ========== DISPLAY BASIC PRODUCT INFO ==========
    logger.info('\n' + '='.repeat(80));
    logger.info('📦 PRODUCT DATA:');
    logger.info('='.repeat(80));
    logger.info(`✅ Name: ${product.name}`);
    logger.info(`✅ Brand: ${product.brand} (ID: ${product.brand_id})`);
    logger.info(`✅ Price: Rs ${product.price.toLocaleString()}`);
    if (product.sale_price) {
      logger.info(`💰 Sale Price: Rs ${product.sale_price.toLocaleString()} (${product.sale_percentage}% off)`);
    }
    logger.info(`⭐ Rating: ${product.average_rating}/5 (${product.review_count} reviews)`);
    logger.info(`📦 Availability: ${product.availability}`);
    logger.info(`🆔 Database ID: ${product._id}`);
    
    // ========== VERIFY CATEGORY MAPPING ==========
    logger.info('\n' + '='.repeat(80));
    logger.info('🗂️  CATEGORY MAPPING VERIFICATION:');
    logger.info('='.repeat(80));
    
    logger.info(`📋 Original Platform Category: "${product.platform_metadata?.original_category || product.category_name}"`);
    
    if (product.category_id) {
      const category = await Category.findById(product.category_id);
      logger.info(`✅ Mapped Parent Category: ${category.name} (ID: ${product.category_id})`);
    } else {
      logger.info(`❌ Parent Category ID: NOT MAPPED`);
    }
    
    if (product.subcategory_id) {
      const subcategory = await Category.findById(product.subcategory_id);
      logger.info(`✅ Mapped Subcategory: ${subcategory.name} (ID: ${product.subcategory_id})`);
    } else {
      logger.info(`❌ Subcategory ID: NOT MAPPED`);
    }
    
    if (product.mapping_metadata) {
      logger.info(`\n📊 Mapping Metadata:`);
      logger.info(`   - Category Source: ${product.mapping_metadata.category_source}`);
      logger.info(`   - Category Confidence: ${product.mapping_metadata.category_confidence}`);
      if (product.mapping_metadata.brand_source) {
        logger.info(`   - Brand Source: ${product.mapping_metadata.brand_source}`);
        logger.info(`   - Brand Confidence: ${product.mapping_metadata.brand_confidence}`);
      }
    }
    
    // ========== VERIFY REVIEWS ==========
    logger.info('\n' + '='.repeat(80));
    logger.info('💬 REVIEW EXTRACTION VERIFICATION:');
    logger.info('='.repeat(80));
    
    const reviews = await Review.find({ product_id: product._id }).sort({ created_at: -1 });
    
    logger.info(`✅ Reviews in Database: ${reviews.length}`);
    logger.info(`📊 Product Review Count: ${product.review_count}`);
    
    if (reviews.length > 0) {
      logger.info(`\n📝 Sample Reviews (showing first 3):\n`);
      
      reviews.slice(0, 3).forEach((review, index) => {
        logger.info(`   ${index + 1}. ${review.reviewer_name || 'Anonymous'}`);
        logger.info(`      ⭐ Rating: ${review.rating}/5`);
        logger.info(`      ✓ Verified: ${review.is_verified ? 'Yes' : 'No'}`);
        logger.info(`      📅 Date: ${review.review_date?.toLocaleDateString() || 'N/A'}`);
        logger.info(`      💭 Review: ${review.review_text?.substring(0, 100)}...`);
        if (review.sentiment_analysis?.sentiment) {
          logger.info(`      😊 Sentiment: ${review.sentiment_analysis.sentiment} (${review.sentiment_analysis.confidence})`);
        }
        logger.info('');
      });
      
      // Review statistics
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      const verifiedCount = reviews.filter(r => r.is_verified).length;
      const sentiments = reviews.reduce((acc, r) => {
        const sentiment = r.sentiment_analysis?.sentiment || 'unknown';
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      }, {});
      
      logger.info(`\n📊 Review Statistics:`);
      logger.info(`   - Average Rating: ${avgRating.toFixed(2)}/5`);
      logger.info(`   - Verified Reviews: ${verifiedCount}/${reviews.length}`);
      logger.info(`   - Sentiments: ${JSON.stringify(sentiments)}`);
    } else {
      logger.info(`⚠️  No reviews found in database!`);
    }
    
    // ========== FINAL STATUS ==========
    logger.info('\n' + '='.repeat(80));
    logger.info('✅ TEST RESULTS:');
    logger.info('='.repeat(80));
    
    const categoryMapped = product.category_id && product.subcategory_id;
    const reviewsScraped = reviews.length > 0;
    
    logger.info(`${categoryMapped ? '✅' : '❌'} Category Mapping: ${categoryMapped ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`${reviewsScraped ? '✅' : '❌'} Review Scraping: ${reviewsScraped ? 'SUCCESS' : 'FAILED'}`);
    
    if (categoryMapped && reviewsScraped) {
      logger.info('\n🎉 ALL TESTS PASSED! 🎉');
    } else {
      logger.info('\n⚠️  SOME TESTS FAILED - Check logs above');
    }
    
    // Cleanup
    await scraper.cleanup();
    
    logger.info('\n✅ Test completed!\n');
    
  } catch (error) {
    logger.error('\n❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run test
testSingleProductComplete();

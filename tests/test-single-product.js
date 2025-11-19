/**
 * Test Script: Scrape Single Product
 * Tests the PriceOye scraper with a single product URL
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const logger = require('../src/utils/logger');

async function testSingleProduct() {
  try {
    logger.info('🚀 Starting Single Product Scrape Test\n');
    
    // Connect to database
    logger.info('📡 Connecting to MongoDB...');    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB\n');
    
    // Initialize scraper
    const scraper = new PriceOyeScraper();
    await scraper.initialize();
    
    // Test product URL
    const productUrl = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';
    
    logger.info(`\n🎯 Test Product: ${productUrl}\n`);
    logger.info('='  .repeat(60));
    
    // Scrape product
    const product = await scraper.scrapeProduct(productUrl);
    
    // Display results
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 SCRAPED PRODUCT DATA:');
    logger.info('='.repeat(60));
    logger.info(`Name: ${product.name}`);
    logger.info(`Brand: ${product.brand} (ID: ${product.brand_id})`);
    logger.info(`Category: ${product.category_name} (ID: ${product.category_id})`);
    logger.info(`Price: Rs ${product.price}`);
    if (product.sale_price) {
      logger.info(`Sale Price: Rs ${product.sale_price}`);
      logger.info(`Discount: ${product.sale_percentage}%`);
    }
    if (product.average_rating) {
      logger.info(`Rating: ${product.average_rating}/5 (${product.review_count} reviews)`);
    }
    logger.info(`Availability: ${product.availability}`);
    if (product.delivery_time) {
      logger.info(`Delivery: ${product.delivery_time}`);
    }
    logger.info(`Images: ${product.media?.images?.length || 0}`);
    logger.info(`Specifications: ${product.specifications?.size || 0}`);
    logger.info(`URL: ${product.original_url}`);
    logger.info(`Database ID: ${product._id}`);
    logger.info('='.repeat(60));
    
    // Show specifications
    if (product.specifications && product.specifications.size > 0) {
      logger.info('\n📋 SPECIFICATIONS:');
      logger.info('-'.repeat(60));
      for (const [key, value] of product.specifications) {
        logger.info(`  ${key}: ${value}`);
      }
    }
    
    // Show mapping metadata
    if (product.mapping_metadata) {
      logger.info('\n🔍 MAPPING METADATA:');
      logger.info('-'.repeat(60));
      logger.info(`  Brand Source: ${product.mapping_metadata.brand_source}`);
      logger.info(`  Brand Confidence: ${product.mapping_metadata.brand_confidence}`);
      logger.info(`  Category Source: ${product.mapping_metadata.category_source}`);
      logger.info(`  Category Confidence: ${product.mapping_metadata.category_confidence}`);
    }
    
    // Cleanup
    await scraper.cleanup();
    
    logger.info('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    logger.error('\n❌ Test failed:', error);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run test
testSingleProduct();

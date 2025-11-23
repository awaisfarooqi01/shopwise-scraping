/**
 * Test Category Auto-Creation
 * Tests if unmapped categories are auto-created under "Unmapped Products"
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

// Test with a smart watch (likely unmapped category)
// Updated to a valid product URL - testing with a smartwatch
const TEST_URL = 'https://priceoye.pk/smart-watches/xiaomi/xiaomi-redmi-watch-3-active';

async function testCategoryAutoCreation() {
  console.log('🧪 Testing Category Auto-Creation\n');
  
  let scraper;
  
  try {
    // Connect to database
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');
    
    // Check UNMAPPED_CATEGORY_ID
    console.log('🔍 Checking UNMAPPED_CATEGORY_ID...');
    const unmappedCategoryId = process.env.UNMAPPED_CATEGORY_ID;
    
    if (!unmappedCategoryId) {
      throw new Error('UNMAPPED_CATEGORY_ID not set in .env file');
    }
    
    const unmappedCategory = await Category.findById(unmappedCategoryId);
    if (!unmappedCategory) {
      throw new Error(`Unmapped category not found: ${unmappedCategoryId}`);
    }
    
    console.log(`✅ Unmapped Category: ${unmappedCategory.name} (${unmappedCategory._id})\n`);
    
    // Initialize scraper
    console.log('🔧 Initializing scraper...');
    scraper = new PriceOyeScraper();
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');
    
    // Scrape product
    console.log('🔍 Scraping product...');
    console.log(`📍 URL: ${TEST_URL}\n`);
    const product = await scraper.scrapeProduct(TEST_URL);
    
    if (!product) {
      throw new Error('Product scraping failed');
    }
    
    // Verify results
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS');
    console.log('='.repeat(60));
    console.log(`Product: ${product.name}`);
    console.log(`Brand: ${product.brand} (ID: ${product.brand_id})`);
    console.log(`Category: ${product.category_name} (ID: ${product.category_id})`);
    console.log(`Subcategory: ${product.subcategory_name} (ID: ${product.subcategory_id})`);
    
    // Check if auto-created
    if (product.category_id?.toString() === unmappedCategoryId) {
      console.log('\n✅ Category auto-created under "Unmapped Products"!');
      
      // Find the auto-created subcategory
      if (product.subcategory_id) {
        const subcategory = await Category.findById(product.subcategory_id);
        if (subcategory) {
          console.log(`\n📦 Auto-Created Subcategory:`);
          console.log(`   Name: ${subcategory.name}`);
          console.log(`   ID: ${subcategory._id}`);
          console.log(`   Parent: ${subcategory.parent_category_id}`);
          console.log(`   Level: ${subcategory.level}`);
          console.log(`   Auto-Created: ${subcategory.metadata?.auto_created}`);
        }
      }
      
      // Check metadata
      if (product.platform_metadata?.auto_created_category) {
        console.log(`\n✅ Metadata flag set: auto_created_category = true`);
      }
      
      if (product.mapping_metadata?.needs_review) {
        console.log(`✅ Metadata flag set: needs_review = true`);
      }
    } else if (product.category_id) {
      console.log('\n✅ Category was mapped via CategoryMapping (not auto-created)');
    } else {
      console.log('\n❌ Category is NULL - auto-creation failed!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (scraper) {
      await scraper.cleanup();
    }
    await mongoose.connection.close();
    console.log('\n👋 Done');
  }
}

testCategoryAutoCreation().catch(console.error);

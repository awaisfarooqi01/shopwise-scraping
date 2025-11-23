/**
 * Test Smart Watch Category Matching
 * Verifies that products match existing categories in DB before creating under "Unmapped"
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

// Test URL: Tecno Watch 3 (Smart Watches category)
const TEST_URL = 'https://priceoye.pk/smart-watches/tecno/tecno-watch-3-wo3';

async function testSmartWatchCategory() {
  console.log('🧪 Testing Smart Watch Category Matching\n');
  
  let scraper;
  
  try {
    // Connect to database
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');
    
    // Check if "Smart Watches" category exists in DB
    console.log('🔍 Checking for "Smart Watches" category in database...');
    const smartWatchesCategory = await Category.findOne({
      name: { $regex: /^Smart Watches$/i }
    });
    
    if (smartWatchesCategory) {
      console.log(`✅ Found "Smart Watches" category in DB:`);
      console.log(`   ID: ${smartWatchesCategory._id}`);
      console.log(`   Name: ${smartWatchesCategory.name}`);
      console.log(`   Parent: ${smartWatchesCategory.parent_category_id}`);
      console.log(`   Level: ${smartWatchesCategory.level}`);
    } else {
      console.log('⚠️  "Smart Watches" category NOT found in DB');
      console.log('   Test will verify auto-creation under "Unmapped Products"');
    }
    
    // Check UNMAPPED_CATEGORY_ID
    console.log('\n🔍 Checking UNMAPPED_CATEGORY_ID...');
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
    
    // Delete product if already exists (for clean test)
    console.log('🗑️  Cleaning up any existing product...');
    await Product.deleteOne({ original_url: TEST_URL });
    console.log('✅ Cleanup complete\n');
    
    // Scrape product
    console.log('🔍 Scraping product...');
    console.log(`📍 URL: ${TEST_URL}\n`);
    const product = await scraper.scrapeProduct(TEST_URL);
    
    if (!product) {
      throw new Error('Product scraping failed');
    }
    
    // Verify results
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));
    console.log(`Product: ${product.name}`);
    console.log(`Brand: ${product.brand} (ID: ${product.brand_id})`);
    console.log(`Category: ${product.category_name} (ID: ${product.category_id})`);
    console.log(`Subcategory: ${product.subcategory_name} (ID: ${product.subcategory_id})`);
    
    // Analyze category assignment
    console.log('\n' + '='.repeat(80));
    console.log('🔍 CATEGORY ANALYSIS');
    console.log('='.repeat(80));
    
    if (smartWatchesCategory) {
      // Legitimate category exists - should use it
      const usedLegitimateCategory = product.category_id?.toString() === smartWatchesCategory._id.toString() ||
                                      product.subcategory_id?.toString() === smartWatchesCategory._id.toString();
      
      if (usedLegitimateCategory) {
        console.log('✅ CORRECT: Product used existing "Smart Watches" category');
        console.log('✅ Did NOT create under "Unmapped Products"');
        console.log(`   Category ID: ${product.category_id}`);
        console.log(`   Subcategory ID: ${product.subcategory_id}`);
        console.log(`   Matched DB Category: ${smartWatchesCategory._id}`);
        
        if (product.platform_metadata?.matched_existing_category) {
          console.log('✅ Metadata flag set: matched_existing_category = true');
        }
        
        if (product.mapping_metadata?.needs_review === false) {
          console.log('✅ Metadata flag set: needs_review = false (no admin review needed)');
        }
        
      } else {
        console.log('❌ ERROR: Product did NOT use existing "Smart Watches" category!');
        console.log('❌ Should have matched existing category instead of creating new one');
        console.log(`   Expected category ID: ${smartWatchesCategory._id}`);
        console.log(`   Got category ID: ${product.category_id}`);
        console.log(`   Got subcategory ID: ${product.subcategory_id}`);
        
        // Check if it was incorrectly created under "Unmapped"
        if (product.category_id?.toString() === unmappedCategoryId) {
          console.log('❌ Product was incorrectly placed under "Unmapped Products"');
        }
      }
    } else {
      // No legitimate category - should create under "Unmapped"
      if (product.category_id?.toString() === unmappedCategoryId) {
        console.log('✅ CORRECT: No legitimate category found - created under "Unmapped Products"');
        console.log(`   Parent: Unmapped Products (${unmappedCategoryId})`);
        console.log(`   Child: ${product.subcategory_name} (${product.subcategory_id})`);
        
        if (product.platform_metadata?.auto_created_category) {
          console.log('✅ Metadata flag set: auto_created_category = true');
        }
        
        if (product.mapping_metadata?.needs_review) {
          console.log('✅ Metadata flag set: needs_review = true');
        }
      } else {
        console.log('⚠️  Unexpected category assignment');
        console.log(`   Category ID: ${product.category_id}`);
        console.log(`   Subcategory ID: ${product.subcategory_id}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
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

testSmartWatchCategory().catch(console.error);

/**
 * Test Category Mapping Fix
 * Verify that platform_id is passed correctly and mapping works
 */
const mongoose = require('mongoose');
const NormalizationService = require('./src/services/normalization-service');

async function test() {
  try {
    console.log('🔍 Step 1: Connect to database...');
    await mongoose.connect('mongodb://localhost:27017/shopwise');
    console.log('✅ Connected\n');
    
    const Platform = mongoose.model('Platform');
    const platform = await Platform.findOne({ name: 'PriceOye' });
    
    if (!platform) {
      console.error('❌ Platform not found!');
      process.exit(1);
    }
    
    console.log(`✅ Found Platform: ${platform.name} (ID: ${platform._id})\n`);
    
    console.log('🔍 Step 2: Test category mapping...');
    console.log('   Input: "Mobile Phones" (after normalization from "Mobiles")');
    console.log(`   Platform ID: ${platform._id}\n`);
    
    const normalizationService = new NormalizationService({
      cacheEnabled: false // Disable cache for testing
    });
    
    // This simulates what the scraper does:
    // 1. Normalize "Mobiles" → "Mobile Phones"
    // 2. Call mapCategory with platform_id
    const result = await normalizationService.mapCategory(
      platform._id.toString(), 
      'Mobile Phones',
      false // autoCreate
    );
    
    console.log('📋 RESULT:');
    console.log('   category_id:', result.category_id);
    console.log('   subcategory_id:', result.subcategory_id);
    console.log('   category_name:', result.category_name);
    console.log('   subcategory_name:', result.subcategory_name);
    console.log('   confidence:', result.confidence);
    console.log('   source:', result.source);
    console.log('   needs_review:', result.needs_review);
    
    if (result.category_id && result.subcategory_id) {
      console.log('\n✅ SUCCESS! Mapping works correctly!');
      console.log('   The scraper should now save products with both category_id and subcategory_id');
    } else {
      console.log('\n❌ FAILED! Missing category_id or subcategory_id');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

test();

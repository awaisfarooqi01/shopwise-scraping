/**
 * Test Category Mapping Fix
 * Tests that the scraper correctly maps "Mobiles" → "Mobile Phones" using CategoryMapping
 */

const PriceOyeScraper = require('./src/scrapers/priceoye/priceoye-scraper');
const logger = require('./src/utils/logger');
const normalizationService = require('./src/services/normalization-service');

async function testCategoryMapping() {
  console.log('\n🧪 TEST: Category Mapping via CategoryMapping Collection\n');
  console.log('========================================================\n');
  
  try {
    // Initialize scraper
    console.log('📋 Step 1: Initializing scraper...');
    const scraper = new PriceOyeScraper({ headless: true });
    await scraper.initialize();
    console.log(`✅ Scraper initialized for platform: ${scraper.platform.name} (ID: ${scraper.platform._id})\n`);
    
    // Test URL
    const testUrl = 'https://priceoye.pk/mobiles/vivo-y19s-price-pakistan';
    console.log(`📋 Step 2: Scraping product...`);
    console.log(`   URL: ${testUrl}\n`);
    
    // Scrape product
    const result = await scraper.scrapeProduct(testUrl);
    
    // Display results
    console.log('\n📊 RESULTS:\n');
    console.log('========================================================');
    console.log(`Product Name: ${result.name}`);
    console.log(`Platform Category: "${result.platform_metadata?.original_category || result.category_name}"`);
    console.log(`\n🎯 MAPPING RESULTS:`);
    console.log(`   category_id: ${result.category_id || '❌ NULL'}`);
    console.log(`   subcategory_id: ${result.subcategory_id || '❌ NULL'}`);
    
    if (result.mapping_metadata) {
      console.log(`   Confidence: ${result.mapping_metadata.category_confidence}`);
      console.log(`   Source: ${result.mapping_metadata.category_source}`);
      console.log(`   Needs Review: ${result.mapping_metadata.needs_review}`);
    }
    
    console.log('\n========================================================');
    
    if (result.category_id && result.subcategory_id) {
      console.log('\n✅ SUCCESS! Category mapping is working correctly!');
      console.log('   "Mobiles" → Electronics (parent) + Mobile Phones (subcategory)');
    } else {
      console.log('\n❌ FAILED! Category IDs are missing.');
      console.log('   Expected: category_id and subcategory_id should be populated');
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check if CategoryMapping exists in database');
      console.log('   2. Run: cd shopwise-backend && node create-priceoye-mapping.js');
      console.log('   3. Ensure backend is running on http://localhost:3000');
    }
    
    await scraper.close();
    process.exit(result.category_id && result.subcategory_id ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCategoryMapping();

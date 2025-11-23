/**
 * Debug Brand Normalization
 * Tests brand normalization with detailed logging
 */

require('dotenv').config();
const normalizationService = require('../src/services/normalization-service');

async function testBrandNormalization() {
  console.log('🧪 Testing Brand Normalization\n');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: Normalize "HMD" brand
    console.log('\n📝 Test 1: Normalizing "HMD" brand...');
    console.log('Parameters:');
    console.log('   - brandName: "HMD"');
    console.log('   - platformId: "test-platform"');
    console.log('   - autoLearn: true');
    console.log('');
    
    const result = await normalizationService.normalizeBrand(
      'HMD',
      'test-platform',
      true // autoLearn = true (should create brand if not found)
    );
    
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANALYSIS');
    console.log('='.repeat(80));
    
    if (result.brand_id) {
      console.log('✅ Brand ID returned:', result.brand_id);
      console.log('✅ Source:', result.source);
      console.log('✅ Canonical name:', result.canonical_name);
    } else {
      console.log('❌ No brand_id returned');
      console.log('❌ Source:', result.source);
      console.log('❌ Should create:', result.shouldCreate);
      
      if (result.shouldCreate) {
        console.log('\n💡 The backend returned shouldCreate=true');
        console.log('💡 But brand was not created by scraper');
        console.log('💡 Check if backend server is running with updated code');
      }
      
      if (result.error) {
        console.log('\n❌ Error:', result.error);
      }
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testBrandNormalization().catch(console.error);

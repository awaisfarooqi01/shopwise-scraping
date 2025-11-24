/**
 * Debug Brand Creation
 * Simple test to see what's happening with brand normalization
 */

require('dotenv').config();
const backendAPIClient = require('../src/services/backend-api-client');

async function debugBrandCreation() {
  console.log('🔍 Debugging Brand Creation\n');
  console.log('Backend URL:', process.env.BACKEND_API_URL);
  console.log('');

  try {
    // Test 1: Normalize existing brand (should work)
    console.log('TEST 1: Normalize existing brand (Samsung)');
    console.log('-'.repeat(60));
    try {
      const result1 = await backendAPIClient.normalizeBrand('Samsung', true);
      console.log('✅ Response:', JSON.stringify(result1, null, 2));
    } catch (error) {
      console.error('❌ Error:', error.message);
      console.error('Details:', error.response?.data || error);
    }

    console.log('\n');

    // Test 2: Normalize non-existent brand (HMD)
    console.log('TEST 2: Normalize non-existent brand (HMD)');
    console.log('-'.repeat(60));
    try {
      const result2 = await backendAPIClient.normalizeBrand('HMD', true);
      console.log('✅ Response:', JSON.stringify(result2, null, 2));
      
      if (!result2.brand_id && result2.shouldCreate) {
        console.log('\n🔧 shouldCreate flag is true - attempting to create brand...');
        
        try {
          const newBrand = await backendAPIClient.createBrand({
            name: 'HMD',
            normalized_name: 'hmd',
            metadata: {
              test: true
            }
          });
          console.log('✅ Brand created:', JSON.stringify(newBrand, null, 2));
        } catch (createError) {
          console.error('❌ Create failed:', createError.message);
          console.error('Details:', createError.response?.data || createError);
        }
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      console.error('Details:', error.response?.data || error);
    }

    console.log('\n✅ Debug test completed');

  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

debugBrandCreation().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

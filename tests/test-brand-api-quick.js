/**
 * Quick Test - Brand Auto-Creation
 * Tests if HMD brand is created correctly
 */

require('dotenv').config();
const mongoose = require('mongoose');
const backendAPIClient = require('../src/services/backend-api-client');

async function testBrandCreation() {
  try {
    console.log('🧪 Testing Brand Auto-Creation API\n');
    
    // Test 1: Normalize "HMD" (should return no_match with shouldCreate=true)
    console.log('1️⃣  Testing brand normalization...');
    const normalizeResult = await backendAPIClient.normalizeBrand('HMD', true);
    console.log('Result:', JSON.stringify(normalizeResult, null, 2));
    
    if (normalizeResult.shouldCreate) {
      console.log('✅ Backend correctly returns shouldCreate=true\n');
      
      // Test 2: Create brand via auto-create endpoint
      console.log('2️⃣  Testing brand auto-creation...');
      const newBrand = await backendAPIClient.createBrand({
        name: 'HMD Test',
        normalized_name: 'hmd test',
        metadata: {
          source_platform: 'test',
          original_name: 'HMD Test'
        }
      });
      
      console.log('✅ Brand created successfully!');
      console.log('Brand ID:', newBrand._id);
      console.log('Brand Name:', newBrand.name);
      console.log('Normalized:', newBrand.normalized_name);
      console.log('Auto-created:', newBrand.metadata?.auto_created);
      console.log('Verified:', newBrand.is_verified);
      
      console.log('\n🎉 Test PASSED - Brand auto-creation works!');
    } else {
      console.log('❌ Backend did not return shouldCreate=true');
      console.log('Check if backend changes were applied and server restarted');
    }
    
  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testBrandCreation();

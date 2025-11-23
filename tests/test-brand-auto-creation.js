/**
 * Test Brand Auto-Creation Fix
 * Verifies that brands like "HMD" are created instead of being fuzzy-matched to "Nokia"
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const Product = require('../src/models/Product');

// Test URL: HMD product that was incorrectly mapped to Nokia
const TEST_URL = 'https://priceoye.pk/mobiles/hmd/hmd-aura-2';

async function testBrandAutoCreation() {
  console.log('🧪 Testing Brand Auto-Creation Fix\n');
  console.log('=' .repeat(80));
  
  let scraper;
    try {
    // Connect to database
    console.log('\n📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');
    
    // Backend API base URL
    const BACKEND_API = process.env.BACKEND_API_URL || 'http://localhost:3000';
    
    // Check if HMD brand exists before scraping (via API)
    console.log('🔍 Checking for "HMD" brand via backend API...');
    try {
      const brandResponse = await axios.get(`${BACKEND_API}/api/v1/brands/search?query=HMD`);
      const existingHMD = brandResponse.data.data?.brands?.find(b => 
        b.name.toLowerCase() === 'hmd' || b.normalized_name === 'hmd'
      );
      
      if (existingHMD) {
        console.log(`✅ Found existing HMD brand:`);
        console.log(`   ID: ${existingHMD._id}`);
        console.log(`   Name: ${existingHMD.name}`);
        console.log(`   Normalized: ${existingHMD.normalized_name}`);
        console.log(`   Auto-created: ${existingHMD.metadata?.auto_created || false}`);
      } else {
        console.log('❌ HMD brand NOT found in database');
        console.log('   Test will verify brand auto-creation');
      }
    } catch (error) {
      console.log('⚠️  Could not check brands via API (backend may be down)');
    }
    
    // Initialize scraper
    console.log('\n🔧 Initializing scraper...');
    scraper = new PriceOyeScraper();
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');
    
    // Delete existing product if any (for clean test)
    console.log('🗑️  Cleaning up existing product...');
    await Product.deleteOne({ original_url: TEST_URL });
    console.log('✅ Cleanup complete\n');
    
    // Scrape product
    console.log('🔍 Scraping HMD product...');
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
    console.log(`Brand Name: ${product.brand}`);
    console.log(`Brand ID: ${product.brand_id}`);
    
    // Analyze brand assignment
    console.log('\n' + '='.repeat(80));
    console.log('🔍 BRAND ANALYSIS');
    console.log('='.repeat(80));
    
    if (product.brand_id) {
      try {
        const brandResponse = await axios.get(`${BACKEND_API}/api/v1/brands/${product.brand_id}`);
        const assignedBrand = brandResponse.data.data?.brand;      
      if (assignedBrand) {
        console.log(`\nAssigned Brand Details:`);
        console.log(`   ID: ${assignedBrand._id}`);
        console.log(`   Name: ${assignedBrand.name}`);
        console.log(`   Normalized: ${assignedBrand.normalized_name}`);
        console.log(`   Auto-created: ${assignedBrand.metadata?.auto_created || false}`);
        console.log(`   Verified: ${assignedBrand.is_verified}`);
        
        // Check if it's HMD or Nokia
        const isHMD = assignedBrand.name.toLowerCase().includes('hmd');
        const isNokia = assignedBrand.name.toLowerCase().includes('nokia');
        
        if (isHMD && !isNokia) {
          console.log('\n✅ CORRECT: Product assigned to HMD brand');
          console.log('✅ Not incorrectly mapped to Nokia via fuzzy matching');
          
          if (assignedBrand.metadata?.auto_created) {
            console.log('✅ Brand was auto-created by scraper (as expected)');
          }
          
          console.log('\n🎉 TEST PASSED: Brand auto-creation works correctly!');
        } else if (isNokia && !isHMD) {
          console.log('\n❌ ERROR: Product incorrectly assigned to Nokia brand!');
          console.log('❌ This is the bug we are trying to fix');
          console.log('❌ HMD was fuzzy-matched to Nokia instead of being created');
          
          console.log('\n💡 DIAGNOSIS:');
          console.log('   - Backend fuzzy matching is still auto-learning aliases');
          console.log('   - Fix needs to be applied to backend normalization service');
          console.log('   - Restart backend server after applying fix');
          
          console.log('\n🚨 TEST FAILED');
        } else {
          console.log('\n⚠️  Unexpected brand assignment');
          console.log(`   Expected: HMD`);
          console.log(`   Got: ${assignedBrand.name}`);
        }
        
        // Check metadata
        console.log('\n📋 Product Metadata:');
        console.log(`   Original Brand: ${product.platform_metadata?.original_brand || 'N/A'}`);
        console.log(`   Brand Source: ${product.mapping_metadata?.brand_source || 'N/A'}`);
        console.log(`   Brand Confidence: ${product.mapping_metadata?.brand_confidence || 'N/A'}`);
        
      } else {
        console.log('❌ Brand ID exists but brand not found in database');
      }
    } catch (error) {
      console.log('⚠️  Could not fetch brand details via API');
    }
    } else {
      console.log('❌ No brand_id assigned to product');
    }
    
    console.log('\n' + '='.repeat(80));
    
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

testBrandAutoCreation().catch(console.error);

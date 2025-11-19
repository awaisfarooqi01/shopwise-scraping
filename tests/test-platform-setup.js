/**
 * Test Platform Setup - Simple Database Check
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Platform = require('../src/models/Platform');

async function testPlatform() {
  try {
    console.log('🚀 Testing Platform Setup\n');
    
    console.log('📡 Connecting to MongoDB...');
    console.log(`URI: ${process.env.MONGODB_URI}\n`);
      await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB\n');
    
    // Check for PriceOye platform
    console.log('🔍 Checking for PriceOye platform...');
    let platform = await Platform.findOne({ name: 'PriceOye' });
    
    if (platform) {
      console.log('✅ PriceOye platform exists:');
      console.log(`   ID: ${platform._id}`);
      console.log(`   Name: ${platform.name}`);
      console.log(`   Base URL: ${platform.base_url}`);
      console.log(`   Active: ${platform.is_active}\n`);
    } else {
      console.log('❌ PriceOye platform not found\n');
      console.log('📝 Creating PriceOye platform...');
      
      platform = new Platform({
        name: 'PriceOye',
        base_url: 'https://priceoye.pk',
        is_active: true,
      });
      
      await platform.save();
      
      console.log('✅ PriceOye platform created:');
      console.log(`   ID: ${platform._id}`);
      console.log(`   Name: ${platform.name}`);
      console.log(`   Base URL: ${platform.base_url}`);
      console.log(`   Active: ${platform.is_active}\n`);
    }
    
    // List all platforms
    console.log('📋 All platforms in database:');
    const allPlatforms = await Platform.find();
    console.log(`   Total: ${allPlatforms.length}\n`);
    
    allPlatforms.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (${p.base_url}) - Active: ${p.is_active}`);
    });
    
    console.log('\n✅ Platform setup test completed!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database\n');
    process.exit(0);
  }
}

testPlatform();

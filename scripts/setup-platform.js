/**
 * Check and Create PriceOye Platform
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Platform = require('../src/models/Platform');

async function setupPlatform() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected\n');
    
    // Check if PriceOye platform exists
    console.log('🔍 Checking for PriceOye platform...');
    let platform = await Platform.findOne({ name: 'PriceOye' });
    
    if (platform) {
      console.log('✅ PriceOye platform already exists:');
      console.log(`   ID: ${platform._id}`);
      console.log(`   Name: ${platform.name}`);
      console.log(`   Base URL: ${platform.base_url}`);
      console.log(`   Active: ${platform.is_active}`);
    } else {
      console.log('❌ PriceOye platform not found');
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
      console.log(`   Active: ${platform.is_active}`);
    }
    
    console.log('\n✅ Platform setup complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

setupPlatform();

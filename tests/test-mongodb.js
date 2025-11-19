/**
 * Quick MongoDB Connection Test
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('🔌 Testing MongoDB Connection\n');
  console.log(`URI: ${process.env.MONGODB_URI}\n`);
  
  try {
    console.log('⏳ Attempting to connect...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    
    console.log('✅ Connected successfully!\n');
    
    // Test a simple query
    const dbs = await mongoose.connection.db.admin().listDatabases();
    console.log('📊 Available databases:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    console.log('\n✅ Connection test passed!\n');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Solution: Make sure MongoDB is running');
      console.error('   Run: net start MongoDB');
    }
    
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected\n');
    process.exit(0);
  }
}

testConnection();

/**
 * Check if Backend is Running
 * Helper script to verify backend API is accessible before running tests
 */

const axios = require('axios');

async function checkBackend() {
  console.log('\n🔍 Checking Backend API Connection...\n');
  
  const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';
  
  try {
    console.log(`📡 Trying to connect to: ${BACKEND_URL}`);
    
    const response = await axios.get(`${BACKEND_URL}/api/v1/health`, {
      timeout: 5000
    });
    
    console.log('✅ Backend is running!');
    console.log(`   Status: ${response.status}`);
    console.log(`   Health: ${JSON.stringify(response.data)}\n`);
    
    // Check if category mapping endpoint is available
    try {
      const testMapping = await axios.post(
        `${BACKEND_URL}/api/v1/category-mappings/map`,
        {
          platform_id: '507f1f77bcf86cd799439011', // dummy ID
          platform_category: 'Test',
          auto_create: false
        },
        { timeout: 3000 }
      );
      console.log('✅ Category mapping API is accessible\n');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ Category mapping API is accessible (validation working)\n');
      } else {
        console.log('⚠️  Category mapping API responded with:', err.response?.status || err.message);
      }
    }
    
    console.log('✅ Backend is ready for scraping tests!\n');
    process.exit(0);
    
  } catch (error) {
    console.log('❌ Backend is NOT running!\n');
    console.log('Error:', error.code || error.message);
    
    console.log('\n📋 STEPS TO FIX:\n');
    console.log('1. Open a NEW terminal window');
    console.log('2. Navigate to backend folder:');
    console.log('   cd "e:\\University Work\\FYP\\code\\shopwise-backend"\n');
    console.log('3. Start the backend:');
    console.log('   npm run dev\n');
    console.log('4. Wait for "Server is running on port 3000"');
    console.log('5. Then run your scraping tests\n');
    
    process.exit(1);
  }
}

checkBackend();

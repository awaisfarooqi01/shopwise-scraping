/**
 * Fetch PriceOye HTML using axios (simple HTTP request)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    console.log('Fetching PriceOye page...');
    
    const url = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 30000
    });
    
    const html = response.data;
    
    const outputDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, 'priceoye-product.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('✅ Saved to:', outputFile);
    console.log('📊 Size:', Math.round(html.length / 1024), 'KB');
    console.log('\n📁 Now inspect the HTML file to identify selectors');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();

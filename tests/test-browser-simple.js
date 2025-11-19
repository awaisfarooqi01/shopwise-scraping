/**
 * Simple Browser Test - Just verify we can navigate to PriceOye
 */

require('dotenv').config();
const playwright = require('playwright');

async function testBrowser() {
  let browser = null;
  
  try {
    console.log('🚀 Starting Simple Browser Test\n');
    
    console.log('🌐 Launching browser...');
    browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('✅ Browser launched\n');
    
    console.log('📄 Creating new page...');
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    console.log('✅ Page created\n');
    
    const url = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';
    console.log(`🎯 Navigating to: ${url}`);
    console.log('⏳ Please wait...\n');
    
    // Set a reasonable timeout
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000, // 30 seconds
    });
    
    console.log('✅ Page loaded!\n');
    console.log('='.repeat(60));
    console.log('📊 RESPONSE INFO:');
    console.log('='.repeat(60));
    console.log(`Status: ${response.status()}`);
    console.log(`Status Text: ${response.statusText()}`);
    console.log(`URL: ${response.url()}`);
    console.log(`Content Type: ${response.headers()['content-type']}`);
    console.log('='.repeat(60));
    
    // Get page title
    const title = await page.title();
    console.log(`\n📄 Page Title: ${title}`);
    
    // Get some basic selectors
    console.log('\n🔍 Testing common selectors:');
    console.log('-'.repeat(60));
    
    const selectors = [
      'h1',
      'title',
      'body',
      '.price',
      '[class*="price"]',
      '[class*="product"]',
    ];
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          console.log(`✅ ${selector}: Found - "${text?.substring(0, 50)}${text?.length > 50 ? '...' : ''}"`);
        } else {
          console.log(`❌ ${selector}: Not found`);
        }
      } catch (e) {
        console.log(`❌ ${selector}: Error - ${e.message}`);
      }
    }
    
    // Save screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
    console.log('✅ Screenshot saved as: test-screenshot.png');
    
    // Save HTML
    console.log('\n💾 Saving HTML...');
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('test-page.html', html, 'utf8');
    console.log('✅ HTML saved as: test-page.html');
    console.log(`   HTML size: ${(html.length / 1024).toFixed(2)} KB`);
    
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      console.log('\n🧹 Closing browser...');
      await browser.close();
      console.log('✅ Browser closed\n');
    }
    
    console.log('👋 Test finished\n');
    process.exit(0);
  }
}

testBrowser();

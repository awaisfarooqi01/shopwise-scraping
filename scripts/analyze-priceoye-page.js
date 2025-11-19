/**
 * Analyze PriceOye Product Page HTML Structure
 * This script fetches a real product page and saves the HTML for analysis
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

async function analyzePriceOyePage() {
  console.log('🚀 Starting PriceOye HTML Analysis...\n');
  
  const browser = await playwright.chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });
  
  const page = await context.newPage();

  try {
    // Test with a real Samsung product
    const url = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';
    console.log(`📄 Fetching: ${url}\n`);
    
    // Navigate to page
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(3000);
    
    // Get HTML content
    const html = await page.content();
    
    // Save HTML file
    const htmlDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(htmlDir)) {
      fs.mkdirSync(htmlDir, { recursive: true });
    }
    
    const htmlPath = path.join(htmlDir, 'priceoye-product-page.html');
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`✅ HTML saved to: ${htmlPath}`);
    console.log(`📊 HTML size: ${(html.length / 1024).toFixed(2)} KB\n`);
    
    // Take screenshot
    const screenshotPath = path.join(htmlDir, 'priceoye-product-page.png');
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    console.log(`📸 Screenshot saved to: ${screenshotPath}\n`);
    
    // Now analyze key elements
    console.log('🔍 Analyzing Page Elements:\n');
    
    // Product Title
    console.log('📌 PRODUCT TITLE:');
    const titleSelectors = ['h1', 'h1.product-title', '[class*="product"][class*="title"]', '[data-testid*="title"]'];
    for (const selector of titleSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = (await element.textContent())?.trim();
          const classes = await element.getAttribute('class');
          if (text && text.length < 200) {
            console.log(`  ✓ ${selector}`);
            console.log(`    Class: "${classes}"`);
            console.log(`    Text: "${text}"\n`);
          }
        }
      } catch (e) {}
    }
    
    // Price
    console.log('💰 PRICE:');
    const priceSelectors = [
      '[class*="price"]', 
      '[data-testid*="price"]',
      'span[class*="price"]',
      'div[class*="price"]',
      '[itemprop="price"]'
    ];
    for (const selector of priceSelectors) {
      try {
        const elements = await page.$$(selector);
        for (let i = 0; i < Math.min(elements.length, 5); i++) {
          const text = (await elements[i].textContent())?.trim();
          const classes = await elements[i].getAttribute('class');
          if (text && text.includes('Rs') || text.match(/\d{3,}/)) {
            console.log(`  ✓ ${selector}[${i}]`);
            console.log(`    Class: "${classes}"`);
            console.log(`    Text: "${text}"\n`);
          }
        }
      } catch (e) {}
    }
    
    // Rating
    console.log('⭐ RATING:');
    const ratingSelectors = [
      '[class*="rating"]',
      '[class*="star"]',
      '[itemprop="ratingValue"]',
      '[data-testid*="rating"]'
    ];
    for (const selector of ratingSelectors) {
      try {
        const elements = await page.$$(selector);
        for (let i = 0; i < Math.min(elements.length, 3); i++) {
          const text = (await elements[i].textContent())?.trim();
          const classes = await elements[i].getAttribute('class');
          if (text && (text.match(/\d\.\d/) || text.includes('★'))) {
            console.log(`  ✓ ${selector}[${i}]`);
            console.log(`    Class: "${classes}"`);
            console.log(`    Text: "${text}"\n`);
          }
        }
      } catch (e) {}
    }
    
    // Images
    console.log('🖼️  IMAGES:');
    const imageSelectors = [
      'img[class*="product"]',
      'img[alt*="Samsung"]',
      '[class*="gallery"] img',
      '[class*="image"] img'
    ];
    for (const selector of imageSelectors) {
      try {
        const elements = await page.$$(selector);
        for (let i = 0; i < Math.min(elements.length, 3); i++) {
          const src = await elements[i].getAttribute('src');
          const alt = await elements[i].getAttribute('alt');
          const classes = await elements[i].getAttribute('class');
          if (src && src.includes('http')) {
            console.log(`  ✓ ${selector}[${i}]`);
            console.log(`    Class: "${classes}"`);
            console.log(`    Alt: "${alt}"`);
            console.log(`    Src: ${src.substring(0, 80)}...\n`);
          }
        }
      } catch (e) {}
    }
    
    // Specifications
    console.log('📋 SPECIFICATIONS:');
    const specSelectors = [
      'table[class*="spec"]',
      '[class*="specification"]',
      '[class*="detail"] table',
      'table tbody tr'
    ];
    for (const selector of specSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`  ✓ ${selector} - Found ${elements.length} elements\n`);
        }
      } catch (e) {}
    }
    
    // Description
    console.log('📝 DESCRIPTION:');
    const descSelectors = [
      '[class*="description"]',
      '[class*="detail"]',
      'article',
      '[itemprop="description"]'
    ];
    for (const selector of descSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = (await element.textContent())?.trim();
          const classes = await element.getAttribute('class');
          if (text && text.length > 50 && text.length < 500) {
            console.log(`  ✓ ${selector}`);
            console.log(`    Class: "${classes}"`);
            console.log(`    Text preview: "${text.substring(0, 100)}..."\n`);
          }
        }
      } catch (e) {}
    }
    
    console.log('✅ Analysis complete!\n');
    console.log('📁 Next steps:');
    console.log('   1. Open the HTML file to inspect the actual structure');
    console.log('   2. Identify the exact CSS selectors');
    console.log('   3. Update priceoye-selectors.js with correct selectors\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the analysis
analyzePriceOyePage().catch(console.error);

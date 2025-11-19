/**
 * Simple HTML Fetcher for PriceOye
 * Fetches and saves HTML without complex analysis
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    console.log('Starting browser...');
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const url = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';
    console.log('Navigating to:', url);
    
    await page.goto(url, { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    
    console.log('Page loaded, getting HTML...');
    const html = await page.content();
    
    const outputDir = path.join(__dirname, '../temp');
    fs.mkdirSync(outputDir, { recursive: true });
    
    const outputFile = path.join(outputDir, 'priceoye-page.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('Saved to:', outputFile);
    console.log('Size:', Math.round(html.length / 1024), 'KB');
    
    await browser.close();
    console.log('Done!');
    
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
})();

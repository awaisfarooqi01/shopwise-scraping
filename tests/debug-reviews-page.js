/**
 * Debug Reviews Page HTML Structure
 * Investigates why reviews aren't being scraped
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');

const REVIEWS_URL = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra/reviews';

async function debugReviewsPage() {
  console.log('🔍 Debugging Reviews Page Structure\n');
  
  let browser;
  
  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Show browser
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Navigate to reviews page
    console.log(`📄 Navigating to: ${REVIEWS_URL}`);
    await page.goto(REVIEWS_URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait a bit for dynamic content
    console.log('⏳ Waiting for reviews to load...');
    await page.waitForTimeout(5000);
    
    // Get page HTML
    const html = await page.content();
    
    // Save HTML to file
    const htmlFile = 'data/screenshots/reviews-page-debug.html';
    fs.writeFileSync(htmlFile, html);
    console.log(`✅ HTML saved to: ${htmlFile}`);
    
    // Take screenshot
    const screenshotFile = 'data/screenshots/reviews-page-debug.png';
    await page.screenshot({ 
      path: screenshotFile, 
      fullPage: true 
    });
    console.log(`✅ Screenshot saved to: ${screenshotFile}`);
    
    // Try to find reviews using various selectors
    console.log('\n🔍 Testing Selectors:');
    console.log('-'.repeat(60));
    
    const selectorsToTest = [
      '.review-item',
      '.review-card',
      '[class*="review"]',
      '.reviews-container',
      '.all-reviews',
      'article',
      '[data-review]',
      '.comment',
      '.user-review',
    ];
    
    for (const selector of selectorsToTest) {
      try {
        const elements = await page.$$(selector);
        console.log(`${selector.padEnd(30)} → ${elements.length} elements`);
      } catch (e) {
        console.log(`${selector.padEnd(30)} → Error: ${e.message}`);
      }
    }
    
    // Check if page redirected to 404
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('404')) {
      console.log('❌ Page redirected to 404 - reviews page might not exist');
    }
    
    // Extract any text content that might contain reviews
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    // Check if reviews-related text is present
    const hasReviewsText = bodyText.toLowerCase().includes('review');
    const hasCommentText = bodyText.toLowerCase().includes('comment');
    const hasRatingText = bodyText.toLowerCase().includes('rating');
    
    console.log('\n📝 Page Content Analysis:');
    console.log(`  Contains "review": ${hasReviewsText}`);
    console.log(`  Contains "comment": ${hasCommentText}`);
    console.log(`  Contains "rating": ${hasRatingText}`);
    console.log(`  Body text length: ${bodyText.length} chars`);
    
    // Extract a sample of the text
    console.log('\n📄 Sample Text (first 500 chars):');
    console.log('-'.repeat(60));
    console.log(bodyText.substring(0, 500));
    
    console.log('\n✅ Debug complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check the HTML file for the actual structure');
    console.log('   2. Update selectors.js based on actual HTML');
    console.log('   3. Re-run the test');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugReviewsPage().catch(console.error);

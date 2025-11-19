/**
 * Debug Reviews Page - See what's actually there
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugReviews() {
  let browser;
  
  try {
    console.log('🔍 Debugging PriceOye Reviews Page\n');
    
    browser = await puppeteer.launch({ 
      headless: false, // Show browser
      args: ['--no-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    const reviewsUrl = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra/reviews';
    console.log(`📄 Loading: ${reviewsUrl}\n`);
    
    await page.goto(reviewsUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('⏳ Waiting 5 seconds for dynamic content...\n');
    await page.waitForTimeout(5000);
    
    // Get page info
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyTextLength: document.body.innerText.length,
        bodyTextSample: document.body.innerText.substring(0, 500),
        
        // Check for specific elements
        hasReviewElements: {
          'article': document.querySelectorAll('article').length,
          '[class*="review"]': document.querySelectorAll('[class*="review"]').length,
          '[class*="rating"]': document.querySelectorAll('[class*="rating"]').length,
          '.review': document.querySelectorAll('.review').length,
          '[data-review]': document.querySelectorAll('[data-review]').length,
        },
        
        // Get all class names
        allClasses: Array.from(document.querySelectorAll('[class]'))
          .map(el => el.className)
          .filter((v, i, a) => a.indexOf(v) === i && v.includes('review'))
          .slice(0, 20)
      };
    });
    
    console.log('📊 Page Information:');
    console.log('='.repeat(60));
    console.log(`URL: ${pageInfo.url}`);
    console.log(`Title: ${pageInfo.title}`);
    console.log(`Body text length: ${pageInfo.bodyTextLength} chars`);
    console.log(`\nBody text sample:\n${pageInfo.bodyTextSample}\n`);
    
    console.log('🔍 Elements Found:');
    console.log(JSON.stringify(pageInfo.hasReviewElements, null, 2));
    
    console.log('\n🏷️  Classes containing "review":');
    pageInfo.allClasses.forEach(cls => console.log(`  - ${cls}`));
    
    // Save full HTML
    const html = await page.content();
    fs.writeFileSync('data/screenshots/reviews-page-full.html', html);
    console.log('\n✅ Full HTML saved to: data/screenshots/reviews-page-full.html');
    
    // Take screenshot
    await page.screenshot({ path: 'data/screenshots/reviews-page-debug.png', fullPage: true });
    console.log('✅ Screenshot saved to: data/screenshots/reviews-page-debug.png');
    
    console.log('\n💡 Check the files to see the actual page structure!');
    console.log('   Browser will stay open for 30 seconds for manual inspection...');
    
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugReviews().catch(console.error);

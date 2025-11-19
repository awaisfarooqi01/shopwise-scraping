/**
 * Direct Reviews Page Inspector
 * Inspects PriceOye reviews page to find actual selectors
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

async function inspectReviews() {
  console.log('🔍 Starting Reviews Inspector...\n');
  
  let browser;
  
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Go directly to reviews page
    const reviewsUrl = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra/reviews';
    console.log(`📄 Loading: ${reviewsUrl}\n`);
    
    await page.goto(reviewsUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    
    // Wait extra time for dynamic content
    console.log('⏳ Waiting 5 seconds for dynamic content...\n');
    await page.waitForTimeout(5000);
    
    // Extract ALL possible review data
    const pageAnalysis = await page.evaluate(() => {
      const analysis = {
        url: window.location.href,
        title: document.title,
        hasReviewsInWindow: false,
        windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('review')),
        reviewsFromJS: null,
        allClassNames: [],
        bodyTextSample: document.body.innerText.substring(0, 300),
        reviewElements: []
      };
      
      // Check for review data in window object
      if (window.product_reviews) {
        analysis.hasReviewsInWindow = true;
        analysis.reviewsFromJS = window.product_reviews;
      }
      if (window.reviews) {
        analysis.hasReviewsInWindow = true;
        analysis.reviewsFromJS = window.reviews;
      }
      if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.reviews) {
        analysis.hasReviewsInWindow = true;
        analysis.reviewsFromJS = window.__INITIAL_STATE__.reviews;
      }
      
      // Find all elements with "review" in class name
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const className = el.className;
        if (typeof className === 'string' && className.toLowerCase().includes('review')) {
          if (!analysis.allClassNames.includes(className)) {
            analysis.allClassNames.push(className);
          }
        }
      });
      
      // Try to find review containers
      const possibleContainers = [
        'div[class*="review"]',
        'article',
        'li[class*="review"]',
        '.review',
        '[data-testid*="review"]',
        '[role="article"]'
      ];
      
      possibleContainers.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            analysis.reviewElements.push({
              selector: selector,
              count: elements.length,
              firstElementHTML: elements[0].outerHTML.substring(0, 500)
            });
          }
        } catch (e) {
          // Ignore selector errors
        }
      });
      
      return analysis;
    });
    
    // Print results
    console.log('📊 PAGE ANALYSIS RESULTS');
    console.log('='.repeat(70));
    console.log(`Current URL: ${pageAnalysis.url}`);
    console.log(`Page Title: ${pageAnalysis.title}`);
    console.log(`\n🔍 Review Data in JavaScript:`);
    console.log(`  Has reviews in window: ${pageAnalysis.hasReviewsInWindow}`);
    console.log(`  Window keys with "review": ${pageAnalysis.windowKeys.join(', ') || 'None'}`);
    
    if (pageAnalysis.reviewsFromJS) {
      console.log(`  ✅ Found review data in JS!`);
      console.log(`  Type: ${typeof pageAnalysis.reviewsFromJS}`);
      if (Array.isArray(pageAnalysis.reviewsFromJS)) {
        console.log(`  Count: ${pageAnalysis.reviewsFromJS.length}`);
        if (pageAnalysis.reviewsFromJS.length > 0) {
          console.log(`  Sample review keys: ${Object.keys(pageAnalysis.reviewsFromJS[0]).join(', ')}`);
        }
      }
    }
    
    console.log(`\n📝 Page Text Sample:`);
    console.log(pageAnalysis.bodyTextSample);
    
    console.log(`\n🎯 Classes with "review":`);
    pageAnalysis.allClassNames.forEach((className, i) => {
      if (i < 10) { // Show first 10
        console.log(`  - ${className}`);
      }
    });
    if (pageAnalysis.allClassNames.length > 10) {
      console.log(`  ... and ${pageAnalysis.allClassNames.length - 10} more`);
    }
    
    console.log(`\n🔍 Review Elements Found:`);
    if (pageAnalysis.reviewElements.length === 0) {
      console.log('  ❌ No review elements found with common selectors');
    } else {
      pageAnalysis.reviewElements.forEach(item => {
        console.log(`\n  Selector: ${item.selector}`);
        console.log(`  Count: ${item.count}`);
        console.log(`  Sample HTML:`);
        console.log(`  ${item.firstElementHTML.substring(0, 200)}...`);
      });
    }
    
    // Take screenshot
    const screenshotPath = 'data/screenshots/reviews-page-analysis.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Run immediately
inspectReviews()
  .then(() => {
    console.log('\n👋 Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

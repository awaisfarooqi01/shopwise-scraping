/**
 * Quick Fix: Analyze PriceOye Reviews Page
 * Checks the actual HTML structure to fix selectors
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

async function analyzeReviewsPage() {
  let browser;
  
  try {
    console.log('🔍 Analyzing PriceOye Reviews Page...\n');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Go to product page first
    const productUrl = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';
    console.log(`📄 Loading: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for reviews section
    await page.waitForTimeout(3000);
    
    // Extract reviews from product page
    const reviewsData = await page.evaluate(() => {
      const results = {
        foundElements: [],
        possibleReviewContainers: [],
        reviewCount: 0
      };
      
      // Look for review-related elements
      const possibleSelectors = [
        '[class*="review"]',
        '[class*="rating"]',
        '[class*="comment"]',
        'article',
        '[data-review]',
        '.user-review',
        '.customer-review'
      ];
      
      possibleSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results.foundElements.push({
            selector: selector,
            count: elements.length,
            sample: elements[0] ? {
              className: elements[0].className,
              innerHTML: elements[0].innerHTML.substring(0, 200)
            } : null
          });
        }
      });
      
      // Check for review text in page
      const bodyText = document.body.innerText.toLowerCase();
      results.hasReviewText = bodyText.includes('review');
      results.hasCommentText = bodyText.includes('comment');
      
      return results;
    });
    
    console.log('\n📊 Analysis Results:');
    console.log('='.repeat(60));
    console.log(`Has "review" text: ${reviewsData.hasReviewText}`);
    console.log(`Has "comment" text: ${reviewsData.hasCommentText}`);
    console.log(`\nFound ${reviewsData.foundElements.length} potential review selectors:`);
    
    reviewsData.foundElements.forEach(item => {
      console.log(`\n  ${item.selector} → ${item.count} elements`);
      if (item.sample) {
        console.log(`    Class: ${item.sample.className}`);
        console.log(`    Sample HTML: ${item.sample.innerHTML.substring(0, 100)}...`);
      }
    });
    
    // Now check reviews page
    console.log('\n\n🔍 Checking Dedicated Reviews Page...');
    const reviewsUrl = `${productUrl}/reviews`;
    console.log(`📄 Loading: ${reviewsUrl}`);
    
    await page.goto(reviewsUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const reviewsPageData = await page.evaluate(() => {
      const url = window.location.href;
      const is404 = url.includes('404') || document.title.includes('404');
      
      return {
        currentUrl: url,
        is404: is404,
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log(`\nCurrent URL: ${reviewsPageData.currentUrl}`);
    console.log(`Is 404: ${reviewsPageData.is404}`);
    console.log(`\nPage text sample:\n${reviewsPageData.bodyText}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

analyzeReviewsPage().catch(console.error);

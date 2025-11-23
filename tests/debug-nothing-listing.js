/**
 * Debug Nothing Brand Listing Page
 * Check what URLs are actually on the page
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function debugListingPage() {
  console.log('🔍 Debugging Nothing brand listing page...\n');
  
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  console.log('✅ Browser launched');
  
  const page = await browser.newPage();
  console.log('✅ New page created');
  
  try {
    const url = 'https://priceoye.pk/mobiles/nothing';
    console.log(`📍 Navigating to: ${url}\n`);
    
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    console.log('✅ Page loaded, waiting 3 seconds...');
    await page.waitForTimeout(3000);
    console.log('✅ Wait complete, extracting data...');
    
    // Extract all links containing /mobiles/
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href*="/mobiles/"]'));
      return allLinks.map(a => ({
        href: a.href,
        text: a.innerText?.trim().substring(0, 50) || '',
        classes: a.className
      }));
    });
    
    console.log(`📊 Found ${links.length} links containing "/mobiles/"\n`);
    
    // Filter to product links
    const productLinks = links.filter(link => {
      const url = link.href;
      // Product URLs have pattern: /mobiles/BRAND/PRODUCT-NAME
      const parts = url.split('/mobiles/')[1];
      if (!parts) return false;
      const segments = parts.split('/').filter(s => s && !s.includes('?'));
      return segments.length === 2; // brand + product
    });
    
    console.log(`✅ Product links: ${productLinks.length}\n`);
    
    // Show first 10 product links
    console.log('First 10 product links:');
    productLinks.slice(0, 10).forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.href}`);
      console.log(`     Text: ${link.text}`);
      console.log(`     Classes: ${link.classes}\n`);
    });
    
    // Check for pagination
    console.log('\n🔍 Checking pagination...');
    const paginationInfo = await page.evaluate(() => {
      const pagination = document.querySelector('.pagination, [class*="pagination"]');
      const nextBtn = document.querySelector('.next, .next-page, a[rel="next"], [class*="next"]');
      const pageLinks = document.querySelectorAll('.pagination a, [class*="pagination"] a');
      
      return {
        hasPagination: !!pagination,
        hasNextButton: !!nextBtn,
        nextButtonDisabled: nextBtn ? (nextBtn.disabled || nextBtn.classList.contains('disabled')) : null,
        totalPageLinks: pageLinks.length,
        pageNumbers: Array.from(pageLinks).map(a => a.innerText?.trim())
      };
    });
    
    console.log('Pagination info:', JSON.stringify(paginationInfo, null, 2));
    
    // Extract all product cards
    console.log('\n🔍 Checking product cards...');
    const productCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-card, [class*="product-card"], [class*="product-item"]');
      return {
        totalCards: cards.length,
        cardClasses: Array.from(cards).slice(0, 3).map(c => c.className)
      };
    });
    
    console.log('Product cards:', JSON.stringify(productCards, null, 2));
    
    // Get page HTML to inspect
    console.log('\n💾 Saving page HTML for inspection...');
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('nothing-listing-debug.html', html);
    console.log('✅ Saved to: nothing-listing-debug.html');
    
    // Take screenshot
    await page.screenshot({ path: 'nothing-listing-debug.png', fullPage: true });
    console.log('✅ Screenshot saved to: nothing-listing-debug.png');
    
    // Wait before closing
    console.log('\n⏸️  Pausing for 5 seconds...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed');
  }
}

debugListingPage().catch(console.error);

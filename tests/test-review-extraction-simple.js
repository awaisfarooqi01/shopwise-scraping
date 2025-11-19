/**
 * Simple review extraction test
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

const REVIEWS_URL = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra/reviews';

async function testReviewExtraction() {
  console.log('🧪 Testing Simple Review Extraction\n');
  
  let browser;
  
  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Navigate to reviews page
    console.log(`📄 Navigating to: ${REVIEWS_URL}`);
    await page.goto(REVIEWS_URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for review boxes
    console.log('⏳ Waiting for .review-box...');
    await page.waitForSelector('.review-box', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const reviewCount = await page.evaluate(() => {
      return document.querySelectorAll('.review-box').length;
    });
    console.log(`✅ Found ${reviewCount} review boxes\n`);
    
    // Extract reviews
    console.log('🔍 Extracting reviews...');
    const reviews = await page.evaluate(() => {
      const reviewBoxes = document.querySelectorAll('.review-box');
      const extracted = [];
      
      reviewBoxes.forEach((box, index) => {
        try {
          // Extract reviewer name
          const nameEl = box.querySelector('.user-reivew-name h5') || 
                        box.querySelector('.user-reivew-name');
          const name = nameEl ? nameEl.textContent.trim() : 'N/A';
          
          // Extract rating
          const starImgs = box.querySelectorAll('.rating-star img');
          let rating = 0;
          starImgs.forEach(img => {
            const src = img.getAttribute('src') || '';
            if (src.includes('stars.svg') && !src.includes('lightstar.svg')) {
              rating++;
            }
          });
          
          // Extract text
          const textEl = box.querySelector('.user-reivew-description');
          const text = textEl ? textEl.textContent.trim() : 'N/A';
          
          // Extract date
          const dateEl = box.querySelector('.review-date');
          const date = dateEl ? dateEl.textContent.trim() : 'N/A';
          
          // Verified
          const verified = box.querySelector('.verified-user') !== null;
          
          extracted.push({
            index: index + 1,
            name,
            rating,
            text: text.substring(0, 50) + '...',
            date,
            verified
          });
        } catch (err) {
          extracted.push({
            index: index + 1,
            error: err.message
          });
        }
      });
      
      return extracted;
    });
    
    console.log(`✅ Extracted ${reviews.length} reviews:\n`);
    reviews.forEach(r => {
      if (r.error) {
        console.log(`  ${r.index}. ERROR: ${r.error}`);
      } else {
        console.log(`  ${r.index}. ${r.name} - ${r.rating}⭐ - ${r.verified ? '✓' : '✗'}`);
        console.log(`     Date: ${r.date}`);
        console.log(`     Text: ${r.text}\n`);
      }
    });
    
    await browser.close();
    console.log('✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    if (browser) await browser.close();
  }
}

testReviewExtraction();

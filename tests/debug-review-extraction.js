/**
 * Debug Review Extraction Test
 * Tests review extraction for iPhone 8 Plus (discontinued product)
 */

const PriceoyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

async function debugReviewExtraction() {
  try {
    logger.info('=== Debug Review Extraction Test ===');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopwise');
    logger.info('✅ Connected to MongoDB');

    // Initialize scraper
    const scraper = new PriceoyeScraper();
    await scraper.initialize();

    // Test with iPhone 8 Plus (discontinued product)
    const testUrl = 'https://priceoye.pk/mobiles/apple/iphone-8-plus-price-pakistan';
    logger.info(`\n📱 Testing: ${testUrl}`);

    await scraper.page.goto(testUrl, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    // Debug: Check what review boxes are present
    const reviewDebug = await scraper.page.evaluate(() => {
      const reviewBoxes = document.querySelectorAll('.review-box');
      console.log(`Found ${reviewBoxes.length} review boxes`);
      
      const debug = [];
      reviewBoxes.forEach((box, index) => {
        const nameEl = box.querySelector('.user-reivew-name h5') || 
                      box.querySelector('.user-reivew-name');
        const reviewerName = nameEl ? nameEl.textContent.trim() : 'NOT FOUND';
        
        const starElements = box.querySelectorAll('.rating-star img');
        let rating = 0;
        starElements.forEach(star => {
          const src = star.getAttribute('src') || '';
          if (src.includes('stars.svg') && !src.includes('lightstar.svg')) {
            rating++;
          }
        });
        
        const textEl = box.querySelector('.user-reivew-description');
        const text = textEl ? textEl.textContent.trim() : 'NO TEXT';
        
        const verifiedEl = box.querySelector('.verified-user');
        const isVerified = verifiedEl !== null;
        
        debug.push({
          index: index + 1,
          name: reviewerName,
          rating: rating,
          textPreview: text.substring(0, 50),
          verified: isVerified,
          html: box.outerHTML.substring(0, 200)
        });
      });
      
      return debug;
    });

    logger.info('\n📊 Review Debug Information:');
    reviewDebug.forEach(r => {
      logger.info(`\nReview ${r.index}:`);
      logger.info(`  Name: "${r.name}"`);
      logger.info(`  Rating: ${r.rating}`);
      logger.info(`  Text: "${r.textPreview}..."`);
      logger.info(`  Verified: ${r.verified}`);
      logger.info(`  HTML: ${r.html}...`);
    });

    // Test cleanup
    await scraper.close();
    await mongoose.connection.close();
    logger.info('\n✅ Debug test complete');

  } catch (error) {
    logger.error('❌ Debug test failed:', error);
    process.exit(1);
  }
}

// Run the debug test
debugReviewExtraction();

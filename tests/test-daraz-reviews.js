/**
 * Test script for Daraz review scraping
 * Tests the review extraction with pagination
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DarazScraper = require('../src/scrapers/daraz/daraz-scraper');
const { logger } = require('../src/utils/logger');

// Test product URL with manageable number of reviews (3-5 pages)
const TEST_URL = 'https://www.daraz.pk/products/55-4k-tv-k85-4k-i433450646-s2080827295.html';

async function testReviewScraping() {
  let scraper = null;

  try {
    logger.info('🧪 Starting Daraz review scraping test...\n');

    // Connect to database
    logger.info('📦 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Database connected\n');

    // Initialize scraper
    scraper = new DarazScraper();
    await scraper.initialize();

    // First scrape the product to ensure we're on the page
    logger.info('\n📦 Scraping product first...');
    const productData = await scraper.scrapeProduct(TEST_URL);

    if (productData) {
      logger.info(`\n✅ Product scraped: ${productData.name}`);
      logger.info(`   Rating: ${productData.average_rating}/5`);
      logger.info(`   Review count: ${productData.review_count}`);
    } // Now scrape ALL reviews with pagination
    const expectedReviews = productData.review_count || 50;
    const maxPagesNeeded = Math.ceil(expectedReviews / 5) + 2; // 5 reviews per page + buffer

    logger.info(
      `\n📝 Scraping ALL reviews (expecting ~${expectedReviews}, max ${maxPagesNeeded} pages)...`
    );
    const reviews = await scraper.scrapeReviews(TEST_URL, {
      maxPages: maxPagesNeeded,
      maxReviews: expectedReviews + 10, // Buffer for any extra
      scrollToReviews: true,
    }); // Save to database
    logger.info('\n💾 Saving product and reviews to database...');

    // Save product first
    const savedProduct = await scraper.saveProduct(productData);
    logger.info(`   ✅ Product saved with ID: ${savedProduct._id}`);

    // Save reviews (returns {saved, skipped})
    const saveResult = await scraper.saveReviews(savedProduct._id, reviews);
    logger.info(
      `   ✅ ${saveResult.saved} new reviews saved, ${saveResult.skipped} duplicates skipped`
    );

    // Display results
    logger.info('\n========================================');
    logger.info('📊 REVIEW SCRAPING RESULTS');
    logger.info('========================================');
    logger.info(`Total reviews scraped: ${reviews.length}`);
    logger.info(`New reviews saved: ${saveResult.saved}`);
    logger.info(`Duplicates skipped: ${saveResult.skipped}\n`);

    // Display each review
    reviews.forEach((review, index) => {
      logger.info(`\n--- Review ${index + 1} ---`);
      logger.info(`⭐ Rating: ${review.rating}/5`);
      logger.info(`👤 Author: ${review.reviewer_name}`);
      logger.info(
        `📅 Date: ${review.platform_metadata?.original_date_text || 'N/A'} (${review.review_date.toLocaleDateString()})`
      );
      logger.info(`✅ Verified: ${review.verified_purchase ? 'Yes' : 'No'}`);
      logger.info(
        `📝 Content: ${review.text.substring(0, 100)}${review.text.length > 100 ? '...' : ''}`
      );
      logger.info(`🖼️  Images: ${review.images.length}`);
      logger.info(`🏷️  Variant: ${review.platform_metadata?.variant_purchased || 'N/A'}`);
      logger.info(`👍 Helpful: ${review.helpful_votes}`);
      if (review.platform_metadata?.seller_reply) {
        logger.info(
          `💬 Seller replied: ${review.platform_metadata.seller_reply.content.substring(0, 50)}...`
        );
      }
    });

    // Summary statistics
    logger.info('\n========================================');
    logger.info('📈 SUMMARY STATISTICS');
    logger.info('========================================');

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0;
    const verifiedCount = reviews.filter(r => r.verified_purchase).length;
    const withImages = reviews.filter(r => r.images.length > 0).length;
    const totalLikes = reviews.reduce((sum, r) => sum + r.helpful_votes, 0);

    logger.info(`Average Rating: ${avgRating.toFixed(1)}/5`);
    logger.info(
      `Verified Reviews: ${verifiedCount}/${reviews.length} (${((verifiedCount / reviews.length) * 100).toFixed(0)}%)`
    );
    logger.info(`Reviews with Images: ${withImages}/${reviews.length}`);
    logger.info(`Total Helpful Votes: ${totalLikes}`);

    // Rating distribution
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingDist[r.rating]++;
      }
    });
    logger.info('\nRating Distribution:');
    for (let i = 5; i >= 1; i--) {
      const count = ratingDist[i];
      const bar = '█'.repeat(count) + '░'.repeat(Math.max(0, 10 - count));
      logger.info(`  ${i}⭐: ${bar} ${count}`);
    }

    logger.info('\n✅ Review scraping test completed successfully!');
  } catch (error) {
    logger.error('❌ Test failed:', error);
    console.error(error);
  } finally {
    // Cleanup
    if (scraper) {
      await scraper.close();
    }
    await mongoose.disconnect();
    logger.info('\n🔒 Cleanup complete');
  }
}

// Run the test
testReviewScraping();

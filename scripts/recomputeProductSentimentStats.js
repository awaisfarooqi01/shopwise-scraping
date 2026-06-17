/**
 * Standalone Recompute Product Sentiment Stats Script
 * 
 * Loops through all active products, aggregates their analyzed reviews,
 * and updates:
 *   - positive_percent
 *   - fake_percent
 *   - seller_trust_score
 *   - sentiment_summary
 * 
 * Usage:
 *   node scripts/recomputeProductSentimentStats.js
 */

const mongoose = require('mongoose');
const config = require('../src/config');
const { logger } = require('../src/utils/logger');

// Ensure models are registered
require('../src/models');

const Review = mongoose.model('Review');
const Product = mongoose.model('Product');

async function main() {
  logger.info('=== Starting Product Sentiment Statistics Recomputation ===');
  
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('Failed to connect to MongoDB', { error: err.message });
    process.exit(1);
  }

  try {
    const products = await Product.find({ is_active: true }).select('_id name').lean();
    logger.info(`Found ${products.length} active products to recompute`);

    let updatedCount = 0;
    const startTime = Date.now();

    for (let idx = 0; idx < products.length; idx++) {
      const product = products[idx];
      
      const pipeline = [
        {
          $match: {
            product_id: product._id,
            'sentiment_analysis.needs_analysis': { $ne: true },
            'sentiment_analysis.sentiment': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            total_analyzed: { $sum: 1 },
            positive_count: {
              $sum: { $cond: [{ $eq: ['$sentiment_analysis.sentiment', 'positive'] }, 1, 0] }
            },
            negative_count: {
              $sum: { $cond: [{ $eq: ['$sentiment_analysis.sentiment', 'negative'] }, 1, 0] }
            },
            neutral_count: {
              $sum: { $cond: [{ $eq: ['$sentiment_analysis.sentiment', 'neutral'] }, 1, 0] }
            },
            fake_count: {
              $sum: { $cond: [{ $eq: ['$sentiment_analysis.is_likely_fake', true] }, 1, 0] }
            },
            verified_purchase_count: {
              $sum: { $cond: [{ $eq: ['$verified_purchase', true] }, 1, 0] }
            },
            average_sentiment_score: { $avg: '$sentiment_analysis.score' },
            average_rating: { $avg: '$rating' },
            total_reviews: { $sum: 1 },
            all_keywords: { $push: '$sentiment_analysis.keywords' },
            all_reasons: {
              $push: {
                $cond: [
                  { $ne: ['$sentiment_analysis.primary_negative_reason', null] },
                  '$sentiment_analysis.primary_negative_reason',
                  '$$REMOVE'
                ]
              }
            }
          }
        }
      ];

      const [result] = await Review.aggregate(pipeline);

      if (!result) {
        // No reviews for this product yet, skip or set defaults
        continue;
      }

      // Compute top keywords
      const keywordFreq = {};
      (result.all_keywords || []).flat().forEach((kw) => {
        if (kw && typeof kw === 'string') {
          const key = kw.toLowerCase().trim();
          if (key.length > 1) {
            keywordFreq[key] = (keywordFreq[key] || 0) + 1;
          }
        }
      });
      const topKeywords = Object.entries(keywordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([kw]) => kw);

      // Compute top complaints
      const reasonFreq = {};
      (result.all_reasons || []).forEach((r) => {
        if (r) reasonFreq[r] = (reasonFreq[r] || 0) + 1;
      });
      const topComplaints = Object.entries(reasonFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason]) => reason);

      // Calculate percents
      const positivePercent = Math.round((result.positive_count / result.total_analyzed) * 100);
      const fakePercent = Math.round((result.fake_count / result.total_analyzed) * 100);

      // Calculate Seller Trust Score
      const verifiedRate = result.verified_purchase_count / result.total_analyzed;
      const authenticityRate = 1 - (result.fake_count / result.total_analyzed);
      const ratingRate = (result.average_rating || 0) / 5;
      const sellerTrustScore = Math.round((0.4 * verifiedRate + 0.4 * authenticityRate + 0.2 * ratingRate) * 100);

      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            'sentiment_summary.total_analyzed': result.total_analyzed,
            'sentiment_summary.positive_count': result.positive_count,
            'sentiment_summary.negative_count': result.negative_count,
            'sentiment_summary.neutral_count': result.neutral_count,
            'sentiment_summary.fake_count': result.fake_count,
            'sentiment_summary.average_sentiment_score': Math.round(result.average_sentiment_score * 100) / 100,
            'sentiment_summary.top_keywords': topKeywords,
            'sentiment_summary.top_complaints': topComplaints,
            'sentiment_summary.last_analyzed_at': new Date(),
            positive_percent: positivePercent,
            fake_percent: fakePercent,
            seller_trust_score: sellerTrustScore,
            average_rating: Math.round((result.average_rating || 0) * 100) / 100,
            review_count: result.total_reviews
          }
        }
      );

      updatedCount++;

      if (updatedCount % 50 === 0) {
        logger.info(`Recomputed ${updatedCount}/${products.length} products...`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`=== Statistics Recomputation Complete ===`, {
      totalProducts: products.length,
      updatedProducts: updatedCount,
      timeSeconds: elapsed
    });

  } catch (err) {
    logger.error('Error in recomputation process', { error: err.message, stack: err.stack });
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

main();

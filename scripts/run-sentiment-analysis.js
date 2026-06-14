/**
 * Run Sentiment Analysis Script
 *
 * Batch processes reviews using Groq API (Llama-3.1-8b-instant) for:
 *   1. Sentiment classification (positive / negative / neutral)
 *   2. Fake review detection
 *   3. Keyword extraction
 *   4. Negative reason categorization
 *
 * After analyzing reviews, aggregates results into the parent product's
 * `sentiment_summary` and updates `positive_percent`.
 *
 * Usage:
 *   node scripts/run-sentiment-analysis.js                     # analyze pending
 *   node scripts/run-sentiment-analysis.js --reanalyze          # re-analyze all
 *   node scripts/run-sentiment-analysis.js --max 100            # limit count
 *   node scripts/run-sentiment-analysis.js --product <id>       # single product
 *   node scripts/run-sentiment-analysis.js --dry-run            # preview only
 *
 * Environment:
 *   MONGODB_URI, GROQ_API_KEY, GROQ_MODEL, SENTIMENT_BATCH_SIZE,
 *   SENTIMENT_DELAY_MS, SENTIMENT_MAX_RETRIES
 */

const mongoose = require('mongoose');
const config = require('../src/config');
const { logger } = require('../src/utils/logger');
const { analyzeReview, getDelayMs, sleep } = require('../src/services/sentiment-analyzer');

// Ensure models are registered
require('../src/models');

const Review = mongoose.model('Review');
const Product = mongoose.model('Product');

// ---------- CLI Args ----------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    reanalyze: false,
    dryRun: false,
    maxReviews: null,
    productId: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--reanalyze':
        opts.reanalyze = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--max':
        opts.maxReviews = parseInt(args[++i], 10) || null;
        break;
      case '--product':
        opts.productId = args[++i] || null;
        break;
    }
  }

  return opts;
}

// ---------- Main ----------

async function main() {
  const opts = parseArgs();
  const BATCH_SIZE = parseInt(process.env.SENTIMENT_BATCH_SIZE || '50', 10);
  const DELAY = getDelayMs();

  logger.info('=== Sentiment Analysis Script Started ===');
  logger.info('Configuration', {
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    batchSize: BATCH_SIZE,
    delayMs: DELAY,
    reanalyze: opts.reanalyze,
    dryRun: opts.dryRun,
    maxReviews: opts.maxReviews,
    productId: opts.productId,
    mongoUri: config.mongodb.uri ? '[set]' : '[missing]',
    groqKey: process.env.GROQ_API_KEY ? '[set]' : '[MISSING]',
  });

  if (!process.env.GROQ_API_KEY) {
    logger.error('GROQ_API_KEY is not set! Exiting.');
    process.exit(1);
  }

  // Connect to MongoDB
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('Failed to connect to MongoDB', { error: err.message });
    process.exit(1);
  }

  // Build query for reviews that need analysis
  const query = {};

  if (opts.productId) {
    if (!mongoose.Types.ObjectId.isValid(opts.productId)) {
      logger.error('Invalid product ID');
      process.exit(1);
    }
    query.product_id = new mongoose.Types.ObjectId(opts.productId);
  }

  if (!opts.reanalyze) {
    // Only reviews that still need analysis
    query.$or = [
      { 'sentiment_analysis.needs_analysis': true },
      { 'sentiment_analysis.needs_analysis': { $exists: false } },
      { sentiment_analysis: { $exists: false } },
      { sentiment_analysis: null },
    ];
  }

  // Count total
  const totalPending = await Review.countDocuments(query);
  const totalToProcess = opts.maxReviews
    ? Math.min(totalPending, opts.maxReviews)
    : totalPending;

  logger.info(`Found ${totalPending} reviews matching query, will process ${totalToProcess}`);

  if (totalToProcess === 0) {
    logger.info('No reviews to process. Exiting.');
    await mongoose.disconnect();
    return;
  }

  if (opts.dryRun) {
    logger.info('[DRY RUN] Would process reviews. No changes made.');
    // Show a sample
    const samples = await Review.find(query).limit(5).select('text rating verified_purchase').lean();
    samples.forEach((s, i) => {
      logger.info(`  Sample ${i + 1}: rating=${s.rating}, text="${(s.text || '').substring(0, 80)}..."`);
    });
    await mongoose.disconnect();
    return;
  }

  // Process in batches using cursor-based pagination
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let lastId = null;
  const affectedProductIds = new Set();
  const startTime = Date.now();

  while (processed < totalToProcess) {
    const batchQuery = lastId ? { ...query, _id: { $gt: lastId } } : query;
    const batchLimit = Math.min(BATCH_SIZE, totalToProcess - processed);

    const reviews = await Review.find(batchQuery)
      .sort({ _id: 1 })
      .limit(batchLimit)
      .select('text rating verified_purchase reviewer_name product_id sentiment_analysis')
      .lean();

    if (reviews.length === 0) break;

    lastId = reviews[reviews.length - 1]._id;

    for (const review of reviews) {
      try {
        // Analyze the review
        const result = await analyzeReview({
          text: review.text,
          rating: review.rating,
          verified_purchase: review.verified_purchase,
          reviewer_name: review.reviewer_name,
        });

        // Update the review document
        await Review.updateOne(
          { _id: review._id },
          {
            $set: {
              'sentiment_analysis.sentiment': result.sentiment,
              'sentiment_analysis.score': result.score,
              'sentiment_analysis.keywords': result.keywords,
              'sentiment_analysis.primary_negative_reason': result.primary_negative_reason,
              'sentiment_analysis.is_likely_fake': result.is_likely_fake,
              'sentiment_analysis.needs_analysis': false,
            },
          }
        );

        logger.info(`[${succeeded + 1}] Review by "${review.reviewer_name}" (${review.rating}★) -> Sentiment: ${result.sentiment} (Score: ${result.score}), Fake: ${result.is_likely_fake}`);

        // Track affected product
        if (review.product_id) {
          affectedProductIds.add(review.product_id.toString());
        }

        succeeded++;

        // Respect rate limits — wait between API calls
        if (review.text && review.text.trim().length >= 2) {
          await sleep(DELAY);
        }
      } catch (err) {
        failed++;
        logger.error(`Failed to analyze review ${review._id}`, {
          error: err.message,
        });
      }

      processed++;

      // Progress logging every 25 reviews
      if (processed % 25 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (processed / (elapsed || 1)).toFixed(1);
        logger.info(`Progress: ${processed}/${totalToProcess} (${succeeded} ok, ${failed} err) | ${elapsed}s elapsed | ${rate} reviews/sec`);
      }
    }
  }

  // ---------- Aggregate Product Sentiment ----------

  logger.info(`\nAggregating sentiment for ${affectedProductIds.size} products...`);

  let productsUpdated = 0;

  for (const productIdStr of affectedProductIds) {
    try {
      const productId = new mongoose.Types.ObjectId(productIdStr);
      await aggregateProductSentiment(productId);
      productsUpdated++;
    } catch (err) {
      logger.error(`Failed to aggregate product ${productIdStr}`, {
        error: err.message,
      });
    }
  }

  // ---------- Summary ----------

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  logger.info('=== Sentiment Analysis Complete ===');
  logger.info('Summary', {
    totalProcessed: processed,
    succeeded,
    failed,
    skipped,
    productsUpdated,
    totalTimeSeconds: totalTime,
    averagePerReview: processed > 0 ? (parseFloat(totalTime) / processed).toFixed(2) + 's' : 'N/A',
  });

  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}

// ---------- Product Aggregation ----------

/**
 * Aggregate all analyzed reviews for a product and update the product's
 * sentiment_summary and positive_percent fields.
 *
 * @param {mongoose.Types.ObjectId} productId
 */
async function aggregateProductSentiment(productId) {
  const pipeline = [
    {
      $match: {
        product_id: productId,
        'sentiment_analysis.needs_analysis': { $ne: true },
        'sentiment_analysis.sentiment': { $exists: true },
      },
    },
    {
      $group: {
        _id: null,
        total_analyzed: { $sum: 1 },
        positive_count: {
          $sum: { $cond: [{ $eq: ['$sentiment_analysis.sentiment', 'positive'] }, 1, 0] },
        },
        negative_count: {
          $sum: { $cond: [{ $eq: ['$sentiment_analysis.sentiment', 'negative'] }, 1, 0] },
        },
        neutral_count: {
          $sum: { $cond: [{ $eq: ['$sentiment_analysis.sentiment', 'neutral'] }, 1, 0] },
        },
        fake_count: {
          $sum: { $cond: [{ $eq: ['$sentiment_analysis.is_likely_fake', true] }, 1, 0] },
        },
        average_sentiment_score: { $avg: '$sentiment_analysis.score' },
        average_rating: { $avg: '$rating' },
        total_reviews: { $sum: 1 },
        // Collect all keywords into a single array
        all_keywords: { $push: '$sentiment_analysis.keywords' },
        // Collect negative reasons
        all_reasons: {
          $push: {
            $cond: [
              { $ne: ['$sentiment_analysis.primary_negative_reason', null] },
              '$sentiment_analysis.primary_negative_reason',
              '$$REMOVE',
            ],
          },
        },
      },
    },
  ];

  const [result] = await Review.aggregate(pipeline);

  if (!result) {
    logger.debug(`No analyzed reviews found for product ${productId}`);
    return;
  }

  // Compute top keywords (most frequent across all reviews)
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

  // Calculate positive percent
  const positivePercent =
    result.total_analyzed > 0
      ? Math.round((result.positive_count / result.total_analyzed) * 100)
      : 0;

  // Update product
  await Product.updateOne(
    { _id: productId },
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
        average_rating: Math.round((result.average_rating || 0) * 100) / 100,
        review_count: result.total_reviews,
      },
    }
  );

  logger.debug(`Updated product ${productId}: ${positivePercent}% positive, ${result.fake_count} fake, ${result.total_analyzed} analyzed`);
}

// ---------- Run ----------

main().catch((err) => {
  logger.error('Fatal error', { message: err.message, stack: err.stack });
  process.exitCode = 1;
  mongoose.disconnect().catch(() => {});
});

/**
 * Compute Product Scores Script (MCDM Precomputation)
 *
 * Responsibilities:
 * - Process products in batches (default 300)
 * - Compute all 4 criteria (totalCost, qualityIndex, trust, convenience)
 * - Update `products.computed_scores` for fast ranking
 *
 * Usage:
 *   node scripts/computeProductScores.js
 *
 * Environment variables:
 * - MONGODB_URI
 * - SCORE_BATCH_SIZE (default: 300)
 * - SCORE_CONCURRENCY (default: 25)
 * - SCORE_RECOMPUTE_ALL (default: false)
 * - SCORE_MAX_PRODUCTS (optional cap, mostly for testing)
 */

const mongoose = require('mongoose');

const config = require('../src/config');
const { logger } = require('../src/utils/logger');

// Ensure model is registered
require('../src/models');

const Product = mongoose.model('Product');

const DEFAULT_BATCH_SIZE = 300;
const DEFAULT_CONCURRENCY = 25;
const MIN_DELIVERY_DAYS = 1;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Very small concurrency limiter (no external deps).
 *
 * @template T
 * @param {Array<() => Promise<T>>} tasks
 * @param {number} concurrency
 * @returns {Promise<T[]>}
 */
async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const taskIndex = index;
      index += 1;

      // eslint-disable-next-line no-await-in-loop
      results[taskIndex] = await tasks[taskIndex]();
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Attempts to parse delivery days from the `delivery_time` string.
 * Supports values like: "3-5 days", "5 days", "Within 24 hours", "Next day".
 * Falls back to 7 days.
 *
 * @param {string | undefined | null} deliveryTime
 * @returns {number}
 */
function parseDeliveryDays(deliveryTime) {
  if (!deliveryTime || typeof deliveryTime !== 'string') return 7;

  const text = deliveryTime.toLowerCase();

  if (text.includes('next day')) return 1;
  if (text.includes('same day')) return 1;
  if (text.includes('24 hour')) return 1;

  // Range e.g. "3-5 days"
  const rangeMatch = text.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[2], 10);
    if (Number.isFinite(a) && Number.isFinite(b)) return clamp(Math.ceil((a + b) / 2), 1, 60);
  }

  // Single number e.g. "5 days"
  const numberMatch = text.match(/(\d+)/);
  if (numberMatch) {
    const n = parseInt(numberMatch[1], 10);
    if (Number.isFinite(n)) return clamp(n, 1, 60);
  }

  return 7;
}

/**
 * @param {string | undefined | null} availability
 * @returns {boolean}
 */
function isInStock(availability) {
  // In our schema, we use: in_stock, out_of_stock, limited, pre_order
  return availability === 'in_stock';
}

/**
 * Platform trust is not explicitly stored in the Product schema yet.
 * This provides a deterministic fallback mapping based on `platform_name`.
 *
 * TODO: Replace with a dedicated platform trust score field in Platform model.
 *
 * @returns {number} range [0, 1]
 */
function getPlatformTrustScore() {
  // Platform trust score is not stored in DB yet. Keep this batch job fast by using
  // a hardcoded constant for all platforms (optionally overridden by env var).
  //
  // TODO: Precompute per-platform trust offline and store in Platform model, then read it here.
  const trust = parseFloat(process.env.PLATFORM_TRUST_SCORE || '0.7');
  return Number.isFinite(trust) ? clamp(trust, 0, 1) : 0.7;
}

/**
 * MCDM Criterion 1 (Cost - minimize)
 * totalCost = (sale_price || price) + (shipping_cost || 0)
 *
 * @param {Object} product
 * @returns {number}
 */
function computeTotalCost(product) {
  const base = typeof product.sale_price === 'number' ? product.sale_price : product.price;
  const shipping = typeof product.shipping_cost === 'number' ? product.shipping_cost : 0;
  return (base || 0) + shipping;
}

/**
 * MCDM Criterion 2 (Benefit - maximize)
 * qualityIndex = (average_rating / 5) * 0.5 + (log(review_count + 1) / 10) * 0.2 + (positive_percent / 100) * 0.3
 *
 * @param {Object} product
 * @returns {number}
 */
function computeQualityIndex(product) {
  const averageRating = typeof product.average_rating === 'number' ? product.average_rating : 0;
  const reviewCount = typeof product.review_count === 'number' ? product.review_count : 0;
  // In this dataset, `positive_percent` is -1 when not yet calculated.
  // Treat unknown as neutral (50%) so it doesn't distort scoring.
  const positiveRaw = typeof product.positive_percent === 'number' ? product.positive_percent : -1;
  const positivePercent = positiveRaw >= 0 ? positiveRaw : 50;

  const ratingComponent = (averageRating / 5) * 0.5;
  const reviewComponent = (Math.log(reviewCount + 1) / 10) * 0.2;
  const positiveComponent = (positivePercent / 100) * 0.3;

  return ratingComponent + reviewComponent + positiveComponent;
}

/**
 * MCDM Criterion 3 (Benefit - maximize)
 * trust = min(review_count / 100, 1) * 0.4
 *       + (condition === "new" ? 1 : 0.6) * 0.2
 *       + (positive_percent / 100) * 0.2
 *       + platformTrustScore * 0.2
 *
 * @param {Object} product
 * @returns {number}
 */
function computeTrust(product) {
  const reviewCount = typeof product.review_count === 'number' ? product.review_count : 0;
  // In this dataset, `positive_percent` is -1 when not yet calculated.
  // Treat unknown as neutral (50%) so it doesn't distort scoring.
  const positiveRaw = typeof product.positive_percent === 'number' ? product.positive_percent : -1;
  const positivePercent = positiveRaw >= 0 ? positiveRaw : 50;
  const condition = product.condition;

  const platformTrustScore = getPlatformTrustScore();

  const reviewCountComponent = Math.min(reviewCount / 100, 1) * 0.4;
  const conditionComponent = (condition === 'new' ? 1 : 0.6) * 0.2;
  const positiveComponent = (positivePercent / 100) * 0.2;
  const platformComponent = platformTrustScore * 0.2;

  return reviewCountComponent + conditionComponent + positiveComponent + platformComponent;
}

/**
 * MCDM Criterion 4 (Benefit - maximize)
 * convenience = (1 / deliveryDays) * 0.6 + (availability === "in stock" ? 1 : 0.5) * 0.4
 *
 * Notes:
 * - Our schema uses `availability: in_stock|out_of_stock|limited|pre_order`
 * - We parse `deliveryDays` from `delivery_time` (string) with a fallback.
 *
 * @param {Object} product
 * @returns {number}
 */
function computeConvenience(product) {
  const deliveryDays = clamp(parseDeliveryDays(product.delivery_time), MIN_DELIVERY_DAYS, 60);
  const inStockValue = isInStock(product.availability) ? 1 : 0.5;

  return (1 / deliveryDays) * 0.6 + inStockValue * 0.4;
}

/**
 * @param {Object} product
 * @param {Date} now
 * @returns {{ totalCost: number, qualityIndex: number, trust: number, convenience: number, lastComputedAt: Date }}
 */
function buildComputedScores(product, now) {
  return {
    totalCost: computeTotalCost(product),
    qualityIndex: computeQualityIndex(product),
    trust: computeTrust(product),
    convenience: computeConvenience(product),
    lastComputedAt: now,
  };
}

async function main() {
  // Debug env + config early
  logger.info('MCDM script starting with environment snapshot', {
    MONGODB_URI: process.env.MONGODB_URI ? '[set]' : '[missing]',
    SCORE_BATCH_SIZE: process.env.SCORE_BATCH_SIZE,
    SCORE_CONCURRENCY: process.env.SCORE_CONCURRENCY,
    SCORE_RECOMPUTE_ALL: process.env.SCORE_RECOMPUTE_ALL,
    SCORE_MAX_PRODUCTS: process.env.SCORE_MAX_PRODUCTS,
  });

  logger.info('Resolved MongoDB config', {
    uri: config.mongodb.uri,
    options: config.mongodb.options,
  });

  const batchSize = clamp(
    parseInt(process.env.SCORE_BATCH_SIZE || '', 10) || DEFAULT_BATCH_SIZE,
    50,
    500
  );
  const concurrency = clamp(
    parseInt(process.env.SCORE_CONCURRENCY || '', 10) || DEFAULT_CONCURRENCY,
    1,
    100
  );
  const recomputeAll = (process.env.SCORE_RECOMPUTE_ALL || 'false').toLowerCase() === 'true';

  const maxProductsRaw = parseInt(process.env.SCORE_MAX_PRODUCTS || '', 10);
  const maxProducts = Number.isFinite(maxProductsRaw) ? Math.max(1, maxProductsRaw) : null;

  logger.info('Starting MCDM product score precomputation...', {
    batchSize,
    concurrency,
    recomputeAll,
    maxProducts: maxProducts || null,
  });

  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('Connected to MongoDB');

    let processed = 0;
    let updated = 0;

    const baseQuery = {
      is_active: true,
      ...(recomputeAll
        ? {}
        : {
            $or: [
              { 'computed_scores.lastComputedAt': null },
              {
                $expr: {
                  $gt: ['$updatedAt', '$computed_scores.lastComputedAt'],
                },
              },
            ],
          }),
    };

    logger.debug('Base query for products', { baseQuery });

    let lastId = null;

    while (true) {
      const query = lastId ? { ...baseQuery, _id: { $gt: lastId } } : baseQuery;

      logger.debug('Fetching batch with query', { query });

      // eslint-disable-next-line no-await-in-loop
      const products = await Product.find(query)
        .sort({ _id: 1 })
        .limit(batchSize)
        .select(
          [
            'price',
            'sale_price',
            'shipping_cost',
            'average_rating',
            'review_count',
            'positive_percent',
            'condition',
            'platform_name',
            'availability',
            'delivery_time',
            'computed_scores.lastComputedAt',
            'updatedAt',
          ].join(' ')
        )
        .lean();

      logger.info('Fetched batch', { size: products.length });

      if (!products.length) {
        logger.info('No more products to process, exiting loop');
        break;
      }

      lastId = products[products.length - 1]._id;

      const now = new Date();

      const tasks = products.map(product => async () => {
        const computedScores = buildComputedScores(product, now);

        logger.debug('Updating product computed_scores', {
          productId: product._id,
          computedScores,
        });

        const result = await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              computed_scores: computedScores,
            },
          }
        );

        // result.modifiedCount exists in newer drivers; nModified in older.
        const modified = result?.modifiedCount ?? result?.nModified ?? 0;
        return modified;
      });

      // eslint-disable-next-line no-await-in-loop
      const modifiedCounts = await runWithConcurrency(tasks, concurrency);

      processed += products.length;
      updated += modifiedCounts.reduce((sum, v) => sum + (v || 0), 0);

      logger.info('Batch summary', {
        batchSize: products.length,
        cumulativeProcessed: processed,
        cumulativeUpdated: updated,
      });

      if (maxProducts && processed >= maxProducts) {
        logger.warn('Stopping early due to SCORE_MAX_PRODUCTS cap', {
          processed,
          maxProducts,
        });
        break;
      }
    }

    logger.info('MCDM precomputation complete', { processed, updated });
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Score computation failed', {
      message: error.message,
      stack: error.stack,
    });
    process.exitCode = 1;

    try {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB after error');
    } catch (disconnectError) {
      logger.error('Failed to disconnect MongoDB cleanly', {
        message: disconnectError.message,
        stack: disconnectError.stack,
      });
    }
  }
}

main();

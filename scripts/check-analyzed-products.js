/**
 * Check Analyzed Products & Reviews Script
 * 
 * Utility to verify sentiment analysis results stored in the local MongoDB database.
 * Usage:
 *   node scripts/check-analyzed-products.js
 */

const mongoose = require('mongoose');
const config = require('../src/config');

// Ensure models are registered
require('../src/models');

const Review = mongoose.model('Review');
const Product = mongoose.model('Product');

async function main() {
  console.log('=== Checking Analyzed Data in Local MongoDB ===');
  
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('Connected to MongoDB.');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  // Count total and analyzed reviews
  const totalReviews = await Review.countDocuments({});
  const analyzedReviews = await Review.countDocuments({ 'sentiment_analysis.needs_analysis': false });
  const fakeReviews = await Review.countDocuments({ 'sentiment_analysis.is_likely_fake': true });
  
  console.log(`\nReview Statistics:`);
  console.log(`- Total Reviews: ${totalReviews}`);
  console.log(`- Analyzed Reviews: ${analyzedReviews}`);
  console.log(`- Pending Reviews: ${totalReviews - analyzedReviews}`);
  console.log(`- Likely Fake Reviews Detected: ${fakeReviews}`);

  // Fetch some analyzed reviews
  if (analyzedReviews > 0) {
    console.log('\n--- Sample Analyzed Reviews (First 3) ---');
    const samples = await Review.find({ 'sentiment_analysis.needs_analysis': false })
      .limit(3)
      .select('reviewer_name rating text verified_purchase sentiment_analysis product_id')
      .lean();

    samples.forEach((r, idx) => {
      console.log(`\n[Sample ${idx + 1}]`);
      console.log(`- Reviewer: ${r.reviewer_name}`);
      console.log(`- Rating: ${r.rating}/5 (Verified: ${r.verified_purchase})`);
      console.log(`- Text: "${r.text ? r.text.substring(0, 100) + '...' : '[No Text]'}"`);
      console.log(`- Analysis Result:`, JSON.stringify(r.sentiment_analysis, null, 2));
    });
  }

  // Fetch products with sentiment summaries
  const productsWithSummary = await Product.find({ 'sentiment_summary.total_analyzed': { $gt: 0 } })
    .select('name price positive_percent average_rating review_count sentiment_summary')
    .lean();

  console.log(`\nProduct Statistics:`);
  console.log(`- Products with Sentiment Summaries: ${productsWithSummary.length}`);

  if (productsWithSummary.length > 0) {
    console.log('\n--- Products with Sentiment Summaries ---');
    productsWithSummary.forEach((p, idx) => {
      console.log(`\n[Product ${idx + 1}]`);
      console.log(`- Name: ${p.name}`);
      console.log(`- Rating / Count: ${p.average_rating}★ (${p.review_count} reviews)`);
      console.log(`- Positive Percent: ${p.positive_percent}% (Used by MCDM Ranking)`);
      console.log(`- Sentiment Summary:`, JSON.stringify(p.sentiment_summary, null, 2));
    });
  } else {
    console.log('\nNo products found with aggregated sentiment summaries yet.');
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB.');
}

main().catch(console.error);

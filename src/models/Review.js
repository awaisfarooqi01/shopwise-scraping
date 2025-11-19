/**
 * Review Model (for Scraping Service)
 * Stores product reviews from various e-commerce platforms
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // Product Reference
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    
    // Platform Reference
    platform_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Platform',
      required: [true, 'Platform ID is required'],
    },
    platform_name: {
      type: String,
      trim: true,
    },
    
    // Review Information
    reviewer_name: {
      type: String,
      required: [true, 'Reviewer name is required'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      trim: true,
    },
    review_date: {
      type: Date,
      required: [true, 'Review date is required'],
    },
    
    // Engagement Metrics
    helpful_votes: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Verification
    verified_purchase: {
      type: Boolean,
      default: false,
    },
      // Media
    images: [String],
    
    // Sentiment Analysis (to be populated later by ML service)
    sentiment_analysis: {
      sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral', 'mixed'],
      },
      score: {
        type: Number,
        min: -1,
        max: 1,
      },
      keywords: [
        {
          word: String,
          sentiment: String,
          weight: Number,
        },
      ],
      primary_negative_reason: {
        type: String,
        trim: true,
      },
      is_likely_fake: {
        type: Boolean,
        default: false,
      },
      needs_analysis: {
        type: Boolean,
        default: true,
      },
    },
    
    // Platform Metadata
    platform_metadata: {
      review_id: {
        type: String,
        trim: true,
      },
      original_url: {
        type: String,
        trim: true,
      },
    },
    
    // Status
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'reviews',
  }
);

// Indexes
reviewSchema.index({ product_id: 1, review_date: -1 });
reviewSchema.index({ platform_id: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ review_date: -1 });
reviewSchema.index({ 'sentiment_analysis.sentiment': 1 });
reviewSchema.index({ 'sentiment_analysis.needs_analysis': 1 });
reviewSchema.index({ verified_purchase: 1 });
reviewSchema.index({ helpful_votes: -1 });

// Compound indexes
reviewSchema.index({ product_id: 1, rating: 1 });
reviewSchema.index({ product_id: 1, verified_purchase: 1 });

module.exports = mongoose.model('Review', reviewSchema);

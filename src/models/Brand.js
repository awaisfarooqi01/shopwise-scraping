/**
 * Brand Model for Scraper
 * Matches backend Brand schema for direct database operations
 */

const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      unique: true,
      trim: true,
    },
    normalized_name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    aliases: [
      {
        type: String,
        trim: true,
      },
    ],
    logo_url: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    product_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    popularity_score: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'brands',
  }
);

// Indexes for performance
brandSchema.index({ name: 'text' });
brandSchema.index({ normalized_name: 1 });
brandSchema.index({ aliases: 1 });
brandSchema.index({ product_count: -1 });
brandSchema.index({ popularity_score: -1 });
brandSchema.index({ is_verified: 1, is_active: 1 });

module.exports = mongoose.model('Brand', brandSchema);

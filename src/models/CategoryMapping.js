/**
 * Category Mapping Model for Scraper
 * Matches backend CategoryMapping schema for direct database operations
 */

const mongoose = require('mongoose');

const categoryMappingSchema = new mongoose.Schema(
  {
    platform_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Platform',
      required: [true, 'Platform ID is required'],
      index: true,
    },
    platform_category: {
      type: String,
      required: [true, 'Platform category is required'],
      trim: true,
    },
    platform_category_path: {
      type: String,
      trim: true,
    },
    our_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Our category ID is required'],
    },
    our_subcategory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    mapping_type: {
      type: String,
      enum: ['manual', 'auto', 'rule', 'fuzzy', 'ml'],
      default: 'auto',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verified_at: {
      type: Date,
    },
    usage_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    last_used: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'category_mappings',
  }
);

// Compound unique index to prevent duplicate mappings
categoryMappingSchema.index(
  { platform_id: 1, platform_category: 1 },
  { unique: true }
);

// Index for fast lookups
categoryMappingSchema.index({ our_category_id: 1 });
categoryMappingSchema.index({ our_subcategory_id: 1 });
categoryMappingSchema.index({ is_verified: 1, is_active: 1 });
categoryMappingSchema.index({ confidence: -1 });
categoryMappingSchema.index({ usage_count: -1 });

module.exports = mongoose.model('CategoryMapping', categoryMappingSchema);

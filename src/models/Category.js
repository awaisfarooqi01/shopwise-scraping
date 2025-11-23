/**
 * Category Model for Scraper
 * Simplified version - matches backend Category schema
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  parent_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  path: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  icon: {
    type: String,
    default: '📦'
  },
  description: {
    type: String,
    default: ''
  },
  is_active: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ name: 1, parent_category_id: 1 }, { unique: true });
categorySchema.index({ level: 1 });
categorySchema.index({ is_active: 1 });

module.exports = mongoose.model('Category', categorySchema);

/**
 * Platform Model (for Scraping Service)
 * References e-commerce platforms
 */

const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Platform name is required'],
      trim: true,
      unique: true,
    },
    base_url: {
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
    collection: 'platforms',
  }
);

module.exports = mongoose.model('Platform', platformSchema);

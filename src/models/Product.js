/**
 * Product Model (for Scraping Service)
 * Uses the same schema as backend but for the scraping service
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
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
    original_url: {
      type: String,
      required: [true, 'Original URL is required'],
      trim: true,
    },

    // Basic Information
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    
    // Brand
    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
    },
    brand: {
      type: String,
      trim: true,
    },
    
    // Category
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    category_name: {
      type: String,
      trim: true,
    },
    subcategory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    subcategory_name: {
      type: String,
      trim: true,
    },
      // Description (clean text, no HTML)
    description: {
      type: String,
      trim: true,
    },
    
    // Variants
    variants: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    
    // Specifications
    specifications: {
      type: Map,
      of: String,
    },
    
    // Media
    media: {
      images: [
        {
          url: { type: String },
          type: { type: String },
          alt_text: { type: String },
        },
      ],
      videos: [
        {
          url: { type: String },
          thumbnail: { type: String },
          duration: { type: Number },
        },
      ],
    },
    
    // Availability
    availability: {
      type: String,
      enum: ['in_stock', 'out_of_stock', 'limited', 'pre_order'],
      default: 'in_stock',
    },
    
    // Pricing
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    sale_price: {
      type: Number,
      min: 0,
    },
    sale_percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    sale_duration_days: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'PKR',
      enum: ['PKR', 'USD', 'EUR'],
    },
    
    // Reviews/Ratings
    average_rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    review_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    positive_percent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    
    // Additional Info
    condition: {
      type: String,
      enum: ['new', 'used', 'refurbished'],
      default: 'new',
    },
    shipping_cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    delivery_time: {
      type: String,
      trim: true,
    },
    
    // Metadata
    platform_metadata: {
      original_category: {
        type: String,
        trim: true,
      },
      original_category_path: {
        type: String,
        trim: true,
      },
      original_brand: {
        type: String,
        trim: true,
      },
      original_subcategory: {
        type: String,
        trim: true,
      },
    },
    
    // Mapping Metadata
    mapping_metadata: {
      category_confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      brand_confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      category_source: {
        type: String,
        enum: ['manual', 'auto', 'rule', 'fuzzy', 'database_verified'],
      },      brand_source: {
        type: String,
        enum: [
          'exact_match',
          'case_insensitive',
          'fuzzy_match',
          'auto_created',
          'cache',
        ],
      },
      needs_review: {
        type: Boolean,
        default: false,
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
    collection: 'products',
  }
);

// Indexes
productSchema.index({ platform_id: 1 });
productSchema.index({ brand_id: 1 });
productSchema.index({ category_id: 1 });
productSchema.index({ original_url: 1 }, { unique: true });
productSchema.index({ name: 'text', brand: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ average_rating: -1 });
productSchema.index({ 'mapping_metadata.needs_review': 1 });
productSchema.index({ brand_id: 1, category_id: 1 });

module.exports = mongoose.model('Product', productSchema);

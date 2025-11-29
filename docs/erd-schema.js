/**
 * ShopWise Backend - Entity Relationship Diagram Schema
 * 
 * This file contains the complete database schema definition based on the ERD.
 * It represents all collections, their fields, data types, and relationships.
 * 
 * @author ShopWise Team
 * @date November 2025
 * @version 1.0
 */

const ERD_SCHEMA = {
  /**
   * Brands Collection
   * ✨ NEW: Canonical brand information for product normalization
   */
  brands: {
    collectionName: 'brands',
    description: 'Stores canonical brand information for product normalization across platforms',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the brand'
      },
      name: {
        type: 'String',
        nullable: false,
        unique: true,
        indexed: true,
        description: 'Official brand name'
      },
      normalized_name: {
        type: 'String',
        nullable: false,
        indexed: true,
        description: 'Lowercase normalized brand name for matching'
      },
      aliases: {
        type: 'Array',
        items: 'String',
        nullable: true,
        indexed: true,
        description: 'Alternative brand names and spellings'
      },
      logo_url: {
        type: 'String',
        nullable: true,
        description: 'Brand logo URL'
      },
      website: {
        type: 'String',
        nullable: true,
        description: 'Official brand website'
      },
      country: {
        type: 'String',
        nullable: true,
        indexed: true,
        description: 'Country of origin'
      },
      description: {
        type: 'String',
        nullable: true,
        description: 'Brand description'
      },
      is_verified: {
        type: 'Boolean',
        default: false,
        indexed: true,
        description: 'Whether brand is verified'
      },
      product_count: {
        type: 'Int32',
        default: 0,
        indexed: true,
        description: 'Number of products using this brand'
      },
      popularity_score: {
        type: 'Int32',
        default: 0,
        indexed: true,
        description: 'Brand popularity score'
      },
      is_active: {
        type: 'Boolean',
        default: true,
        indexed: true,
        description: 'Whether brand is active'
      },
      createdAt: {
        type: 'Date',
        nullable: false,
        description: 'Record creation timestamp'
      },
      updatedAt: {
        type: 'Date',
        nullable: false,
        description: 'Record last update timestamp'
      }
    },
    indexes: [
      { field: 'name', type: 'text' },
      { field: 'normalized_name', type: 'ascending' },
      { field: 'aliases', type: 'ascending' },
      { field: 'product_count', type: 'descending' },
      { field: 'popularity_score', type: 'descending' },
      { field: ['is_verified', 'is_active'], type: 'compound' }
    ],
    relationships: {
      products: {
        type: 'one-to-many',
        foreignKey: 'brand_id',
        description: 'Products using this brand'
      }
    }
  },

  /**
   * Category Mappings Collection
   * ✨ NEW: Maps platform-specific categories to our unified category system
   */
  category_mappings: {
    collectionName: 'category_mappings',
    description: 'Maps platform-specific categories to unified category system',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the mapping'
      },
      platform_id: {
        type: 'ObjectId',
        nullable: false,
        reference: 'platforms',
        indexed: true,
        description: 'Reference to the e-commerce platform'
      },
      platform_category: {
        type: 'String',
        nullable: false,
        indexed: true,
        description: 'Original category name from platform'
      },
      platform_category_path: {
        type: 'String',
        nullable: true,
        description: 'Full category path from platform (e.g., Electronics > Mobiles)'
      },
      our_category_id: {
        type: 'ObjectId',
        nullable: false,
        reference: 'categories',
        indexed: true,
        description: 'Reference to our unified main category'
      },
      our_subcategory_id: {
        type: 'ObjectId',
        nullable: true,
        reference: 'categories',
        indexed: true,
        description: 'Reference to our unified subcategory'
      },
      mapping_type: {
        type: 'String',
        enum: ['manual', 'automatic', 'ml_suggested'],
        default: 'manual',
        indexed: true,
        description: 'How the mapping was created'
      },
      confidence: {
        type: 'Double',
        default: 1.0,
        description: 'Mapping confidence score (0-1)'
      },
      is_verified: {
        type: 'Boolean',
        default: false,
        indexed: true,
        description: 'Whether mapping is verified by admin'
      },
      usage_count: {
        type: 'Int32',
        default: 0,
        description: 'Number of products using this mapping'
      },
      is_active: {
        type: 'Boolean',
        default: true,
        indexed: true,
        description: 'Whether mapping is active'
      },
      createdAt: {
        type: 'Date',
        nullable: false,
        description: 'Record creation timestamp'
      },
      updatedAt: {
        type: 'Date',
        nullable: false,
        description: 'Record last update timestamp'
      }
    },
    indexes: [
      { field: ['platform_id', 'platform_category'], type: 'compound', unique: true },
      { field: 'our_category_id', type: 'ascending' },
      { field: 'mapping_type', type: 'ascending' },
      { field: ['is_verified', 'is_active'], type: 'compound' }
    ],
    relationships: {
      platform: {
        type: 'many-to-one',
        foreignKey: 'platform_id',
        description: 'The platform this mapping belongs to'
      },
      category: {
        type: 'many-to-one',
        foreignKey: 'our_category_id',
        description: 'The unified category this maps to'
      },
      subcategory: {
        type: 'many-to-one',
        foreignKey: 'our_subcategory_id',
        description: 'The unified subcategory this maps to'
      }
    }
  },

  /**
   * Products Collection
   * Main collection storing product information from various e-commerce platforms
   */
  products: {
    collectionName: 'products',
    description: 'Stores product information aggregated from multiple e-commerce platforms',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the product'
      },
      platform_id: {
        type: 'ObjectId',
        nullable: false,
        reference: 'platforms',
        description: 'Reference to the e-commerce platform'
      },      name: {
        type: 'String',
        nullable: false,
        indexed: true,
        description: 'Product name/title'
      },
      brand: {
        type: 'String',
        nullable: true,
        indexed: true,
        description: 'Product brand/manufacturer (text field)'
      },
      brand_id: {
        type: 'ObjectId',
        nullable: true,
        reference: 'brands',
        indexed: true,
        description: '✨ NEW: Reference to normalized brand'
      },
      category_id: {
        type: 'ObjectId',
        nullable: true,
        reference: 'categories',
        description: 'Reference to main category'
      },
      category_name: {
        type: 'String',
        nullable: true,
        description: 'Category name for quick access'
      },
      subcategory_id: {
        type: 'ObjectId',
        nullable: true,
        reference: 'categories',
        description: 'Reference to subcategory'
      },
      subcategory_name: {
        type: 'String',
        nullable: true,
        description: 'Subcategory name for quick access'
      },
      description: {
        type: 'String',
        nullable: true,
        description: 'Product description'
      },
      variants: {
        type: 'Object',
        nullable: true,
        description: 'Product variants (color, size, etc.)'
      },
      specifications: {
        type: 'Object',
        nullable: true,
        description: 'Technical specifications'
      },
      media: {
        type: 'Object',
        nullable: true,
        description: 'Product media (images, videos)',
        schema: {
          images: {
            type: 'Array',
            items: {
              url: 'String',
              type: 'String',
              alt_text: 'String'
            }
          },
          videos: {
            type: 'Array',
            items: {
              url: 'String',
              thumbnail: 'String',
              duration: 'Double'
            }
          }
        }
      },
      availability: {
        type: 'String',
        nullable: true,
        description: 'Stock availability status'
      },
      platform_name: {
        type: 'String',
        nullable: true,
        description: 'Platform name for quick access'
      },
      original_url: {
        type: 'String',
        nullable: false,
        description: 'Original product URL on platform'
      },
      price: {
        type: 'Double',
        nullable: false,
        indexed: true,
        description: 'Current price in PKR'
      },
      // Aggregated review metrics for this listing (keeps UI fast, updated by background job)
      average_rating: {
        type: 'Double',
        nullable: true,
        default: 0,
        description: 'Average rating for this listing (0-5) computed from reviews'
      },
      review_count: {
        type: 'Int',
        nullable: true,
        default: 0,
        description: 'Total number of reviews associated with this listing'
      },
      positive_percent: {
        type: 'Double',
        nullable: true,
        default: 0,
        description: 'Percentage of positive reviews (0-100) for quick quality signals'
      },
      sale_percentage: {
        type: 'Double',
        nullable: true,
        description: 'Sale discount percentage'
      },
      sale_duration_days: {
        type: 'Double',
        nullable: true,
        description: 'Sale duration in days'
      },
      sale_price: {
        type: 'Double',
        nullable: true,
        description: 'Sale price if on sale'
      },
      currency: {
        type: 'String',
        nullable: false,
        default: 'PKR',
        description: 'Currency code'
      },
      condition: {
        type: 'String',
        nullable: true,
        description: 'Product condition (new, used, refurbished)'
      },
      shipping_cost: {
        type: 'Double',
        nullable: true,
        description: 'Shipping cost in PKR'
      },
      delivery_time: {
        type: 'String',
        nullable: true,
        description: 'Estimated delivery time'
      },
      created_at: {
        type: 'Date',
        nullable: false,
        default: 'now',
        description: 'Record creation timestamp'
      },
      updated_at: {
        type: 'Date',
        nullable: false,
        default: 'now',
        description: 'Record last update timestamp'
      }
    },
    indexes: [
      { fields: ['platform_id'] },
      { fields: ['category_id'] },
      { fields: ['name'], type: 'text' },
      { fields: ['brand'] },
      { fields: ['price'] },
      { fields: ['created_at'] }
    ],
    relationships: {
      platform: {
        type: 'many-to-one',
        target: 'platforms',
        foreignKey: 'platform_id'
      },
      category: {
        type: 'many-to-one',
        target: 'categories',
        foreignKey: 'category_id'
      },
      subcategory: {
        type: 'many-to-one',
        target: 'categories',
        foreignKey: 'subcategory_id'
      },
      saleHistory: {
        type: 'one-to-many',
        target: 'sale_history',
        foreignKey: 'product_id'
      },
      reviews: {
        type: 'one-to-many',
        target: 'reviews',
        foreignKey: 'product_id'
      },
      searchHistory: {
        type: 'one-to-many',
        target: 'search_history',
        foreignKey: 'product_id'
      }
    }
  },

  /**
   * Sale History Collection
   * Tracks historical price changes and sales for products
   */
  sale_history: {
    collectionName: 'sale_history',
    description: 'Stores historical price data and sale events for products',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the sale history record'
      },
      product_id: {
        type: 'ObjectId',
        nullable: false,
        reference: 'products',
        indexed: true,
        description: 'Reference to the product'
      },
      price: {
        type: 'Double',
        nullable: false,
        description: 'Price at the time of recording'
      },
      timestamp: {
        type: 'Date',
        nullable: false,
        indexed: true,
        description: 'When the price was recorded'
      },
      event_name: {
        type: 'String',
        nullable: true,
        description: 'Sale event name (Black Friday, 11.11, etc.)'
      },
      sale_percentage: {
        type: 'Int',
        nullable: true,
        description: 'Discount percentage during sale'
      },
      sale_duration_days: {
        type: 'Int',
        nullable: true,
        description: 'Duration of the sale in days'
      }
    },
    indexes: [
      { fields: ['product_id', 'timestamp'] },
      { fields: ['timestamp'] },
      { fields: ['event_name'] }
    ],
    relationships: {
      product: {
        type: 'many-to-one',
        target: 'products',
        foreignKey: 'product_id'
      }
    }
  },

  /**
   * Users Collection
   * Stores user account information and preferences
   */
  users: {
    collectionName: 'users',
    description: 'Stores user account information, authentication, and preferences',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the user'
      },
      email: {
        type: 'String',
        nullable: false,
        unique: true,
        indexed: true,
        description: 'User email address'
      },
      phone: {
        type: 'String',
        nullable: true,
        description: 'User phone number'
      },
      password: {
        type: 'String',
        nullable: false,
        description: 'Hashed password'
      },
      name: {
        type: 'String',
        nullable: false,
        description: 'User full name'
      },
      created_at: {
        type: 'Date',
        nullable: false,
        default: 'now',
        description: 'Account creation timestamp'
      },
      last_login: {
        type: 'Date',
        nullable: true,
        description: 'Last login timestamp'
      },
      language_preference: {
        type: 'String',
        nullable: false,
        default: 'en',
        enum: ['en', 'ur', 'ps'],
        description: 'User language preference (en, ur, ps)'
      },
      preferences: {
        type: 'Object',
        nullable: true,
        description: 'User preferences',
        schema: {
          categories_of_interest: {
            type: 'Array',
            items: 'ObjectId',
            description: 'Array of category IDs user is interested in'
          },
          preferred_brands: {
            type: 'Array',
            items: 'String',
            description: 'Array of preferred brand names'
          },
          notification_preferences: {
            type: 'Object',
            schema: {
              email: { type: 'Boolean', default: true },
              push: { type: 'Boolean', default: true },
              whatsapp: { type: 'Boolean', default: false }
            }
          }
        }
      }
    },
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['created_at'] }
    ],
    relationships: {
      searchHistory: {
        type: 'one-to-many',
        target: 'search_history',
        foreignKey: 'user_id'
      },
      reviews: {
        type: 'one-to-many',
        target: 'reviews',
        foreignKey: 'user_id'
      }
    }
  },

  /**
   * Reviews Collection
   * Stores product reviews and sentiment analysis
   */
  reviews: {
    collectionName: 'reviews',
    description: 'Stores product reviews with sentiment analysis and verification',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the review'
      },
      product_id: {
        type: 'ObjectId',
        nullable: false,
        reference: 'products',
        indexed: true,
        description: 'Reference to the product'
      },
      reviewer_name: {
        type: 'String',
        nullable: false,
        description: 'Name of the reviewer'
      },
      rating: {
        type: 'Double',
        nullable: false,
        min: 0,
        max: 5,
        description: 'Rating score (0-5)'
      },
      text: {
        type: 'String',
        nullable: true,
        description: 'Review text content'
      },
      review_date: {
        type: 'Date',
        nullable: false,
        indexed: true,
        description: 'Date the review was posted'
      },
      helpful_votes: {
        type: 'Double',
        nullable: true,
        default: 0,
        description: 'Number of helpful votes'
      },
      verified_purchase: {
        type: 'Boolean',
        nullable: false,
        default: false,
        description: 'Whether the purchase is verified'
      },
      images: {
        type: 'Array',
        nullable: true,
        items: 'String',
        description: 'Array of review image URLs'
      },
      sentiment_analysis: {
        type: 'Object',
        nullable: true,
        description: 'AI-generated sentiment analysis',
        schema: {
          sentiment: {
            type: 'String',
            enum: ['positive', 'negative', 'neutral'],
            description: 'Overall sentiment'
          },
          score: {
            type: 'Double',
            min: -1,
            max: 1,
            description: 'Sentiment score (-1 to 1)'
          },
          keywords: {
            type: 'Array',
            items: 'String',
            description: 'Extracted keywords'
          },
          primary_negative_reason: {
            type: 'String',
            nullable: true,
            enum: ['delivery', 'quality', 'packaging', 'customer_service', 'price', 'other'],
            description: 'Primary categorized reason for negative sentiment (if applicable)'
          },
          is_likely_fake: {
            type: 'Boolean',
            default: false,
            description: 'AI detection for fake reviews'
          },
          needs_analysis: {
            type: 'Boolean',
            default: true,
            description: 'Whether sentiment analysis is pending'
          }
        }
      }
    },
    indexes: [
      { fields: ['product_id', 'review_date'] },
      { fields: ['rating'] },
      { fields: ['verified_purchase'] },
      { fields: ['sentiment_analysis.sentiment'] }
    ],
    relationships: {
      product: {
        type: 'many-to-one',
        target: 'products',
        foreignKey: 'product_id'
      }
    }
  },

  /**
   * Search History Collection
   * Tracks user search queries for analytics and personalization
   */
  search_history: {
    collectionName: 'search_history',
    description: 'Tracks user search queries for analytics and recommendations',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the search record'
      },
      user_id: {
        type: 'ObjectId',
        nullable: false,
        reference: 'users',
        indexed: true,
        description: 'Reference to the user'
      },
      product_id: {
        type: 'ObjectId',
        nullable: true,
        reference: 'products',
        description: 'Reference to product if clicked'
      },
      query: {
        type: 'String',
        nullable: false,
        indexed: true,
        description: 'Search query text'
      },
      filters: {
        type: 'Object',
        nullable: true,
        description: 'Applied filters',
        schema: {
          category_id: { type: 'ObjectId', nullable: true },
          category_name: { type: 'String', nullable: true },
          brand: { type: 'String', nullable: true },
          min_price: { type: 'Double', nullable: true },
          max_price: { type: 'Double', nullable: true },
          results_count: { type: 'Double', nullable: true }
        }
      },
      clicked_products: {
        type: 'Array',
        nullable: true,
        description: 'Array of product IDs clicked in results',
        items: {
          product_id: 'ObjectId',
          position: 'Double',
          timestamp: 'Date'
        }
      },
      timestamp: {
        type: 'Date',
        nullable: false,
        indexed: true,
        default: 'now',
        description: 'When the search was performed'
      }
    },
    indexes: [
      { fields: ['user_id', 'timestamp'] },
      { fields: ['query'], type: 'text' },
      { fields: ['timestamp'] }
    ],
    relationships: {
      user: {
        type: 'many-to-one',
        target: 'users',
        foreignKey: 'user_id'
      },
      product: {
        type: 'many-to-one',
        target: 'products',
        foreignKey: 'product_id'
      }
    }
  },

  /**
   * Platforms Collection
   * Stores e-commerce platform information and scraping configuration
   */
  platforms: {
    collectionName: 'platforms',
    description: 'Stores e-commerce platform information and scraping configuration',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the platform'
      },
      name: {
        type: 'String',
        nullable: false,
        unique: true,
        description: 'Platform name (Daraz, PriceOye, etc.)'
      },
      domain: {
        type: 'String',
        nullable: false,
        unique: true,
        description: 'Platform domain (daraz.pk, priceoye.pk)'
      },
      base_url: {
        type: 'String',
        nullable: false,
        description: 'Base URL for the platform'
      },
      logo_url: {
        type: 'String',
        nullable: true,
        description: 'Platform logo URL'
      },
      scraping_config: {
        type: 'Object',
        nullable: true,
        description: 'Scraping configuration',
        schema: {
          selectors: {
            type: 'Object',
            description: 'CSS/XPath selectors for scraping'
          },
          rate_limit: {
            type: 'Int',
            description: 'Rate limit for scraping (requests/minute)'
          },
          last_scraped: {
            type: 'Date',
            description: 'Last successful scrape timestamp'
          }
        }
      }
    },
    indexes: [
      { fields: ['name'], unique: true },
      { fields: ['domain'], unique: true }
    ],
    relationships: {
      products: {
        type: 'one-to-many',
        target: 'products',
        foreignKey: 'platform_id'
      }
    }
  },

  /**
   * Categories Collection
   * Hierarchical category structure for products
   */
  categories: {
    collectionName: 'categories',
    description: 'Hierarchical category structure for product organization',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the category'
      },
      name: {
        type: 'String',
        nullable: false,
        indexed: true,
        description: 'Category name'
      },
      parent_category_id: {
        type: 'ObjectId',
        nullable: true,
        reference: 'categories',
        description: 'Reference to parent category (null for root)'
      },
      level: {
        type: 'Double',
        nullable: false,
        default: 0,
        description: 'Hierarchy level (0 = root, 1 = subcategory, etc.)'
      },
      path: {
        type: 'Array',
        nullable: true,
        items: 'ObjectId',
        description: 'Array of parent category IDs for path traversal'
      },
      icon: {
        type: 'String',
        nullable: true,
        description: 'Category icon identifier or URL'
      }
    },
    indexes: [
      { fields: ['name'] },
      { fields: ['parent_category_id'] },
      { fields: ['level'] }
    ],
    relationships: {
      parent: {
        type: 'many-to-one',
        target: 'categories',
        foreignKey: 'parent_category_id'
      },
      children: {
        type: 'one-to-many',
        target: 'categories',
        foreignKey: 'parent_category_id'
      },
      products: {
        type: 'one-to-many',
        target: 'products',
        foreignKey: 'category_id'
      }
    }
  },

  /**
   * Alerts Collection (ADDITIONAL - Not in original ERD)
   * Price drop and availability alerts for users
   */
  alerts: {
    collectionName: 'alerts',
    description: 'Price drop and availability alerts configured by users',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the alert'
      },
      user_id: {
        type: 'ObjectId',
        nullable: false,
        reference: 'users',
        indexed: true,
        description: 'Reference to the user'
      },
      product_id: {
        type: 'ObjectId',
        nullable: false,
        reference: 'products',
        indexed: true,
        description: 'Reference to the product'
      },
      alert_type: {
        type: 'String',
        nullable: false,
        enum: ['price_drop', 'back_in_stock', 'sale_event'],
        description: 'Type of alert'
      },
      target_price: {
        type: 'Double',
        nullable: true,
        description: 'Target price for price drop alerts'
      },
      notification_channels: {
        type: 'Object',
        nullable: false,
        schema: {
          email: { type: 'Boolean', default: true },
          sms: { type: 'Boolean', default: false },
          push: { type: 'Boolean', default: true }
        },
        description: 'Notification delivery channels'
      },
      is_active: {
        type: 'Boolean',
        nullable: false,
        default: true,
        description: 'Whether the alert is active'
      },
      triggered_at: {
        type: 'Date',
        nullable: true,
        description: 'When the alert was last triggered'
      },
      created_at: {
        type: 'Date',
        nullable: false,
        default: 'now',
        description: 'Alert creation timestamp'
      }
    },
    indexes: [
      { fields: ['user_id', 'is_active'] },
      { fields: ['product_id'] },
      { fields: ['alert_type'] }
    ],
    relationships: {
      user: {
        type: 'many-to-one',
        target: 'users',
        foreignKey: 'user_id'
      },
      product: {
        type: 'many-to-one',
        target: 'products',
        foreignKey: 'product_id'
      }
    }
  },

  /**
   * Notifications Collection (ADDITIONAL - Not in original ERD)
   * Notification history and delivery tracking
   */
  notifications: {
    collectionName: 'notifications',
    description: 'Notification history and delivery tracking',
    fields: {
      _id: {
        type: 'ObjectId',
        primary: true,
        nullable: false,
        description: 'Unique identifier for the notification'
      },
      user_id: {
        type: 'ObjectId',
        nullable: false,
        reference: 'users',
        indexed: true,
        description: 'Reference to the user'
      },
      alert_id: {
        type: 'ObjectId',
        nullable: true,
        reference: 'alerts',
        description: 'Reference to the alert that triggered this'
      },
      type: {
        type: 'String',
        nullable: false,
        enum: ['price_drop', 'stock_available', 'sale_event', 'system'],
        description: 'Notification type'
      },
      channel: {
        type: 'String',
        nullable: false,
        enum: ['email', 'sms', 'push', 'whatsapp'],
        description: 'Delivery channel'
      },
      title: {
        type: 'String',
        nullable: false,
        description: 'Notification title'
      },
      message: {
        type: 'String',
        nullable: false,
        description: 'Notification message'
      },
      data: {
        type: 'Object',
        nullable: true,
        description: 'Additional notification data (product info, etc.)'
      },
      sent_at: {
        type: 'Date',
        nullable: false,
        indexed: true,
        default: 'now',
        description: 'When notification was sent'
      },
      delivered: {
        type: 'Boolean',
        nullable: false,
        default: false,
        description: 'Whether notification was delivered successfully'
      },
      read_at: {
        type: 'Date',
        nullable: true,
        description: 'When notification was read by user'
      }
    },
    indexes: [
      { fields: ['user_id', 'sent_at'] },
      { fields: ['alert_id'] },
      { fields: ['delivered'] }
    ],
    relationships: {
      user: {
        type: 'many-to-one',
        target: 'users',
        foreignKey: 'user_id'
      },
      alert: {
        type: 'many-to-one',
        target: 'alerts',
        foreignKey: 'alert_id'
      }
    }
  },

  // price_predictions collection removed — AI price prediction feature deprecated for now
};

/**
 * Database Statistics
 */
const DATABASE_STATS = {
  totalCollections: 11,
  coreCollections: 7, // From original ERD
  additionalCollections: 4, // alerts + notifications + brands + category_mappings
  estimatedDocuments: {
    products: '100,000+',
    sale_history: '1,000,000+',
    users: '10,000+',
    reviews: '500,000+',
    search_history: '1,000,000+',
    platforms: '5-10',
    categories: '100-500',
    alerts: '50,000+',
    notifications: '500,000+',
    brands: '1,000+',
    category_mappings: '10,000+'
  }
};

/**
 * Relationship Summary
 */
const RELATIONSHIPS = {
  oneToMany: [
    'platforms -> products',
    'categories -> products',
    'categories -> categories (parent-child)',
    'products -> sale_history',
    'products -> reviews',
    'users -> search_history',
    'users -> reviews',
    'users -> alerts',
    'users -> notifications',
    'products -> alerts',
    'alerts -> notifications',
    'brands -> products'
  ],
  manyToOne: [
    'products -> platforms',
    'products -> categories',
    'sale_history -> products',
    'reviews -> products',
    'search_history -> users',
    'search_history -> products',
    'alerts -> users',
    'alerts -> products',
    'notifications -> users',
    'category_mappings -> platforms',
    'category_mappings -> categories',
    'category_mappings -> categories (subcategory)'
  ]
};

/**
 * Export Schema
 */
module.exports = {
  ERD_SCHEMA,
  DATABASE_STATS,
  RELATIONSHIPS,
  
  /**
   * Get all collection names
   */
  getCollectionNames: () => Object.keys(ERD_SCHEMA),
  
  /**
   * Get schema for a specific collection
   */
  getCollectionSchema: (collectionName) => ERD_SCHEMA[collectionName],
  
  /**
   * Get all relationships for a collection
   */
  getCollectionRelationships: (collectionName) => {
    const collection = ERD_SCHEMA[collectionName];
    return collection ? collection.relationships : null;
  },
  
  /**
   * Generate Mongoose schema from ERD
   */
  toMongooseSchema: (collectionName) => {
    const collection = ERD_SCHEMA[collectionName];
    if (!collection) return null;
    
    const mongooseSchema = {};
    Object.entries(collection.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldName === '_id') return; // Skip _id as Mongoose handles it
      
      mongooseSchema[fieldName] = {
        type: fieldConfig.type === 'ObjectId' ? 'Schema.Types.ObjectId' : fieldConfig.type,
        required: !fieldConfig.nullable,
        unique: fieldConfig.unique || false,
        default: fieldConfig.default,
        ref: fieldConfig.reference
      };
    });
    
    return mongooseSchema;
  }
};

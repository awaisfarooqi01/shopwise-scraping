/**
 * PriceOye Scraper
 * Main scraper for PriceOye.pk website
 * 
 * Handles:
 * - Single product scraping
 * - Brand page scraping
 * - Category page scraping
 * - Data normalization
 * - Database storage
 */

const BaseScraper = require('../base-scraper');
const selectors = require('./selectors');
const config = require('../../config/scraper-config');
const { logger } = require('../../utils/logger');
const normalizationService = require('../../services/normalization-service');
const Product = require('../../models/Product');
const Review = require('../../models/Review');
const Platform = require('../../models/Platform');
const cheerio = require('cheerio');
const pRetry = require('p-retry');

// For now, disable queue functionality - will implement later
const PQueue = null;

class PriceOyeScraper extends BaseScraper {  constructor() {
    super(config);
    this.baseUrl = config.platform.baseUrl;
    this.platform = null;
    // Queue disabled for now - process sequentially
    this.queue = null;
  }

  /**
   * Initialize scraper (load platform from DB)
   */
  async initialize() {
    try {
      logger.info('🔧 Initializing PriceOye scraper...');
      
      // Load platform from database
      this.platform = await Platform.findOne({ name: 'PriceOye' });
      
      if (!this.platform) {
        throw new Error('PriceOye platform not found in database');
      }
      
      logger.info(`✅ Platform loaded: ${this.platform.name} (ID: ${this.platform._id})`);
      
      // Initialize browser
      await this.initBrowser();
      
      logger.info('✅ Scraper initialized');
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize scraper:', error);
      throw error;
    }
  }
  /**
   * Scrape a single product page
   * @param {string} url - Product URL
   * @returns {object} Product data
   */
  async scrapeProduct(url) {
    try {
      logger.info(`\n🔍 Scraping product: ${url}`);
      
      // Navigate to product page
      await this.goto(url);
      
      // Extract product data from JavaScript variable (more reliable than HTML parsing)
      const productData = await this.extractProductDataFromJS();
      
      // If JS extraction failed, fallback to HTML parsing
      if (!productData || !productData.name) {
        logger.warn('   ⚠️  JavaScript extraction failed, falling back to HTML parsing');
        const html = await this.page.content();
        const $ = cheerio.load(html);
        productData = await this.extractProductData($);
      }
      
      // Add platform and URL
      productData.platform_id = this.platform._id;
      productData.platform_name = this.platform.name;
      productData.original_url = url;
      
      // Normalize brand
      if (productData.brand) {
        logger.info(`   🏷️  Normalizing brand: ${productData.brand}`);
        const normalizedBrand = await normalizationService.normalizeBrand(productData.brand);
        
        if (normalizedBrand && normalizedBrand.brand_id) {
          productData.brand_id = normalizedBrand.brand_id;
          productData.platform_metadata = productData.platform_metadata || {};
          productData.platform_metadata.original_brand = productData.brand;
          productData.brand = normalizedBrand.canonical_name;
          
          productData.mapping_metadata = productData.mapping_metadata || {};
          productData.mapping_metadata.brand_confidence = normalizedBrand.confidence || 1.0;
          productData.mapping_metadata.brand_source = normalizedBrand.source || 'exact_match';
          
          logger.info(`   ✅ Brand normalized: ${productData.brand}`);
        }
      }
        // Map category - handle "Mobiles" → "Mobile Phones" mapping
      if (productData.category_name) {
        logger.info(`   📂 Mapping category: ${productData.category_name}`);
        
        // Normalize common category variations
        let categoryToMap = productData.category_name.trim();
        
        // Handle known mappings
        const categoryMappings = {
          'Mobiles': 'Mobile Phones',
          'Mobile': 'Mobile Phones',
          'Smartphones': 'Mobile Phones',
          'Laptops': 'Laptops',
          'Tablets': 'Tablets',
          'Watches': 'Smart Watches',
          'Smartwatches': 'Smart Watches',
          'Smart Watches': 'Smart Watches'
        };
        
        if (categoryMappings[categoryToMap]) {
          categoryToMap = categoryMappings[categoryToMap];
          logger.info(`   🔄 Category normalized: ${productData.category_name} → ${categoryToMap}`);
        }
        
        const mappedCategory = await normalizationService.mapCategory(categoryToMap);
        
        if (mappedCategory && mappedCategory.category_id) {
          productData.category_id = mappedCategory.category_id;
          productData.category_name = mappedCategory.category_name; // Use the mapped name
          productData.platform_metadata = productData.platform_metadata || {};
          productData.platform_metadata.original_category = productData.category_name;
          
          // Handle subcategory if present
          if (mappedCategory.subcategory_id) {
            productData.subcategory_id = mappedCategory.subcategory_id;
            productData.subcategory_name = mappedCategory.subcategory_name;
            productData.platform_metadata.original_subcategory = productData.subcategory_name;
          }
          
          productData.mapping_metadata = productData.mapping_metadata || {};
          productData.mapping_metadata.category_confidence = mappedCategory.confidence || 0.9;
          productData.mapping_metadata.category_source = mappedCategory.source || 'auto';
          
          logger.info(`   ✅ Category mapped: ${mappedCategory.category_name}`);
          if (mappedCategory.subcategory_name) {
            logger.info(`   ✅ Subcategory mapped: ${mappedCategory.subcategory_name}`);
          }
        }
      }
        // Validate product data
      this.validateProductData(productData);
      
      // Save to database
      const saved = await this.saveProduct(productData);
      
      this.stats.productsScraped++;
      logger.info(`✅ Product scraped successfully: ${productData.name}`);
      
      // Scrape reviews if product has reviews
      if (saved && saved._id && productData.review_count > 0) {
        logger.info(`   💬 Product has ${productData.review_count} reviews, scraping...`);
        try {
          await this.scrapeProductReviews(saved._id, url);
        } catch (reviewError) {
          logger.warn(`   ⚠️  Failed to scrape reviews: ${reviewError.message}`);
          // Don't fail the entire scrape if reviews fail
        }
      }
      
      return saved;
      
    } catch (error) {
      this.stats.errors++;
      logger.error(`❌ Failed to scrape product ${url}:`, error);
      
      if (this.config.page.screenshotOnError) {
        await this.takeScreenshot(`error-product-${Date.now()}`);
      }
      
      throw error;
    }
  }
  /**
   * Extract product data from JavaScript variable (more reliable than HTML parsing)
   * @returns {object} Product data
   */
  async extractProductDataFromJS() {
    try {
      // PriceOye stores all product data in window.product_data JavaScript variable
      const productData = await this.page.evaluate(() => {
        if (typeof window.product_data === 'undefined') {
          return null;
        }
        // Also try to extract reviews data
        const reviewsData = window.product_reviews || window.reviews || [];
        
        return {
          ...window.product_data,
          reviews: reviewsData
        };
      });

      if (!productData || !productData.dataSet) {
        logger.warn('   ⚠️  No product data found in JavaScript variable');
        return null;
      }

      const data = productData.dataSet;
      const selectedData = productData.product_config?.selectedDataprice?.[0];
      
      logger.info(`   📦 Found product data in JavaScript: ${data.title}`);

      const product = {};      // Basic Information
      product.name = data.title || data.product_title || '';
      
      // Clean HTML from description
      const rawDescription = data.product_description || '';
      product.description = this.cleanHtmlDescription(rawDescription);
      
      product.brand = data.brand_name || data.brand || '';
      product.category_name = data.category_name || data.category || '';
      
      // Subcategory (if available)
      product.subcategory_name = data.subcategory_name || data.subcategory || '';

      // Pricing
      if (selectedData) {
        const priceStr = selectedData.product_price?.replace(/,/g, '') || '0';
        product.price = parseFloat(priceStr) || 0;
        
        const retailPriceStr = selectedData.retail_price?.replace(/,/g, '') || '0';
        const retailPrice = parseFloat(retailPriceStr) || 0;
        
        if (retailPrice > product.price) {
          product.sale_price = product.price;
          product.price = retailPrice;
          product.sale_percentage = selectedData.saving_percent || 0;
          
          // Try to calculate sale duration from dates if available
          if (selectedData.sale_end_date) {
            try {
              const saleEnd = new Date(selectedData.sale_end_date);
              const now = new Date();
              const daysRemaining = Math.ceil((saleEnd - now) / (1000 * 60 * 60 * 24));
              if (daysRemaining > 0) {
                product.sale_duration_days = daysRemaining;
              }
            } catch (e) {
              // Ignore date parsing errors
            }
          }
        }
      } else {
        // Fallback to min/max price
        const minPriceStr = productData.min_price?.replace(/,/g, '') || '0';
        product.price = parseFloat(minPriceStr) || 0;
      }

      product.currency = 'PKR';

      // Reviews/Ratings
      product.average_rating = productData.average_rating || data.average_rating || 0;
      product.review_count = productData.total_rattings_count || data.total_reviews || 0;
      
      // Calculate positive percentage (assuming 4+ stars is positive)
      // Use positive_percent field (matches backend schema)
      if (product.average_rating >= 4) {
        product.positive_percent = Math.round((product.average_rating / 5) * 100);
      } else {
        product.positive_percent = 0;
      }

      // Media
      product.media = {
        images: [],
        videos: []
      };      // Extract images from color variants
      if (productData.product_color_images) {
        const colorImages = Object.values(productData.product_color_images);
        colorImages.forEach(colorData => {
          if (colorData.large) {
            colorData.large.forEach(img => {
              const fullUrl = img.startsWith('http') ? img : `https://images.priceoye.pk/${img}`;
              const imageExists = product.media.images.some(i => i.url === fullUrl);
              if (!imageExists) {
                product.media.images.push({
                  url: fullUrl,
                  type: 'product',
                  alt_text: product.name || 'Product Image'
                });
              }
            });
          }
        });
      }

      // Specifications
      product.specifications = new Map();
      if (data.specification) {
        try {
          const specs = typeof data.specification === 'string' 
            ? JSON.parse(data.specification) 
            : data.specification;
          
          for (const [category, items] of Object.entries(specs)) {
            if (Array.isArray(items)) {
              items.forEach(item => {
                for (const [key, value] of Object.entries(item)) {
                  product.specifications.set(key, value);
                }
              });
            }
          }
        } catch (e) {
          logger.warn('   ⚠️  Failed to parse specifications:', e.message);
        }
      }

      // Availability
      if (selectedData) {
        const availability = selectedData.product_availability || selectedData.availability || '';
        product.availability = this.normalizeAvailability(availability);
      } else {
        product.availability = 'unknown';
      }

      // Delivery
      if (selectedData?.product_delivery) {
        product.delivery_time = selectedData.product_delivery;
      }

      // Warranty
      if (selectedData?.product_warranty) {
        product.specifications.set('Warranty', selectedData.product_warranty);
      }

      // Variants
      product.variants = new Map();
      
      // Color variants
      if (productData.product_config?.selectedColor) {
        product.variants.set('color', productData.product_config.selectedColor);
      }
      
      // Storage variants
      if (productData.product_config?.selectedSize) {
        product.variants.set('storage', productData.product_config.selectedSize);
      }

      // Platform metadata
      product.platform_metadata = {
        product_id: data.id,
        flavor_id: productData.selectedFlavorId,
        sku: data.sku,
        category_id: data.ProductCategory_id,
        original_brand: data.brand_name,
        original_category: data.category_name,
      };

      logger.info(`   ✅ Extracted from JavaScript: ${product.name}`);
      logger.info(`   💰 Price: Rs ${product.price}`);
      logger.info(`   📋 Specs: ${product.specifications.size} items`);
      logger.info(`   🖼️  Images: ${product.media.images.length} items`);

      return product;

    } catch (error) {
      logger.error('   ❌ Failed to extract data from JavaScript:', error.message);
      return null;
    }
  }

  /**
   * Extract product data from page
   * @param {object} $ - Cheerio instance
   * @returns {object} Product data
   */
  async extractProductData($) {
    const product = {};

    try {
      // Basic Information
      product.name = await this.extractProductName($);
      product.description = await this.extractDescription($);
      
      // Pricing
      const pricing = await this.extractPricing($);
      Object.assign(product, pricing);
      
      // Brand
      product.brand = await this.extractBrand($);
      
      // Category
      product.category_name = await this.extractCategory($);
      
      // Images
      product.media = await this.extractMedia($);
      
      // Specifications
      product.specifications = await this.extractSpecifications($);
      
      // Reviews/Ratings
      const reviews = await this.extractReviews($);
      Object.assign(product, reviews);
      
      // Availability
      product.availability = await this.extractAvailability($);
      
      // Delivery
      product.delivery_time = await this.extractDeliveryTime($);
      
      // Variants
      product.variants = await this.extractVariants($);
      
      // Currency
      product.currency = 'PKR';
      
      // Active
      product.is_active = true;
      
      logger.info(`   📦 Extracted: ${product.name}`);
      logger.info(`   💰 Price: Rs ${product.price}`);
      if (product.sale_percentage) {
        logger.info(`   💸 Discount: ${product.sale_percentage}%`);
      }
      if (product.average_rating) {
        logger.info(`   ⭐ Rating: ${product.average_rating}/5 (${product.review_count} reviews)`);
      }
      
      return product;
      
    } catch (error) {
      logger.error('Failed to extract product data:', error);
      throw error;
    }
  }

  /**
   * Extract product name
   */
  async extractProductName($) {
    // Try multiple selectors
    const nameSelectors = [
      selectors.product.name,
      'h1',
      '[class*="product-title"]',
      '[class*="product-name"]',
    ];
    
    for (const selector of nameSelectors) {
      const name = $(selector).first().text().trim();
      if (name && name.length > 3 && name.length < 200) {
        return name;
      }
    }
    
    throw new Error('Product name not found');
  }

  /**
   * Extract pricing information
   */
  async extractPricing($) {
    const pricing = {};
    
    try {
      // Current price - try multiple selectors
      const priceSelectors = [
        selectors.product.price.current,
        '[class*="price-current"]',
        '[class*="selling-price"]',
        '[itemprop="price"]',
        '.price',
      ];
      
      let priceText = null;
      for (const selector of priceSelectors) {
        priceText = $(selector).first().text().trim();
        if (priceText && priceText.match(/\d/)) {
          break;
        }
      }
      
      if (priceText) {
        pricing.price = normalizationService.parsePrice(priceText);
      } else {
        throw new Error('Price not found');
      }
      
      // Original price (if on sale)
      const originalPriceSelectors = [
        selectors.product.price.original,
        '[class*="price-old"]',
        '[class*="price-original"]',
        '[class*="mrp"]',
        '.strike',
      ];
      
      for (const selector of originalPriceSelectors) {
        const originalPriceText = $(selector).first().text().trim();
        if (originalPriceText && originalPriceText.match(/\d/)) {
          const originalPrice = normalizationService.parsePrice(originalPriceText);
          if (originalPrice && originalPrice > pricing.price) {
            pricing.sale_price = pricing.price;
            pricing.price = originalPrice;
            break;
          }
        }
      }
      
      // Discount percentage
      const discountSelectors = [
        selectors.product.price.discount,
        '[class*="discount"]',
        '[class*="save"]',
        '[class*="off"]',
      ];
      
      for (const selector of discountSelectors) {
        const discountText = $(selector).first().text().trim();
        const discountMatch = discountText.match(/(\d+)%/);
        if (discountMatch) {
          pricing.sale_percentage = parseInt(discountMatch[1]);
          break;
        }
      }
      
      // Calculate discount if we have both prices
      if (!pricing.sale_percentage && pricing.sale_price && pricing.price) {
        pricing.sale_percentage = Math.round(
          ((pricing.price - pricing.sale_price) / pricing.price) * 100
        );
      }
      
    } catch (error) {
      logger.warn('Failed to extract pricing:', error.message);
    }
    
    return pricing;
  }

  /**
   * Extract brand name
   */
  async extractBrand($) {
    // Try breadcrumb first
    const breadcrumbSelectors = [
      selectors.product.breadcrumb,
      '.breadcrumb a',
      '[class*="breadcrumb"] a',
      'nav a',
    ];
    
    for (const selector of breadcrumbSelectors) {
      const links = $(selector);
      links.each((i, el) => {
        const text = $(el).text().trim();
        // Check if this looks like a brand
        if (text && text.length > 2 && text.length < 30) {
          const lowerText = text.toLowerCase();
          // Check against known brands
          const knownBrands = ['samsung', 'apple', 'xiaomi', 'vivo', 'oppo', 'infinix', 'tecno', 'realme', 'honor'];
          if (knownBrands.some(brand => lowerText.includes(brand))) {
            return text;
          }
        }
      });
    }
    
    // Try URL
    const url = this.page.url();
    const urlMatch = url.match(/\/([a-z]+)\/([a-z-]+)$/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1].charAt(0).toUpperCase() + urlMatch[1].slice(1);
    }
    
    // Try product name
    const productName = await this.extractProductName($);
    const firstWord = productName.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
      return firstWord;
    }
    
    return null;
  }

  /**
   * Extract category
   */
  async extractCategory($) {
    // Try breadcrumb
    const breadcrumb = $(selectors.product.breadcrumb).text();
    if (breadcrumb) {
      // Extract first meaningful category
      const parts = breadcrumb.split(/[>/|]/);
      for (const part of parts) {
        const clean = part.trim();
        if (clean && clean.length > 2 && clean.toLowerCase() !== 'home') {
          return clean;
        }
      }
    }
    
    // Try URL
    const url = this.page.url();
    const urlMatch = url.match(/\/([a-z-]+)\//i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return 'Mobiles'; // Default
  }

  /**
   * Extract media (images/videos)
   */
  async extractMedia($) {
    const media = {
      images: [],
      videos: [],
    };
    
    try {
      // Extract images
      const imageSelectors = [
        selectors.product.images.gallery,
        selectors.product.images.main,
        'img[src*="product"]',
        'img[alt]',
      ];
      
      const foundImages = new Set();
      
      for (const selector of imageSelectors) {
        $(selector).each((i, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src');
          const alt = $(el).attr('alt');
          
          if (src && src.startsWith('http') && !foundImages.has(src)) {
            foundImages.add(src);
            media.images.push({
              url: src,
              type: i === 0 ? 'main' : 'gallery',
              alt_text: alt || '',
            });
          }
        });
        
        if (media.images.length >= this.config.extraction.maxImages) {
          break;
        }
      }
      
      // Extract videos
      $(selectors.product.videos).each((i, el) => {
        const src = $(el).attr('src');
        if (src) {
          media.videos.push({
            url: src,
            thumbnail: '',
            duration: 0,
          });
        }
      });
      
    } catch (error) {
      logger.warn('Failed to extract media:', error.message);
    }
    
    return media;
  }

  /**
   * Extract specifications
   */
  async extractSpecifications($) {
    const specs = new Map();
    
    try {
      // Try table format first
      const table = $(selectors.product.specifications.table).first();
      
      if (table.length) {
        table.find(selectors.product.specifications.rows).each((i, row) => {
          const key = $(row).find(selectors.product.specifications.key).text().trim();
          const value = $(row).find(selectors.product.specifications.value).text().trim();
          
          if (key && value) {
            specs.set(key, value);
          }
        });
      }
      
      // Try list format
      if (specs.size === 0) {
        $(selectors.product.specifications.list).first().find(selectors.product.specifications.listItem).each((i, item) => {
          const text = $(item).text().trim();
          const parts = text.split(':');
          
          if (parts.length === 2) {
            const key = parts[0].trim();
            const value = parts[1].trim();
            if (key && value) {
              specs.set(key, value);
            }
          }
        });
      }
      
      logger.info(`   📋 Found ${specs.size} specifications`);
      
    } catch (error) {
      logger.warn('Failed to extract specifications:', error.message);
    }
    
    return specs;
  }

  /**
   * Extract reviews and ratings
   */
  async extractReviews($) {
    const reviews = {};
    
    try {
      // Rating value
      const ratingSelectors = [
        selectors.product.reviews.rating,
        '[itemprop="ratingValue"]',
        '[class*="rating-value"]',
        '.rating',
      ];
      
      for (const selector of ratingSelectors) {
        const ratingText = $(selector).first().text().trim();
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
        if (ratingMatch) {
          reviews.average_rating = parseFloat(ratingMatch[1]);
          break;
        }
      }
      
      // Review count
      const countSelectors = [
        selectors.product.reviews.count,
        '[itemprop="reviewCount"]',
        '[class*="review-count"]',
        '.reviews',
      ];
      
      for (const selector of countSelectors) {
        const countText = $(selector).first().text().trim();
        const countMatch = countText.match(/(\d+)/);
        if (countMatch) {
          reviews.review_count = parseInt(countMatch[1]);
          break;
        }
      }
      
      // Positive percentage
      const posPercentSelectors = [
        selectors.product.reviews.positivePercent,
        '[class*="positive"]',
      ];
      
      for (const selector of posPercentSelectors) {
        const percentText = $(selector).first().text().trim();
        const percentMatch = percentText.match(/(\d+)%/);
        if (percentMatch) {
          reviews.positive_percent = parseInt(percentMatch[1]);
          break;
        }
      }
      
    } catch (error) {
      logger.warn('Failed to extract reviews:', error.message);
    }
    
    return reviews;
  }

  /**
   * Extract availability status
   */
  async extractAvailability($) {
    try {
      const statusText = $(selectors.product.availability.status).first().text().trim().toLowerCase();
      
      if (statusText.includes('out of stock') || statusText.includes('unavailable')) {
        return 'out_of_stock';
      } else if (statusText.includes('limited')) {
        return 'limited';
      } else if (statusText.includes('pre-order') || statusText.includes('pre order')) {
        return 'pre_order';
      }
      
      return 'in_stock';
    } catch (error) {
      return 'in_stock'; // Default
    }
  }

  /**
   * Extract delivery time
   */
  async extractDeliveryTime($) {
    try {
      const deliverySelectors = [
        selectors.product.delivery.time,
        '[class*="delivery"]',
        '[class*="shipping"]',
      ];
      
      for (const selector of deliverySelectors) {
        const text = $(selector).first().text().trim();
        if (text && text.length > 3 && text.length < 100) {
          return text;
        }
      }
    } catch (error) {
      logger.warn('Failed to extract delivery time:', error.message);
    }
    
    return null;
  }

  /**
   * Extract product description
   */
  async extractDescription($) {
    try {
      const descSelectors = [
        selectors.product.description,
        '[class*="description"]',
        '[itemprop="description"]',
      ];
      
      for (const selector of descSelectors) {
        const desc = $(selector).first().text().trim();
        if (desc && desc.length > 50 && desc.length < 5000) {
          return desc;
        }
      }
    } catch (error) {
      logger.warn('Failed to extract description:', error.message);
    }
    
    return null;
  }

  /**
   * Extract variants (color, storage, etc.)
   */
  async extractVariants($) {
    const variants = new Map();
    
    try {
      // Color variants
      const colorContainer = $(selectors.product.variants.color.container);
      if (colorContainer.length) {
        const colors = [];
        colorContainer.find(selectors.product.variants.color.option).each((i, el) => {
          const color = $(el).attr('data-color') || $(el).attr('title') || $(el).text().trim();
          if (color && color.length > 0) {
            colors.push(color);
          }
        });
        if (colors.length > 0) {
          variants.set('color', colors);
        }
      }
      
      // Storage variants
      const storageContainer = $(selectors.product.variants.storage.container);
      if (storageContainer.length) {
        const storage = [];
        storageContainer.find(selectors.product.variants.storage.option).each((i, el) => {
          const size = $(el).attr('data-storage') || $(el).text().trim();
          if (size && size.match(/\d+GB/i)) {
            storage.push(size);
          }
        });
        if (storage.length > 0) {
          variants.set('storage', storage);
        }
      }
      
    } catch (error) {
      logger.warn('Failed to extract variants:', error.message);
    }
    
    return variants;
  }

  /**
   * Validate product data
   */
  validateProductData(product) {
    const required = this.config.validation.requiredFields;
    
    for (const field of required) {
      if (!product[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (product.price <= 0) {
      throw new Error('Invalid price: must be greater than 0');
    }
    
    if (product.name.length < 3) {
      throw new Error('Product name too short');
    }
    
    return true;
  }

  /**
   * Save product to database
   */
  async saveProduct(productData) {
    try {
      // Check for duplicates
      if (this.config.database.checkDuplicates) {
        const existing = await Product.findOne({
          platform_id: productData.platform_id,
          original_url: productData.original_url,
        });
        
        if (existing) {
          // Update existing product
          if (this.config.database.updateExisting) {
            logger.info(`   🔄 Updating existing product: ${existing._id}`);
            
            for (const field of this.config.database.updateFields) {
              if (productData[field] !== undefined) {
                existing[field] = productData[field];
              }
            }
            
            existing.updatedAt = new Date();
            await existing.save();
            
            logger.info(`   ✅ Product updated`);
            return existing;
          } else {
            logger.info(`   ⏭️  Product already exists, skipping`);
            return existing;
          }
        }
      }
      
      // Create new product
      const product = new Product(productData);
      await product.save();
      
      logger.info(`   💾 Product saved: ${product._id}`);
      return product;
      
    } catch (error) {
      logger.error('Failed to save product:', error);
      throw error;
    }
  }

  /**
   * Scrape brand page (listing)
   * @param {string} brandSlug - Brand slug (e.g., 'samsung')
   */
  async scrapeBrand(brandSlug) {
    try {
      const brandConfig = this.config.brands[brandSlug];
      
      if (!brandConfig) {
        throw new Error(`Brand not configured: ${brandSlug}`);
      }
      
      if (!brandConfig.enabled) {
        logger.warn(`Brand ${brandSlug} is disabled`);
        return [];
      }
      
      const brandUrl = `${this.baseUrl}${brandConfig.url}`;
      logger.info(`\n🏷️  Scraping brand: ${brandSlug}`);
      logger.info(`📍 URL: ${brandUrl}`);
      
      // Get all product URLs from listing
      const productUrls = await this.scrapeListingPages(brandUrl);
      
      logger.info(`\n📊 Found ${productUrls.length} products for ${brandSlug}`);
      
      // Scrape each product
      const products = [];
      
      for (let i = 0; i < productUrls.length; i++) {
        const url = productUrls[i];
        logger.info(`\n[${i + 1}/${productUrls.length}] Scraping: ${url}`);
        
        try {
          const product = await pRetry(
            () => this.scrapeProduct(url),
            {
              retries: this.config.retry.maxRetries,
              factor: this.config.retry.factor,
              minTimeout: this.config.retry.minTimeout,
              maxTimeout: this.config.retry.maxTimeout,
            }
          );
          
          products.push(product);
          
          // Random delay between products
          await this.randomDelay();
          
        } catch (error) {
          logger.error(`Failed to scrape ${url}:`, error.message);
          // Continue with next product
        }
      }
      
      logger.info(`\n✅ Brand scraping complete: ${products.length}/${productUrls.length} products scraped`);
      
      return products;
      
    } catch (error) {
      logger.error(`Failed to scrape brand ${brandSlug}:`, error);
      throw error;
    }
  }

  /**
   * Scrape listing pages (with pagination)
   * @param {string} listingUrl - Category or brand URL
   * @returns {Array} Product URLs
   */
  async scrapeListingPages(listingUrl) {
    const productUrls = [];
    let currentPage = 1;
    let hasNextPage = true;
    
    while (hasNextPage) {
      try {
        logger.info(`\n📄 Scraping page ${currentPage}...`);
        
        // Navigate to listing page
        const pageUrl = currentPage === 1 ? listingUrl : `${listingUrl}?page=${currentPage}`;
        await this.goto(pageUrl);
        
        // Extract product URLs from this page
        const urls = await this.extractProductUrlsFromPage();
        productUrls.push(...urls);
        
        logger.info(`   Found ${urls.length} products on page ${currentPage}`);
        logger.info(`   Total products so far: ${productUrls.length}`);
        
        // Check if there's a next page
        hasNextPage = await this.hasNextPage();
        
        if (hasNextPage) {
          currentPage++;
          
          // Check max pages limit
          if (this.config.pagination.maxPages && currentPage > this.config.pagination.maxPages) {
            logger.info(`   Reached max pages limit: ${this.config.pagination.maxPages}`);
            hasNextPage = false;
          }
          
          // Delay between pages
          await this.page.waitForTimeout(this.config.rateLimit.paginationDelay);
        }
        
      } catch (error) {
        logger.error(`Error scraping page ${currentPage}:`, error.message);
        hasNextPage = false;
      }
    }
    
    return productUrls;
  }

  /**
   * Extract product URLs from current listing page
   */
  async extractProductUrlsFromPage() {
    const urls = [];
    
    try {
      const html = await this.page.content();
      const $ = cheerio.load(html);
      
      // Find product links
      const linkSelectors = [
        selectors.listing.productLink,
        'a[href*="/mobiles/"]',
        '.product-card a',
        '[class*="product"] a',
      ];
      
      for (const selector of linkSelectors) {
        $(selector).each((i, el) => {
          const href = $(el).attr('href');
          if (href) {
            // Make absolute URL
            const absoluteUrl = href.startsWith('http') 
              ? href 
              : `${this.baseUrl}${href.startsWith('/') ? href : '/' + href}`;
            
            // Only add product URLs (not category/brand pages)
            if (absoluteUrl.match(/\/mobiles\/[a-z]+\/[a-z0-9-]+$/)) {
              if (!urls.includes(absoluteUrl)) {
                urls.push(absoluteUrl);
              }
            }
          }
        });
        
        if (urls.length > 0) {
          break;
        }
      }
      
    } catch (error) {
      logger.error('Failed to extract product URLs:', error);
    }
    
    return urls;
  }

  /**
   * Check if there's a next page
   */
  async hasNextPage() {
    try {
      const html = await this.page.content();
      const $ = cheerio.load(html);
      
      // Check for next button
      const nextSelectors = [
        selectors.listing.pagination.nextButton,
        '.next',
        '.next-page',
        'a[rel="next"]',
        '[class*="next"]',
      ];
      
      for (const selector of nextSelectors) {
        const nextButton = $(selector).first();
        if (nextButton.length) {
          // Check if disabled
          const isDisabled = nextButton.attr('disabled') || 
                           nextButton.hasClass('disabled') ||
                           nextButton.attr('aria-disabled') === 'true';
          
          return !isDisabled;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Scrape entire category
   * @param {string} categorySlug - Category slug (e.g., 'mobiles')
   */
  async scrapeCategory(categorySlug) {
    try {
      const categoryConfig = this.config.categories[categorySlug];
      
      if (!categoryConfig) {
        throw new Error(`Category not configured: ${categorySlug}`);
      }
      
      if (!categoryConfig.enabled) {
        logger.warn(`Category ${categorySlug} is disabled`);
        return [];
      }
      
      const categoryUrl = `${this.baseUrl}${categoryConfig.url}`;
      logger.info(`\n📂 Scraping category: ${categorySlug}`);
      logger.info(`📍 URL: ${categoryUrl}`);
      
      // Get all product URLs from listing
      const productUrls = await this.scrapeListingPages(categoryUrl);
      
      logger.info(`\n📊 Found ${productUrls.length} products in ${categorySlug}`);
      
      // Scrape products in batches
      const products = [];
      const batchSize = this.config.database.batchSize;
      
      for (let i = 0; i < productUrls.length; i += batchSize) {
        const batch = productUrls.slice(i, i + batchSize);
        logger.info(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productUrls.length / batchSize)}`);
        
        const batchProducts = await Promise.all(
          batch.map(url => 
            this.queue.add(() => 
              pRetry(
                () => this.scrapeProduct(url),
                {
                  retries: this.config.retry.maxRetries,
                  factor: this.config.retry.factor,
                }
              ).catch(error => {
                logger.error(`Failed to scrape ${url}:`, error.message);
                return null;
              })
            )
          )
        );
        
        products.push(...batchProducts.filter(p => p !== null));
        
        // Delay between batches
        if (i + batchSize < productUrls.length) {
          await this.page.waitForTimeout(this.config.rateLimit.batchDelay);
        }
      }
      
      logger.info(`\n✅ Category scraping complete: ${products.length}/${productUrls.length} products scraped`);
      
      return products;
      
    } catch (error) {
      logger.error(`Failed to scrape category ${categorySlug}:`, error.message);
      throw error;
    }
  }  /**
   * Normalize availability status
   * @param {string} status - Raw availability status
   * @returns {string} Normalized status
   */
  normalizeAvailability(status) {
    if (!status) return 'unknown';
    
    const statusLower = status.toLowerCase().trim();
    
    if (statusLower.includes('in stock') || statusLower.includes('available')) {
      return 'in_stock';
    } else if (statusLower.includes('out of stock') || statusLower.includes('not available')) {
      return 'out_of_stock';
    } else if (statusLower.includes('limited')) {
      return 'limited';
    } else if (statusLower.includes('pre-order') || statusLower.includes('preorder')) {
      return 'pre_order';
    }
    
    return 'unknown';
  }

  /**
   * Clean HTML from text and return plain text
   * @param {string} html - HTML string
   * @returns {string} Plain text
   */
  cleanHtmlDescription(html) {
    if (!html) return '';
    
    try {
      // Load HTML into cheerio
      const $ = cheerio.load(html);
      
      // Remove script and style tags
      $('script, style').remove();
      
      // Get text content
      let text = $('body').text();
      
      // If no body tag, just get all text
      if (!text || text.trim().length === 0) {
        text = $.text();
      }
      
      // Clean up whitespace
      text = text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n+/g, ' ')  // Replace newlines with space
        .trim();
      
      return text;
    } catch (error) {
      logger.warn('   ⚠️  Failed to clean HTML description:', error.message);
      // Fallback: strip basic HTML tags with regex
      return html
        .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
        .replace(/\s+/g, ' ')      // Clean whitespace
        .trim();
    }
  }  /**
   * Scrape all reviews for a product from its reviews page (with pagination via "Show More")
   * @param {string} productId - MongoDB product ID
   * @param {string} productUrl - Product URL
   * @returns {Array} Array of review objects
   */
  async scrapeProductReviews(productId, productUrl) {
    try {
      logger.info(`\n💬 Scraping reviews for product...`);
      
      // Navigate to dedicated reviews page
      const reviewsUrl = productUrl.endsWith('/') 
        ? `${productUrl}reviews` 
        : `${productUrl}/reviews`;
      
      logger.info(`   📍 Navigating to: ${reviewsUrl}`);
      await this.goto(reviewsUrl);
        // Wait for reviews container to load (Vue.js app needs time to render)
      logger.info('   ⏳ Waiting for reviews container...');
      try {
        // Wait for the specific review box to appear
        await this.page.waitForSelector('.review-box', { 
          timeout: 15000 
        });
        logger.info('   ✅ Review boxes found, waiting for complete render...');
        
        // Additional wait for Vue.js to fully render all reviews
        await this.page.waitForTimeout(3000);
        
        // Verify reviews are actually rendered
        const reviewCount = await this.page.evaluate(() => {
          return document.querySelectorAll('.review-box').length;
        });
        logger.info(`   📦 Found ${reviewCount} review boxes in DOM`);
        
      } catch (e) {
        logger.warn('   ⚠️  Review elements not found, trying to extract anyway...');
      }
      
      // Collect all reviews across multiple "Show More" clicks
      const allReviews = [];
      let clickCount = 0;
      const maxClicks = 20; // Safeguard (20 clicks × 20 reviews = 400 reviews max)
      
      while (clickCount < maxClicks) {
        // Extract reviews from current page state
        const currentReviews = await this.extractReviewsFromCurrentPage(productId);
        
        // Add new reviews that aren't duplicates
        const newReviews = currentReviews.filter(review => 
          !allReviews.some(existing => 
            existing.reviewer_name === review.reviewer_name && 
            existing.review_date.getTime() === review.review_date.getTime()
          )
        );
        
        allReviews.push(...newReviews);
        
        logger.info(`   📦 Batch ${clickCount + 1}: Found ${currentReviews.length} reviews (${newReviews.length} new, ${allReviews.length} total)`);
        
        // Check if "Show More" button exists and is clickable
        const hasMoreReviews = await this.page.evaluate(() => {
          const showMoreBtn = document.querySelector('.show-more-btn button');
          return showMoreBtn && !showMoreBtn.disabled && showMoreBtn.offsetParent !== null;
        });
        
        if (!hasMoreReviews) {
          logger.info('   ✅ No more reviews to load');
          break;
        }
        
        // Click "Show More" button
        try {
          logger.info('   🔄 Clicking "Show More" button...');
          await this.page.click('.show-more-btn button');
          
          // Wait for new reviews to load (wait for DOM changes)
          await this.page.waitForTimeout(2000);
          
          // Wait for new review boxes to appear
          await this.page.waitForFunction(
            (previousCount) => {
              const currentCount = document.querySelectorAll('.review-box').length;
              return currentCount > previousCount;
            },
            { timeout: 5000 },
            currentReviews.length
          );
          
          clickCount++;
          
        } catch (error) {
          logger.info(`   ⚠️  Could not click "Show More" or load new reviews: ${error.message}`);
          break;
        }
      }
      
      if (allReviews.length > 0) {
        logger.info(`   ✅ Total reviews scraped: ${allReviews.length}`);
        
        // Save reviews to database
        await this.saveReviews(allReviews);
      } else {
        logger.info('   ℹ️  No reviews found');
        
        // Take screenshot for debugging
        if (this.config.page.screenshotOnError) {
          await this.takeScreenshot(`no-reviews-${Date.now()}`);
        }
      }
      
      return allReviews;
      
    } catch (error) {
      logger.error('   ❌ Failed to scrape reviews:', error.message);
      return [];
    }
  }
    /**
   * Extract reviews from currently loaded page (handles dynamic content)
   * Uses actual PriceOye HTML structure
   * @param {string} productId - MongoDB product ID
   * @returns {Array} Array of review objects
   */  async extractReviewsFromCurrentPage(productId) {
    try {
      logger.info('   🔍 Extracting reviews from current page...');
      
      // Convert ObjectIds to strings for page.evaluate
      const productIdStr = productId.toString();
      const platformIdStr = this.platform._id.toString();
      const platformName = this.platform.name;      logger.info(`   🔑 Product ID: ${productIdStr}, Platform ID: ${platformIdStr}, Platform: ${platformName}`);      // Enable console messages from the page
      this.page.on('console', msg => {
        const text = msg.text();
        if (text && !text.includes('Download the React DevTools')) {
          logger.info(`   🌐 Browser console: ${text}`);
        }
      });
      
      let result;
      try {
        result = await this.page.evaluate((prodId, platId, platName) => {
        try {
          const reviewElements = [];
          
          // PriceOye specific selectors (from actual HTML)
          const reviewBoxes = document.querySelectorAll('.review-box');
          
          if (reviewBoxes.length === 0) {
            console.log('No review boxes found');
            return { success: true, reviews: [] };
          }
          
          console.log(`Found ${reviewBoxes.length} review boxes`);
          
          reviewBoxes.forEach(box => {
            try {
              // Extract reviewer name (note the typo "reivew" in PriceOye HTML)
              const nameEl = box.querySelector('.user-reivew-name h5') || 
                            box.querySelector('.user-reivew-name');
              const reviewerName = nameEl ? nameEl.textContent.trim() : 'Anonymous';
              
              // Extract rating - count filled stars (contains "stars.svg")
              const starElements = box.querySelectorAll('.rating-star img');
              let rating = 0;
              starElements.forEach(star => {
                const src = star.getAttribute('src') || '';
                if (src.includes('stars.svg') && !src.includes('lightstar.svg')) {
                  rating++;
                }
              });
              
              // Extract review text
              const textEl = box.querySelector('.user-reivew-description');
              const text = textEl ? textEl.textContent.trim() : '';
              
              // Extract date
              const dateEl = box.querySelector('.review-date');
              let reviewDate = new Date().toISOString();
              if (dateEl) {
                const dateStr = dateEl.textContent.trim();
                try {
                  const parsed = new Date(dateStr);
                  if (!isNaN(parsed.getTime())) {
                    reviewDate = parsed.toISOString();
                  }
                } catch (e) {
                  // Use current date if parsing fails
                }
              }
              
              // Check for verified purchase
              const verifiedEl = box.querySelector('.verified-user');
              const verifiedPurchase = verifiedEl !== null;
              
              // Extract review images
              const images = [];
              const imgElements = box.querySelectorAll('.review-images img');
              imgElements.forEach(img => {
                const src = img.getAttribute('src') || img.getAttribute('data-src');
                if (src) {
                  const fullUrl = src.startsWith('http') ? src : `https://images.priceoye.pk${src}`;
                  images.push(fullUrl);
                }
              });
              
              // Only add if we have a valid rating and name
              if (rating >= 1 && rating <= 5 && reviewerName && reviewerName !== 'Anonymous') {
                reviewElements.push({
                  product_id: prodId,
                  platform_id: platId,
                  platform_name: platName,
                  reviewer_name: reviewerName,
                  rating: rating,
                  text: text,
                  review_date: reviewDate,
                  helpful_votes: 0, // PriceOye doesn't show helpful votes
                  verified_purchase: verifiedPurchase,
                  images: images,
                  sentiment_analysis: {
                    needs_analysis: true
                  },
                  is_active: true
                });
              }
            } catch (err) {
              console.error('Error parsing review box:', err.message);
            }
          });
          
          return { success: true, reviews: reviewElements };
        } catch (error) {
          return { success: false, error: error.message, stack: error.stack };
        }
      }, productIdStr, platformIdStr, platformName);
      } catch (evalError) {
        logger.error(`   ❌ page.evaluate threw error: ${evalError.message}`);
        throw evalError;
      }
          const reviewElements = [];
          
          // PriceOye specific selectors (from actual HTML)
          const reviewBoxes = document.querySelectorAll('.review-box');
          
          if (reviewBoxes.length === 0) {
            console.log('No review boxes found');
            return { success: true, reviews: [] };
          }
          
          console.log(`Found ${reviewBoxes.length} review boxes`);
          
          reviewBoxes.forEach(box => {
            try {
              // Extract reviewer name (note the typo "reivew" in PriceOye HTML)
              const nameEl = box.querySelector('.user-reivew-name h5') || 
                            box.querySelector('.user-reivew-name');
              const reviewerName = nameEl ? nameEl.textContent.trim() : 'Anonymous';
              
              // Extract rating - count filled stars (contains "stars.svg")
              const starElements = box.querySelectorAll('.rating-star img');
              let rating = 0;
              starElements.forEach(star => {
                const src = star.getAttribute('src') || '';
                if (src.includes('stars.svg') && !src.includes('lightstar.svg')) {
                  rating++;
                }
              });
              
              // Extract review text
              const textEl = box.querySelector('.user-reivew-description');
              const text = textEl ? textEl.textContent.trim() : '';
              
              // Extract date
              const dateEl = box.querySelector('.review-date');
              let reviewDate = new Date().toISOString();
              if (dateEl) {
                const dateStr = dateEl.textContent.trim();
                try {
                  const parsed = new Date(dateStr);
                  if (!isNaN(parsed.getTime())) {
                    reviewDate = parsed.toISOString();
                  }
                } catch (e) {
                  // Use current date if parsing fails
                }
              }
              
              // Check for verified purchase
              const verifiedEl = box.querySelector('.verified-user');
              const verifiedPurchase = verifiedEl !== null;
              
              // Extract review images
              const images = [];
              const imgElements = box.querySelectorAll('.review-images img');
              imgElements.forEach(img => {
                const src = img.getAttribute('src') || img.getAttribute('data-src');
                if (src) {
                  const fullUrl = src.startsWith('http') ? src : `https://images.priceoye.pk${src}`;
                  images.push(fullUrl);
                }
              });
              
              // Only add if we have a valid rating and name
              if (rating >= 1 && rating <= 5 && reviewerName && reviewerName !== 'Anonymous') {
                reviewElements.push({
                  product_id: prodId,
                  platform_id: platId,
                  platform_name: platName,
                  reviewer_name: reviewerName,
                  rating: rating,
                  text: text,
                  review_date: reviewDate,
                  helpful_votes: 0, // PriceOye doesn't show helpful votes
                  verified_purchase: verifiedPurchase,
                  images: images,
                  sentiment_analysis: {
                    needs_analysis: true
                  },
                  is_active: true
                });
              }
            } catch (err) {
              console.error('Error parsing review box:', err.message);
            }
          });
            return { success: true, reviews: reviewElements };
        } catch (error) {
          return { success: false, error: error.message, stack: error.stack };
        }
      }, productIdStr, platformIdStr, platformName);
      
      logger.info(`   📦 Result received: ${typeof result}`);
      if (result) {
        logger.info(`   📦 Result.success: ${result.success}`);
        logger.info(`   📦 Result preview: ${JSON.stringify(result).substring(0, 200)}`);
      }
        // Check if evaluation failed
      if (!result || !result.success) {
        const errorMsg = result ? result.error : 'No result returned';
        logger.error(`   ❌ Page evaluate failed: ${errorMsg}`);
        throw new Error(`Page evaluate failed: ${errorMsg}`);
      }
      
      logger.info(`   ✅ Page evaluate succeeded`);
      const reviews = result.reviews;
      logger.info(`   📊 Reviews array length: ${reviews.length}`);
      
      if (reviews.length > 0) {
        logger.info(`   ✅ Extracted ${reviews.length} reviews from HTML`);
        
        // Convert review_date strings back to Date objects and platform_id to ObjectId
        const mongoose = require('mongoose');
        return reviews.map(r => ({
          ...r,
          product_id: new mongoose.Types.ObjectId(r.product_id),
          platform_id: new mongoose.Types.ObjectId(r.platform_id),
          review_date: new Date(r.review_date)
        }));
      }
        logger.info('   ℹ️  No reviews found in HTML');
      return [];
      
    } catch (error) {
      logger.error('   ⚠️  Failed to extract reviews:', error.message);
      logger.error('   📍 Error name:', error.name);
      logger.error('   📚 Stack:', error.stack);
      
      // Take screenshot for debugging
      if (this.config.page.screenshotOnError) {
        await this.takeScreenshot(`extract-reviews-error-${Date.now()}`);
      }
      
      return [];
    }
  }

  /**
   * Extract reviews from product page (when no dedicated reviews page)
   * @param {string} productId - MongoDB product ID
   * @returns {Array} Array of review objects
   */
  async extractReviewsFromProductPage(productId) {
    try {
      // Try to extract reviews from JavaScript first
      const jsReviews = await this.page.evaluate(() => {
        // Try different possible review data locations
        if (window.product_reviews) return window.product_reviews;
        if (window.reviews) return window.reviews;
        if (window.product_data && window.product_data.reviews) return window.product_data.reviews;
        return null;
      });
      
      if (jsReviews && Array.isArray(jsReviews) && jsReviews.length > 0) {
        logger.info(`   📦 Found ${jsReviews.length} reviews in JavaScript data`);
        const reviews = jsReviews.map(jsReview => this.parseJSReviewData(jsReview, productId)).filter(r => r !== null);
        return reviews;
      }
      
      // Fallback to HTML parsing
      const html = await this.page.content();
      const $ = cheerio.load(html);
      
      const reviews = [];
      
      // Try multiple possible selectors for PriceOye reviews
      const possibleSelectors = [
        '.review-item',
        '.user-review',
        '.customer-review',
        '[class*="review-item"]',
        '[class*="user-review"]',
        'article[class*="review"]',
        '.review', // Generic
      ];
      
      let reviewItems = $();
      for (const selector of possibleSelectors) {
        reviewItems = $(selector);
        if (reviewItems.length > 0) {
          logger.info(`   🎯 Using selector: ${selector} (found ${reviewItems.length} items)`);
          break;
        }
      }
      
      if (reviewItems.length === 0) {
        logger.info('   ℹ️  No reviews found on product page');
        return reviews;
      }
      
      reviewItems.each((index, element) => {
        const review = this.parseReviewElement($, $(element), productId);
        if (review) {
          reviews.push(review);
        }
      });
      
      logger.info(`   ✅ Extracted ${reviews.length} reviews from HTML`);
      return reviews;
      
    } catch (error) {
      logger.error('   ⚠️  Failed to extract reviews from product page:', error.message);
      return [];
    }
  }
  
  /**
   * Parse review data from JavaScript object
   * @param {object} jsReview - Review object from JavaScript
   * @param {string} productId - MongoDB product ID
   * @returns {object} Review object
   */
  parseJSReviewData(jsReview, productId) {
    try {
      const review = {
        product_id: productId,
        platform_id: this.platform._id,
        platform_name: this.platform.name,
        reviewer_name: jsReview.reviewer_name || jsReview.name || jsReview.user_name || 'Anonymous',
        rating: parseFloat(jsReview.rating || jsReview.score || 0),
        text: jsReview.review_text || jsReview.text || jsReview.comment || '',
        review_date: jsReview.review_date || jsReview.date || jsReview.created_at ? new Date(jsReview.review_date || jsReview.date || jsReview.created_at) : new Date(),
        helpful_votes: parseInt(jsReview.helpful_votes || jsReview.helpful || 0),
        verified_purchase: jsReview.verified_purchase || jsReview.verified || false,
        images: [],
        sentiment_analysis: {
          needs_analysis: true,
        },
        platform_metadata: {
          review_id: jsReview.id || jsReview._id,
        },
        is_active: true,
      };
        // Parse images if available
      if (jsReview.images && Array.isArray(jsReview.images)) {
        review.images = jsReview.images.map(img => 
          typeof img === 'string' ? img : (img.url || img)
        );
      }
      
      // Validate
      if (!review.rating || review.rating < 1 || review.rating > 5) {
        return null;
      }
      
      return review;
      
    } catch (error) {
      logger.warn('   ⚠️  Failed to parse JS review data:', error.message);
      return null;
    }
  }

  /**
   * Extract reviews from reviews page
   * @param {object} $ - Cheerio instance
   * @param {string} productId - MongoDB product ID
   * @returns {Array} Array of review objects
   */
  async extractReviewsFromPage($, productId) {
    const reviews = [];
    
    try {
      // Try dedicated reviews page selectors first
      let reviewItems = $(selectors.reviewsPage.reviewItem);
      
      // Fallback to product page selectors
      if (reviewItems.length === 0) {
        reviewItems = $(selectors.product.reviews.reviewItem);
      }
      
      reviewItems.each((index, element) => {
        const review = this.parseReviewElement($, $(element), productId);
        if (review) {
          reviews.push(review);
        }
      });
      
    } catch (error) {
      logger.error('   ⚠️  Failed to extract reviews:', error.message);
    }
    
    return reviews;
  }

  /**
   * Parse a single review element
   * @param {object} $ - Cheerio instance
   * @param {object} $element - Review element
   * @param {string} productId - MongoDB product ID
   * @returns {object} Review object
   */
  parseReviewElement($, $element, productId) {
    try {
      // Extract reviewer name
      const reviewerName = $element.find(selectors.reviewsPage.reviewerName).text().trim() ||
                          $element.find(selectors.product.reviews.reviewAuthor).text().trim() ||
                          'Anonymous';
      
      // Extract rating (try multiple formats)
      let rating = 0;
      const ratingElement = $element.find(selectors.reviewsPage.reviewRating).first();
      
      if (ratingElement.length) {
        // Try data attribute
        rating = parseFloat(ratingElement.attr('data-rating')) || 
                parseFloat(ratingElement.attr('data-score')) ||
                0;
        
        // Try counting stars
        if (rating === 0) {
          const stars = ratingElement.find('[class*="star"][class*="filled"], [class*="star"][class*="active"]');
          rating = stars.length || 0;
        }
        
        // Try text parsing
        if (rating === 0) {
          const ratingText = ratingElement.text().trim();
          const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
          }
        }
      }
      
      // Extract review text
      const reviewText = $element.find(selectors.reviewsPage.reviewText).text().trim() ||
                        $element.find(selectors.product.reviews.reviewText).text().trim() ||
                        '';
      
      // Extract review date
      let reviewDate = new Date();
      const dateElement = $element.find(selectors.reviewsPage.reviewDate).text().trim() ||
                         $element.find(selectors.product.reviews.reviewDate).text().trim();
      
      if (dateElement) {
        const parsedDate = new Date(dateElement);
        if (!isNaN(parsedDate.getTime())) {
          reviewDate = parsedDate;
        }
      }
      
      // Extract helpful votes
      let helpfulVotes = 0;
      const votesElement = $element.find(selectors.reviewsPage.helpfulVotes).text().trim();
      if (votesElement) {
        const votesMatch = votesElement.match(/(\d+)/);
        if (votesMatch) {
          helpfulVotes = parseInt(votesMatch[1]);
        }
      }
      
      // Check for verified purchase
      const verifiedPurchase = $element.find(selectors.reviewsPage.verifiedPurchase).length > 0;
        // Extract review images
      const images = [];
      $element.find(selectors.reviewsPage.reviewImages).each((i, img) => {
        const imgUrl = $(img).attr('src') || $(img).attr('data-src');
        if (imgUrl) {
          const fullUrl = imgUrl.startsWith('http') ? imgUrl : `https://images.priceoye.pk/${imgUrl}`;
          images.push(fullUrl);
        }
      });
      
      // Skip if no rating or name
      if (!rating || rating < 1 || rating > 5) {
        return null;
      }
      
      // Build review object
      const review = {
        product_id: productId,
        platform_id: this.platform._id,
        platform_name: this.platform.name,
        reviewer_name: reviewerName,
        rating: rating,
        text: reviewText,
        review_date: reviewDate,
        helpful_votes: helpfulVotes,
        verified_purchase: verifiedPurchase,
        images: images,
        sentiment_analysis: {
          needs_analysis: true,
        },
        is_active: true,
      };
      
      return review;
      
    } catch (error) {
      logger.warn('   ⚠️  Failed to parse review element:', error.message);
      return null;
    }
  }

  /**
   * Check if there is a next page of reviews
   * @param {object} $ - Cheerio instance
   * @returns {boolean} True if next page exists
   */
  async hasNextReviewsPage($) {
    const nextButton = $(selectors.reviewsPage.pagination.nextButton);
    return nextButton.length > 0 && !nextButton.hasClass('disabled');
  }

  /**
   * Navigate to next page of reviews
   * @param {object} $ - Cheerio instance
   */
  async goToNextReviewsPage($) {
    const nextButton = $(selectors.reviewsPage.pagination.nextButton);
    
    if (nextButton.length > 0) {
      const nextUrl = nextButton.attr('href');
      
      if (nextUrl) {
        const fullUrl = nextUrl.startsWith('http') 
          ? nextUrl 
          : `${this.baseUrl}${nextUrl}`;
        
        await this.goto(fullUrl);
      } else {
        // Click the button if no href
        await this.page.click(selectors.reviewsPage.pagination.nextButton);
      }
    }
  }

  /**
   * Save reviews to database
   * @param {Array} reviews - Array of review objects
   */
  async saveReviews(reviews) {
    try {
      logger.info(`   💾 Saving ${reviews.length} reviews to database...`);
      
      let savedCount = 0;
      let updatedCount = 0;
      
      for (const reviewData of reviews) {
        try {
          // Check if review already exists (by product_id, reviewer_name, and review_date)
          const existing = await Review.findOne({
            product_id: reviewData.product_id,
            reviewer_name: reviewData.reviewer_name,
            review_date: reviewData.review_date,
          });
          
          if (existing) {
            // Update existing review
            await Review.updateOne(
              { _id: existing._id },
              { $set: reviewData }
            );
            updatedCount++;
          } else {
            // Create new review
            await Review.create(reviewData);
            savedCount++;
          }
        } catch (error) {
          logger.warn(`   ⚠️  Failed to save review: ${error.message}`);
        }
      }
      
      logger.info(`   ✅ Reviews saved: ${savedCount} new, ${updatedCount} updated`);
      
    } catch (error) {
      logger.error('   ❌ Failed to save reviews:', error.message);
    }
  }

  /**
   * Cleanup and close
   */
  async cleanup() {
    this.logStats();
    await this.closeBrowser();
  }
}

module.exports = PriceOyeScraper;

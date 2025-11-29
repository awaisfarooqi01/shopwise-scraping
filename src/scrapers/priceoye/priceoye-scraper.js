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
const Category = require('../../models/Category');
const cheerio = require('cheerio');

// For now, disable queue functionality - will implement later
const PQueue = null;

// Unmapped category ID - set this in your .env or get from database
const UNMAPPED_CATEGORY_ID = process.env.UNMAPPED_CATEGORY_ID || null;

class PriceOyeScraper extends BaseScraper {
  constructor() {
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
      let productData = await this.extractProductDataFromJS();

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
      // Normalize brand (with auto-creation if not found)
      if (productData.brand) {
        logger.info(`   🏷️  Normalizing brand: ${productData.brand}`);
        const normalizedBrand = await normalizationService.normalizeBrand(
          productData.brand,
          this.platform._id.toString(), // platformId for logging
          true // autoLearn = true (auto-create if not found)
        );
        if (normalizedBrand && normalizedBrand.brand_id) {
          productData.brand_id = normalizedBrand.brand_id;
          productData.platform_metadata = productData.platform_metadata || {};
          productData.platform_metadata.original_brand = productData.brand;

          // Use canonical_name if available, otherwise keep original brand name
          if (normalizedBrand.canonical_name) {
            productData.brand = normalizedBrand.canonical_name;
          }
          // If canonical_name is missing, keep productData.brand as-is

          productData.mapping_metadata = productData.mapping_metadata || {};
          productData.mapping_metadata.brand_confidence = normalizedBrand.confidence || 1.0;
          productData.mapping_metadata.brand_source = normalizedBrand.source || 'exact_match';

          logger.info(`   ✅ Brand normalized: ${productData.brand} (ID: ${productData.brand_id})`);
        } else {
          // Brand normalization failed
          logger.error(`   ❌ Brand normalization failed for: ${productData.brand}`);
          logger.error(`   💡 Response: ${JSON.stringify(normalizedBrand)}`);
          // Keep original brand name but no brand_id
          productData.brand_id = null;
        }
      } // Map category using CategoryMapping collection
      if (productData.category_name) {
        logger.info(`   📂 Mapping category: ${productData.category_name}`);

        // Get platform_id as string (normalizationService expects string)
        const platformIdStr = this.platform._id.toString();

        // Use the raw category name from the platform (let backend handle normalization)
        const platformCategory = productData.category_name.trim();

        try {
          // Call mapCategory with platform_id (will lookup CategoryMapping collection)
          const mappedCategory = await normalizationService.mapCategory(
            platformIdStr,
            platformCategory,
            false // Don't auto-create, use manual mappings only
          );

          if (mappedCategory && mappedCategory.category_id) {
            // Successfully mapped via CategoryMapping collection
            productData.category_id = mappedCategory.category_id;
            productData.category_name = mappedCategory.category_name || productData.category_name;
            productData.subcategory_id = mappedCategory.subcategory_id;
            productData.subcategory_name = mappedCategory.subcategory_name || '';

            // Store original platform category for reference
            productData.platform_metadata = productData.platform_metadata || {};
            productData.platform_metadata.original_category = platformCategory;

            // Store mapping metadata
            productData.mapping_metadata = productData.mapping_metadata || {};
            productData.mapping_metadata.category_confidence = mappedCategory.confidence || 1.0;

            // Map backend source values to Product model enum values
            const sourceMapping = {
              existing_mapping: 'database_verified',
              auto_created: 'auto',
              inferred: 'fuzzy',
              manual: 'manual',
              rule: 'rule',
              no_match: 'auto',
            };
            productData.mapping_metadata.category_source =
              sourceMapping[mappedCategory.source] || 'auto';
            productData.mapping_metadata.needs_review = mappedCategory.needs_review || false;

            logger.info(
              `   ✅ Category mapped: ${mappedCategory.category_name} (${mappedCategory.category_id})`
            );
            if (mappedCategory.subcategory_id) {
              logger.info(
                `   ✅ Subcategory: ${mappedCategory.subcategory_name} (${mappedCategory.subcategory_id})`
              );
            }
          } else {
            // No mapping found - AUTO-CREATE under "Unmapped" parent
            logger.warn(`   ⚠️  No CategoryMapping found for "${platformCategory}"`);

            // Check if UNMAPPED_CATEGORY_ID is configured
            if (!UNMAPPED_CATEGORY_ID) {
              logger.error(`   ❌ UNMAPPED_CATEGORY_ID not configured in .env`);
              logger.warn(`   💡 Run: node scripts/create-unmapped-category.js in backend`);

              // Fallback to null
              productData.category_id = null;
              productData.subcategory_id = null;
              productData.platform_metadata = productData.platform_metadata || {};
              productData.platform_metadata.original_category = platformCategory;
              productData.platform_metadata.category_mapping_missing = true;
            } else {
              // Find or auto-create category under "Unmapped Products"
              logger.info(`   🔍 Searching for auto-created category under "Unmapped"...`);

              const result = await this.findOrAutoCreateCategory(
                platformCategory,
                UNMAPPED_CATEGORY_ID
              );
              if (result && result.category) {
                const { category, isUnmapped } = result;

                // Should always be unmapped since we're explicitly creating under "Unmapped Products"
                if (
                  isUnmapped ||
                  category.parent_category_id?.toString() === UNMAPPED_CATEGORY_ID
                ) {
                  // Properly structured: "Unmapped Products" (parent) → "Smart Watches" (child)
                  productData.category_id = UNMAPPED_CATEGORY_ID;
                  productData.subcategory_id = category._id;
                  productData.category_name = 'Unmapped Products';
                  productData.subcategory_name = category.name;

                  // Store mapping metadata
                  productData.mapping_metadata = productData.mapping_metadata || {};
                  productData.mapping_metadata.category_confidence = 0.5;
                  productData.mapping_metadata.category_source = 'auto';
                  productData.mapping_metadata.needs_review = true;

                  // Store platform metadata
                  productData.platform_metadata = productData.platform_metadata || {};
                  productData.platform_metadata.original_category = platformCategory;
                  productData.platform_metadata.auto_created_category = true;

                  logger.info(`   ✅ Using unmapped category: ${category.name} (${category._id})`);
                  logger.info(`   ⚠️  Admin review required for proper category mapping`);
                } else {
                  // Found legitimate category - use it directly!
                  productData.category_id = category.parent_category_id || category._id;
                  productData.subcategory_id = category.parent_category_id ? category._id : null;
                  productData.category_name = category.parent_category_id
                    ? (await Category.findById(category.parent_category_id))?.name || category.name
                    : category.name;
                  productData.subcategory_name = category.parent_category_id ? category.name : null;
                  // Store mapping metadata
                  productData.mapping_metadata = productData.mapping_metadata || {};
                  productData.mapping_metadata.category_confidence = 0.8; // Higher confidence for DB match
                  productData.mapping_metadata.category_source = 'database_verified';
                  productData.mapping_metadata.needs_review = false; // No review needed

                  // Store platform metadata
                  productData.platform_metadata = productData.platform_metadata || {};
                  productData.platform_metadata.original_category = platformCategory;
                  productData.platform_metadata.matched_existing_category = true;

                  logger.info(
                    `   ✅ Matched existing category: ${category.name} (${category._id})`
                  );
                  logger.info(`   💡 No admin review needed - using legitimate category`);
                }
              } else {
                // Auto-creation failed - fallback to null
                logger.error(`   ❌ Failed to find or create category`);
                productData.category_id = null;
                productData.subcategory_id = null;
                productData.platform_metadata = productData.platform_metadata || {};
                productData.platform_metadata.original_category = platformCategory;
                productData.platform_metadata.category_creation_failed = true;
              }
            }
          }
        } catch (categoryError) {
          // Category mapping failed - log error but continue
          logger.error(
            `   ❌ Category mapping error for "${platformCategory}":`,
            categoryError.message
          );
          logger.warn(`   ⚠️  Continuing without category mapping...`);

          // Keep original category name but no IDs
          productData.category_id = null;
          productData.subcategory_id = null;

          // Store error in metadata
          productData.platform_metadata = productData.platform_metadata || {};
          productData.platform_metadata.original_category = platformCategory;
          productData.platform_metadata.category_mapping_error = categoryError.message;
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
          reviews: reviewsData,
        };
      });

      if (!productData || !productData.dataSet) {
        logger.warn('   ⚠️  No product data found in JavaScript variable');
        return null;
      }

      const data = productData.dataSet;
      const selectedData = productData.product_config?.selectedDataprice?.[0];

      logger.info(`   📦 Found product data in JavaScript: ${data.title}`);

      const product = {}; // Basic Information
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

      product.currency = 'PKR'; // Reviews/Ratings
      product.average_rating = productData.average_rating || data.average_rating || 0;
      product.review_count = productData.total_rattings_count || data.total_reviews || 0;

      // Set positive_percent to -1 (not yet analyzed) since sentiment analysis hasn't been performed
      // Once reviews are analyzed, a background job will update this field with actual percentage
      product.positive_percent = -1; // Media
      product.media = {
        images: [],
        videos: [],
      };

      // Extract images from color variants
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
                  alt_text: product.name || 'Product Image',
                });
              }
            });
          }
        });
      }

      // Extract videos from page
      try {
        const videos = await this.page.evaluate(() => {
          const videoElements = document.querySelectorAll('video source[src]');
          const foundVideos = [];

          videoElements.forEach(source => {
            const videoUrl = source.getAttribute('src');
            if (videoUrl) {
              // Get thumbnail from video element's poster or nearby image
              const videoEl = source.closest('video');
              const thumbnail = videoEl?.getAttribute('poster') || '';

              foundVideos.push({
                url: videoUrl.startsWith('http')
                  ? videoUrl
                  : `https://images.priceoye.pk${videoUrl}`,
                thumbnail: thumbnail.startsWith('http')
                  ? thumbnail
                  : thumbnail
                    ? `https://images.priceoye.pk${thumbnail}`
                    : '',
                duration: 0, // Duration not available from static HTML
              });
            }
          });

          return foundVideos;
        });

        if (videos.length > 0) {
          product.media.videos = videos;
          logger.info(`   🎥 Videos: ${videos.length} items`);
        }
      } catch (videoError) {
        logger.warn('   ⚠️  Failed to extract videos:', videoError.message);
      }

      // Specifications
      product.specifications = new Map();
      if (data.specification) {
        try {
          const specs =
            typeof data.specification === 'string'
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
      } // Availability
      if (selectedData) {
        const availability = selectedData.product_availability || selectedData.availability || '';
        product.availability = this.normalizeAvailability(availability);
      } else {
        // No selectedData - could be discontinued or out of stock
        // Check for discontinued badge/flag in the page
        const isDiscontinued = await this.page.evaluate(() => {
          // Check for discontinued badge/flag
          const discontinuedBadge =
            document.querySelector('[class*="discontinued"]') ||
            document.querySelector('[alt*="discontinued" i]') ||
            document.querySelector('[title*="discontinued" i]');

          if (discontinuedBadge) {
            return true;
          }

          // Check if any text on page mentions discontinued
          const bodyText = document.body.innerText.toLowerCase();
          return bodyText.includes('discontinued') || bodyText.includes('no longer available');
        });

        // Discontinued products are permanently out of stock
        product.availability = 'out_of_stock';

        // Store discontinued status in metadata
        product.platform_metadata = product.platform_metadata || {};
        product.platform_metadata.discontinued = isDiscontinued;

        if (isDiscontinued) {
          logger.info('   ⚠️  Product is DISCONTINUED');
        }
      }

      // Delivery
      if (selectedData?.product_delivery) {
        product.delivery_time = selectedData.product_delivery;
      }

      // Warranty
      if (selectedData?.product_warranty) {
        product.specifications.set('Warranty', selectedData.product_warranty);
      } // Variants - Extract ALL available variants from page (not just selected ones)
      product.variants = new Map();

      try {
        const allVariants = await this.page.evaluate(() => {
          const variants = { colors: [], storage: [] };

          // Extract all color variants
          const colorElements = document.querySelectorAll('.colors li .color-name span');
          colorElements.forEach(el => {
            const colorName = el.textContent.trim();
            if (colorName) {
              variants.colors.push(colorName);
            }
          });

          // Extract all storage variants
          const storageElements = document.querySelectorAll('.sizes li span:not(.sold-out-tag)');
          storageElements.forEach(el => {
            const storageName = el.textContent.trim();
            // Filter out empty strings and non-storage text
            if (storageName && storageName.match(/GB|RAM/i)) {
              variants.storage.push(storageName);
            }
          });

          return variants;
        });

        // Set variants in product data
        if (allVariants.colors.length > 0) {
          product.variants.set('color', allVariants.colors);
          logger.info(`   🎨 Colors: ${allVariants.colors.join(', ')}`);
        }

        if (allVariants.storage.length > 0) {
          product.variants.set('storage', allVariants.storage);
          logger.info(`   💾 Storage: ${allVariants.storage.join(', ')}`);
        }
      } catch (variantError) {
        logger.warn('   ⚠️  Failed to extract variants from page:', variantError.message);

        // Fallback to JavaScript data (selected variants only)
        if (productData.product_config?.selectedColor) {
          product.variants.set('color', [productData.product_config.selectedColor]);
        }

        if (productData.product_config?.selectedSize) {
          product.variants.set('storage', [productData.product_config.selectedSize]);
        }
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
      // Check for "PAGE NOT FOUND" error
      const pageNotFound = $('h1.text-primary').text().trim().toUpperCase();
      if (pageNotFound === 'PAGE NOT FOUND') {
        logger.warn('   ⚠️  Page not found (404 error)');
        throw new Error('Product page not found (404)');
      }

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
          const knownBrands = [
            'samsung',
            'apple',
            'xiaomi',
            'vivo',
            'oppo',
            'infinix',
            'tecno',
            'realme',
            'honor',
          ];
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
        $(selectors.product.specifications.list)
          .first()
          .find(selectors.product.specifications.listItem)
          .each((i, item) => {
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
      const statusText = $(selectors.product.availability.status)
        .first()
        .text()
        .trim()
        .toLowerCase();

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
   * Find or auto-create category for unmapped products
   * LOGIC:
   * 1. First check if a legitimate category exists with this name in the database
   * 2. If yes: Return that legitimate category (don't create under "Unmapped")
   * 3. If no: Create subcategory under "Unmapped Products" parent
   *
   * @param {string} categoryName - Original category name from platform
   * @param {string} unmappedParentId - Parent category ID (Unmapped Products)
   * @returns {Promise<object>} Category object with structure: { category, isUnmapped }
   */
  async findOrAutoCreateCategory(categoryName, unmappedParentId) {
    try {
      logger.info(`   🔍 Searching for category: ${categoryName}`);

      // STEP 1: Check if we already created this category under "Unmapped Products"
      // This ensures we don't create duplicates
      const existingUnmapped = await Category.findOne({
        name: { $regex: new RegExp(`^${categoryName}$`, 'i') }, // Case-insensitive
        parent_category_id: unmappedParentId,
      });

      if (existingUnmapped) {
        logger.info(
          `   ✅ Found existing auto-created category under "Unmapped": ${existingUnmapped._id}`
        );
        return { category: existingUnmapped, isUnmapped: true };
      }

      // STEP 2: Create new subcategory under "Unmapped Products"
      // This happens when no CategoryMapping exists for this platform category
      logger.info(`   🔧 Creating new category under "Unmapped Products"...`);
      const newCategory = await Category.create({
        name: categoryName,
        parent_category_id: unmappedParentId,
        level: 1, // Subcategory
        path: [unmappedParentId], // Path to parent
        icon: '📦',
        description: `Auto-created from ${this.platform.name}: ${categoryName}`,
        is_active: true,
        metadata: {
          source_platform: this.platform.name,
          source_platform_id: this.platform._id.toString(),
          original_name: categoryName,
          auto_created: true,
          created_at: new Date(),
          needs_admin_review: true,
        },
      });

      logger.info(`   ✅ Auto-created category: ${newCategory._id}`);
      return { category: newCategory, isUnmapped: true };
    } catch (error) {
      logger.error(`   ❌ Failed to find/create category: ${error.message}`);
      return null;
    }
  }

  /**
   * Scrape brand page (listing)
   * @param {string} brandSlug - Brand slug (e.g., 'samsung') or full URL
   * @param {string} categorySlug - Category slug (e.g., 'mobiles', 'smart-watches', 'tablets') - defaults to 'mobiles'
   * @returns {Array} Array of scraped products
   */
  async scrapeBrand(brandSlug, categorySlug = 'mobiles') {
    try {
      // Check if brandSlug is actually a full URL
      if (brandSlug.startsWith('http://') || brandSlug.startsWith('https://')) {
        return await this.scrapeBrandByUrl(brandSlug);
      }

      const brandConfig = this.config.brands[brandSlug];

      if (!brandConfig) {
        // If not configured, try to construct URL directly with category
        logger.warn(`Brand ${brandSlug} not configured, attempting direct URL construction...`);
        const brandUrl = `${this.baseUrl}/${categorySlug}/${brandSlug}`;
        logger.info(`   🔗 Constructed URL: ${brandUrl}`);
        return await this.scrapeBrandByUrl(brandUrl, brandSlug);
      }

      if (!brandConfig.enabled) {
        logger.warn(`Brand ${brandSlug} is disabled`);
        return [];
      }

      const brandUrl = `${this.baseUrl}${brandConfig.url}`;
      return await this.scrapeBrandByUrl(brandUrl, brandSlug);
    } catch (error) {
      logger.error(`Failed to scrape brand ${brandSlug}:`, error);
      throw error;
    }
  }

  /**
   * Scrape brand page by direct URL
   * @param {string} brandUrl - Full brand URL (e.g., 'https://priceoye.pk/mobiles/nothing')
   * @param {string} brandName - Optional brand name for logging
   * @returns {Array} Array of scraped products
   */
  async scrapeBrandByUrl(brandUrl, brandName = null) {
    try {
      // Extract brand name from URL if not provided
      if (!brandName) {
        const match = brandUrl.match(/\/mobiles\/([a-z-]+)/i);
        brandName = match ? match[1] : 'unknown';
      }

      logger.info(`\n🏷️  Scraping brand: ${brandName}`);
      logger.info(`📍 URL: ${brandUrl}`);

      // Get all product URLs from listing
      const productUrls = await this.scrapeListingPages(brandUrl);

      logger.info(`\n📊 Found ${productUrls.length} products for ${brandName}`);

      // Scrape each product
      const products = [];
      for (let i = 0; i < productUrls.length; i++) {
        const url = productUrls[i];
        logger.info(`\n[${i + 1}/${productUrls.length}] Scraping: ${url}`);

        try {
          const product = await this.scrapeProduct(url);

          if (product) {
            products.push(product);
          }

          // Random delay between products
          await this.randomDelay();
        } catch (error) {
          logger.error(`Failed to scrape ${url}: ${error.message}`);
          // Continue with next product
        }
      }

      logger.info(
        `\n✅ Brand scraping complete: ${products.length}/${productUrls.length} products scraped`
      );

      return products;
    } catch (error) {
      logger.error(`Failed to scrape brand URL ${brandUrl}:`, error);
      throw error;
    }
  } /**
   * Scrape listing pages (with infinite scroll support)
   * @param {string} listingUrl - Category or brand URL
   * @returns {Array} Product URLs
   */
  async scrapeListingPages(listingUrl) {
    try {
      logger.info(`\n📄 Scraping listing page with infinite scroll...`);

      // Navigate to listing page
      await this.goto(listingUrl);

      // Wait for initial products to load
      await this.page.waitForTimeout(3000);

      // Scroll down to load all products (infinite scroll)
      logger.info(`   🔄 Scrolling to load all products...`);

      let previousProductCount = 0;
      let unchangedCount = 0;
      const maxUnchangedAttempts = 5; // Increased from 3 to 5
      let scrollAttempts = 0;
      const maxScrollAttempts = 50; // Maximum number of scroll attempts to prevent infinite loops

      while (unchangedCount < maxUnchangedAttempts && scrollAttempts < maxScrollAttempts) {
        scrollAttempts++;

        // Get current actual product count (only count product links, not pricelist/category links)
        const currentProductCount = await this.page.evaluate(() => {
          const allLinks = document.querySelectorAll('a[href*="/mobiles/"]');
          let productCount = 0;

          allLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
              // Only count actual product URLs (brand/product pattern), exclude pricelist
              if (
                href.match(/\/mobiles\/[a-z0-9-]+\/[a-z0-9-_]+$/i) &&
                !href.includes('/pricelist/')
              ) {
                productCount++;
              }
            }
          });

          return productCount;
        });

        logger.info(`   📦 Scroll ${scrollAttempts}: ${currentProductCount} products found`);

        // Check if new products were loaded
        if (currentProductCount === previousProductCount) {
          unchangedCount++;
          logger.info(`   ⏸️  No new products loaded (${unchangedCount}/${maxUnchangedAttempts})`);
        } else {
          unchangedCount = 0; // Reset counter when new products are found
          previousProductCount = currentProductCount;
        }

        // Scroll to bottom in multiple steps for better loading
        await this.page.evaluate(() => {
          // Scroll in smaller increments to trigger lazy loading
          const scrollStep = document.body.scrollHeight / 3;
          window.scrollBy(0, scrollStep);
        });

        // Wait a bit for new products to load
        await this.page.waitForTimeout(1500);

        // Scroll to absolute bottom
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for new products to load
        await this.page.waitForTimeout(2000);
      }

      if (scrollAttempts >= maxScrollAttempts) {
        logger.warn(`   ⚠️  Reached maximum scroll attempts (${maxScrollAttempts})`);
      }

      logger.info(`   ✅ Scrolling complete after ${scrollAttempts} attempts`);

      // Extract all product URLs
      const productUrls = await this.extractProductUrlsFromPage();
      logger.info(`   📊 Total unique products found: ${productUrls.length}`);

      return productUrls;
    } catch (error) {
      logger.error(`Error scraping listing page:`, error.message);
      return [];
    }
  }
  /**
   * Extract product URLs from current listing page
   */
  async extractProductUrlsFromPage() {
    const urls = [];

    try {
      const html = await this.page.content();
      const $ = cheerio.load(html);

      // Dynamically detect category from current URL
      const currentUrl = await this.page.url();
      const categoryMatch = currentUrl.match(
        /\/(mobiles|smart-watches|tablets|headphones|smart-watches|accessories|power-banks)\/[a-z0-9-]+/i
      );
      const category = categoryMatch ? categoryMatch[1] : 'mobiles';

      logger.debug(`   🔍 Detected category: ${category}`);

      // Find product links - check for detected category + generic patterns
      const linkSelectors = [
        selectors.listing.productLink,
        `a[href*="/${category}/"]`,
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

            // Only add product URLs (not category/brand/pricelist pages)
            // Pattern: /CATEGORY/BRAND/PRODUCT-NAME (case insensitive, allows numbers, hyphens, underscores)
            // EXCLUDE: /pricelist/* (those are listing pages, not products)
            // Match any category: mobiles, smart-watches, tablets, etc.
            if (
              absoluteUrl.match(
                /\/(mobiles|smart-watches|tablets|headphones|accessories|power-banks)\/[a-z0-9-]+\/[a-z0-9-_]+$/i
              ) &&
              !absoluteUrl.includes('/pricelist/')
            ) {
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
          const isDisabled =
            nextButton.attr('disabled') ||
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
        logger.info(
          `\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productUrls.length / batchSize)}`
        );

        const batchProducts = await Promise.all(
          batch.map(url =>
            this.queue.add(() =>
              pRetry(() => this.scrapeProduct(url), {
                retries: this.config.retry.maxRetries,
                factor: this.config.retry.factor,
              }).catch(error => {
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

      logger.info(
        `\n✅ Category scraping complete: ${products.length}/${productUrls.length} products scraped`
      );

      return products;
    } catch (error) {
      logger.error(`Failed to scrape category ${categorySlug}:`, error.message);
      throw error;
    }
  } /**
   * Normalize availability status
   * @param {string} status - Raw availability status
   * @returns {string} Normalized status
   */
  normalizeAvailability(status) {
    if (!status) return 'out_of_stock'; // Default to out_of_stock if no status provided

    const statusLower = status.toLowerCase().trim();

    if (statusLower.includes('in stock') || statusLower.includes('available')) {
      return 'in_stock';
    } else if (
      statusLower.includes('out of stock') ||
      statusLower.includes('not available') ||
      statusLower.includes('discontinued')
    ) {
      return 'out_of_stock';
    } else if (statusLower.includes('limited')) {
      return 'limited';
    } else if (statusLower.includes('pre-order') || statusLower.includes('preorder')) {
      return 'pre_order';
    }

    // Default to out_of_stock for any unknown status
    return 'out_of_stock';
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
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, ' ') // Replace newlines with space
        .trim();

      return text;
    } catch (error) {
      logger.warn('   ⚠️  Failed to clean HTML description:', error.message);
      // Fallback: strip basic HTML tags with regex
      return html
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Clean whitespace
        .trim();
    }
  } /**
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
          timeout: 15000,
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

      console.log('\n🔄 Starting review pagination loop...');

      while (clickCount < maxClicks) {
        // Extract reviews from current page state
        const currentReviews = await this.extractReviewsFromCurrentPage(productId);

        // Add new reviews that aren't duplicates
        const newReviews = currentReviews.filter(
          review =>
            !allReviews.some(
              existing =>
                existing.reviewer_name === review.reviewer_name &&
                existing.review_date.getTime() === review.review_date.getTime()
            )
        );

        allReviews.push(...newReviews);

        console.log(`\n📦 Batch ${clickCount + 1}:`);
        console.log(`   - Found ${currentReviews.length} reviews on page`);
        console.log(`   - New unique reviews: ${newReviews.length}`);
        console.log(`   - Total collected: ${allReviews.length}`);
        logger.info(
          `   📦 Batch ${clickCount + 1}: Found ${currentReviews.length} reviews (${newReviews.length} new, ${allReviews.length} total)`
        );

        // Check if "Show More" button exists and is clickable
        const buttonInfo = await this.page.evaluate(() => {
          const showMoreBtn = document.querySelector('.show-more-btn button');
          if (!showMoreBtn) {
            return { exists: false, reason: 'Button not found in DOM' };
          }
          const isVisible = showMoreBtn.offsetParent !== null;
          const isDisabled = showMoreBtn.disabled;
          const buttonText = showMoreBtn.textContent.trim();

          return {
            exists: true,
            visible: isVisible,
            disabled: isDisabled,
            text: buttonText,
            clickable: isVisible && !isDisabled,
          };
        });

        console.log(`\n🔘 Show More Button Status:`);
        console.log(`   - Exists: ${buttonInfo.exists}`);
        if (buttonInfo.exists) {
          console.log(`   - Text: "${buttonInfo.text}"`);
          console.log(`   - Visible: ${buttonInfo.visible}`);
          console.log(`   - Disabled: ${buttonInfo.disabled}`);
          console.log(`   - Clickable: ${buttonInfo.clickable}`);
        } else {
          console.log(`   - Reason: ${buttonInfo.reason}`);
        }

        if (!buttonInfo.clickable) {
          console.log('\n✅ No more reviews to load - stopping pagination');
          logger.info('   ✅ No more reviews to load');
          break;
        }
        // Click "Show More" button
        try {
          console.log('\n🖱️  Clicking "Show More" button...');
          logger.info('   🔄 Clicking "Show More" button...');
          const previousReviewBoxCount = await this.page.evaluate(() => {
            return document.querySelectorAll('.review-box').length;
          });

          // Click the button
          await this.page.click('.show-more-btn button');

          // Wait for loader to appear
          console.log('   ⏳ Waiting for loader to appear...');
          await this.page.waitForTimeout(500);

          // Wait for loader to show (class changes from 'hide' to visible)
          try {
            await this.page.waitForFunction(
              () => {
                const loader = document.querySelector('#commonLoader');
                // Loader is active when it doesn't have 'hide' class
                return loader && !loader.classList.contains('hide');
              },
              { timeout: 3000 }
            );
            console.log('   ✅ Loader appeared (loading state)');
          } catch (e) {
            console.log("   ℹ️  Loader didn't appear or already finished");
          }

          // Wait for loader to hide again (reviews loaded)
          console.log('   ⏳ Waiting for loader to disappear...');
          try {
            await this.page.waitForFunction(
              () => {
                const loader = document.querySelector('#commonLoader');
                // Loader is hidden when it has 'hide' class or doesn't exist
                return (
                  !loader || loader.classList.contains('hide') || loader.style.display === 'none'
                );
              },
              { timeout: 30000 } // Increased to 30 seconds for slow connections
            );
            console.log('   ✅ Loader disappeared (reviews loaded)');
          } catch (e) {
            console.log('   ⚠️  Loader timeout - continuing anyway');
          }

          // Small delay to ensure DOM is updated
          await this.page.waitForTimeout(1000);

          // Check if reviews were added
          const newCount = await this.page.evaluate(() => {
            return document.querySelectorAll('.review-box').length;
          });

          console.log('   ⏳ Checking DOM update...');
          if (newCount > previousReviewBoxCount) {
            console.log(`   ✅ DOM updated: ${previousReviewBoxCount} → ${newCount} review boxes`);
            clickCount++;
          } else {
            console.log(`   ⚠️  No new reviews loaded (still ${newCount}), stopping pagination`);
            break;
          }
        } catch (error) {
          console.log(`\n⚠️  Failed to load more reviews: ${error.message}`);
          logger.info(`   ⚠️  Could not click "Show More" or load new reviews: ${error.message}`);
          break;
        }
      }
      if (allReviews.length > 0) {
        console.log(`\n✅ Review scraping complete!`);
        console.log(`   📊 Total reviews scraped: ${allReviews.length}`);
        console.log(`   💾 Saving to database...`);
        logger.info(`   ✅ Total reviews scraped: ${allReviews.length}`);

        // Save reviews to database
        await this.saveReviews(allReviews);

        // Update product's review_count with actual scraped count
        await Product.findByIdAndUpdate(productId, {
          review_count: allReviews.length,
        });
        logger.info(`   📊 Updated product review_count to ${allReviews.length}`);

        console.log(`   ✅ Reviews saved successfully!`);
      } else {
        console.log('\n⚠️  No reviews found on this page');
        logger.info('   ℹ️  No reviews found');

        // Update product review_count to 0 if no reviews found
        await Product.findByIdAndUpdate(productId, {
          review_count: 0,
        });

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
   */
  async extractReviewsFromCurrentPage(productId) {
    try {
      logger.info('   🔍 Extracting reviews from current page...');

      // Convert ObjectIds to strings for page.evaluate
      const productIdStr = productId.toString();
      const platformIdStr = this.platform._id.toString();
      const platformName = this.platform.name;

      logger.info(
        `   🔑 IDs: product=${productIdStr.substring(0, 8)}..., platform=${platformIdStr.substring(0, 8)}...`
      );
      // Extract reviews using simplified object structure to avoid serialization issues
      let reviews;
      try {
        reviews = await this.page.evaluate(
          ({ prodId, platId, platName }) => {
            const reviewElements = [];
            const reviewBoxes = document.querySelectorAll('.review-box');

            console.log(`Found ${reviewBoxes.length} review boxes`);

            if (reviewBoxes.length === 0) {
              return [];
            }

            reviewBoxes.forEach(box => {
              try {
                // Extract reviewer name
                const nameEl =
                  box.querySelector('.user-reivew-name h5') ||
                  box.querySelector('.user-reivew-name');
                const reviewerName = nameEl ? nameEl.textContent.trim() : 'Anonymous';

                // Extract rating - count filled stars
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
                    const fullUrl = src.startsWith('http')
                      ? src
                      : `https://images.priceoye.pk${src}`;
                    images.push(fullUrl);
                  }
                });
                console.log(`Review: ${reviewerName}, rating: ${rating}`);

                // Only add if we have a valid rating
                // Allow anonymous reviews (common for discontinued products)
                if (rating >= 1 && rating <= 5) {
                  reviewElements.push({
                    product_id_str: prodId,
                    platform_id_str: platId,
                    platform_name: platName,
                    reviewer_name: reviewerName || 'Anonymous',
                    rating: rating,
                    text: text,
                    review_date: reviewDate,
                    helpful_votes: 0,
                    verified_purchase: verifiedPurchase,
                    images: images,
                    is_active: true,
                  });
                } else {
                  console.log(`Skipped: ${reviewerName} (rating: ${rating})`);
                }
              } catch (err) {
                console.error('Error parsing review box:', err.message);
              }
            });

            console.log(`Returning ${reviewElements.length} reviews`);
            return reviewElements;
          },
          { prodId: productIdStr, platId: platformIdStr, platName: platformName }
        );

        logger.info(`   📥 Received ${reviews ? reviews.length : 0} reviews from page.evaluate`);
      } catch (evalError) {
        logger.error(`   ❌ page.evaluate failed: ${evalError.message}`);
        logger.error(`   Stack: ${evalError.stack}`);
        return [];
      }

      if (reviews && reviews.length > 0) {
        logger.info(`   ✅ Extracted ${reviews.length} reviews from HTML`);

        // Convert strings back to proper types OUTSIDE the page.evaluate
        const mongoose = require('mongoose');
        return reviews.map(r => ({
          product_id: new mongoose.Types.ObjectId(r.product_id_str),
          platform_id: new mongoose.Types.ObjectId(r.platform_id_str),
          platform_name: r.platform_name,
          reviewer_name: r.reviewer_name,
          rating: r.rating,
          text: r.text,
          review_date: new Date(r.review_date),
          helpful_votes: r.helpful_votes,
          verified_purchase: r.verified_purchase,
          images: r.images,
          sentiment_analysis: {
            needs_analysis: true,
          },
          is_active: r.is_active,
        }));
      }

      logger.info('   ℹ️  No reviews found in HTML');
      return [];
    } catch (error) {
      logger.error('   ⚠️  Failed to extract reviews:', error.message);
      logger.error('   Stack:', error.stack);
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
        const reviews = jsReviews
          .map(jsReview => this.parseJSReviewData(jsReview, productId))
          .filter(r => r !== null);
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
        review_date:
          jsReview.review_date || jsReview.date || jsReview.created_at
            ? new Date(jsReview.review_date || jsReview.date || jsReview.created_at)
            : new Date(),
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
          typeof img === 'string' ? img : img.url || img
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
      const reviewerName =
        $element.find(selectors.reviewsPage.reviewerName).text().trim() ||
        $element.find(selectors.product.reviews.reviewAuthor).text().trim() ||
        'Anonymous';

      // Extract rating (try multiple formats)
      let rating = 0;
      const ratingElement = $element.find(selectors.reviewsPage.reviewRating).first();

      if (ratingElement.length) {
        // Try data attribute
        rating =
          parseFloat(ratingElement.attr('data-rating')) ||
          parseFloat(ratingElement.attr('data-score')) ||
          0;

        // Try counting stars
        if (rating === 0) {
          const stars = ratingElement.find(
            '[class*="star"][class*="filled"], [class*="star"][class*="active"]'
          );
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
      const reviewText =
        $element.find(selectors.reviewsPage.reviewText).text().trim() ||
        $element.find(selectors.product.reviews.reviewText).text().trim() ||
        '';

      // Extract review date
      let reviewDate = new Date();
      const dateElement =
        $element.find(selectors.reviewsPage.reviewDate).text().trim() ||
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
          const fullUrl = imgUrl.startsWith('http')
            ? imgUrl
            : `https://images.priceoye.pk/${imgUrl}`;
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
        const fullUrl = nextUrl.startsWith('http') ? nextUrl : `${this.baseUrl}${nextUrl}`;

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

      // Log sample data for debugging
      if (reviews.length > 0) {
        const sample = reviews[0];
        logger.info(`   🔍 Sample review data:`);
        logger.info(`      product_id: ${sample.product_id}`);
        logger.info(`      platform_id: ${sample.platform_id}`);
        logger.info(`      reviewer_name: "${sample.reviewer_name}"`);
        logger.info(`      review_date: ${sample.review_date}`);
        logger.info(`      text (first 50 chars): "${sample.text?.substring(0, 50)}..."`);
      }

      let savedCount = 0;
      let updatedCount = 0;
      for (const reviewData of reviews) {
        try {
          // Check if review already exists using multiple criteria to prevent duplicates
          // We check by: product_id, platform_id, reviewer_name, and either review_text or review_date
          const existing = await Review.findOne({
            product_id: reviewData.product_id,
            platform_id: reviewData.platform_id,
            reviewer_name: reviewData.reviewer_name,
            $or: [
              { review_date: reviewData.review_date },
              { text: reviewData.text }, // Also check by review text for exact duplicates
            ],
          });

          if (existing) {
            // Update existing review (in case some fields changed)
            await Review.updateOne({ _id: existing._id }, { $set: reviewData });
            updatedCount++;
            logger.info(`   🔄 Updated review: ${reviewData.reviewer_name} (${existing._id})`);
          } else {
            // Create new review
            const created = await Review.create(reviewData);
            savedCount++;
            logger.info(`   ✅ Created new review: ${reviewData.reviewer_name} (${created._id})`);
          }
        } catch (error) {
          logger.warn(
            `   ⚠️  Failed to save review by ${reviewData.reviewer_name}: ${error.message}`
          );
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

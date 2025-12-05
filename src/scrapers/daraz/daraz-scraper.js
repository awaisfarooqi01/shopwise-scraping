/**
 * Daraz Scraper
 * Main scraper for Daraz.pk website
 *
 * Handles:
 * - Single product scraping (HTML-only extraction)
 * - Product reviews with pagination
 * - Product listing page scraping
 * - Data normalization (brand/category)
 * - Database storage
 *
 * @module scrapers/daraz/daraz-scraper
 */

const BaseScraper = require('../base-scraper');
const selectors = require('./selectors');
const config = require('../../config/scraper-config');
const { logger } = require('../../utils/logger');
const { parsePrice, cleanText } = require('../../utils/helpers');
const databaseService = require('../../services/database-service');
const Product = require('../../models/Product');
const Review = require('../../models/Review');
const Platform = require('../../models/Platform');
const cheerio = require('cheerio');

// Unmapped category ID - set this in your .env or get from database
const UNMAPPED_CATEGORY_ID = process.env.UNMAPPED_CATEGORY_ID || null;

/**
 * DarazScraper - Scrapes product data from Daraz.pk
 * @extends BaseScraper
 */
class DarazScraper extends BaseScraper {
  constructor() {
    super(config);
    this.baseUrl = config.platform.daraz.baseUrl;
    this.platform = null;
    this.selectors = selectors;
  }

  /**
   * Initialize scraper (load platform from DB)
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      logger.info('🔧 Initializing Daraz scraper...');

      // Load platform from database
      this.platform = await Platform.findOne({ name: 'Daraz' });

      if (!this.platform) {
        throw new Error('Daraz platform not found in database. Please run seed script first.');
      }

      logger.info(`✅ Platform loaded: ${this.platform.name} (ID: ${this.platform._id})`);

      // Preload brand cache for better performance
      logger.info('📦 Preloading brand cache...');
      await databaseService.preloadBrandCache(500);

      // Initialize browser
      await this.initBrowser();

      logger.info('✅ Daraz scraper initialized');

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize scraper:', error);
      throw error;
    }
  }

  /**
   * Scrape a single product page
   * @param {string} url - Product URL (e.g., https://www.daraz.pk/products/product-name-i123456-s789.html)
   * @returns {Promise<object>} Product data
   */
  async scrapeProduct(url) {
    try {
      logger.info(`\n🔍 Scraping product: ${url}`);

      // Navigate to product page - Daraz loads content dynamically via JavaScript
      // We use 'domcontentloaded' and then wait for JS content to render
      logger.info(`📄 Navigating to: ${url}`);
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded', // DOM ready, then we wait for JS
        timeout: 60000, // 60 seconds
      });

      logger.info('   ⏳ Waiting for dynamic content...');

      // Wait 5 seconds for JavaScript to render dynamic content
      await this.page.waitForTimeout(5000);

      // Try to wait for price element (loaded via JS)
      const priceLoaded = await this.page
        .waitForSelector('.pdp-price', { timeout: 10000 })
        .then(() => true)
        .catch(() => false);

      if (!priceLoaded) {
        logger.warn('   ⚠️  Price not loaded, waiting 5s more...');
        await this.page.waitForTimeout(5000);
      }

      logger.info('   ✅ Page content loaded');

      // Extract product data from HTML
      const html = await this.page.content();
      const $ = cheerio.load(html);
      let productData = await this.extractProductDataFromHTML($);

      if (!productData || !productData.name) {
        throw new Error('Failed to extract product data from page');
      }

      // Add platform and URL
      productData.platform_id = this.platform._id;
      productData.platform_name = this.platform.name;
      productData.original_url = url;

      // Normalize brand (with auto-creation if not found)
      if (productData.brand) {
        logger.info(`   🏷️  Normalizing brand: ${productData.brand}`);
        const normalizedBrand = await databaseService.normalizeBrand(productData.brand, {
          platformId: this.platform._id.toString(),
          autoCreate: true,
        });

        if (normalizedBrand && normalizedBrand.brand_id) {
          productData.brand_id = normalizedBrand.brand_id;
          productData.platform_metadata = productData.platform_metadata || {};
          productData.platform_metadata.original_brand = productData.brand;

          if (normalizedBrand.canonical_name) {
            productData.brand = normalizedBrand.canonical_name;
          }

          productData.mapping_metadata = productData.mapping_metadata || {};
          productData.mapping_metadata.brand_confidence = normalizedBrand.confidence || 1.0;
          productData.mapping_metadata.brand_source = normalizedBrand.source || 'exact_match';

          logger.info(`   ✅ Brand normalized: ${productData.brand} (ID: ${productData.brand_id})`);
        } else {
          logger.warn(`   ⚠️  Brand normalization failed for: ${productData.brand}`);
          productData.brand_id = null;
        }
      }

      // Map category using DatabaseService
      if (productData.category_name) {
        logger.info(`   📂 Mapping category: ${productData.category_name}`);

        const platformCategory = productData.category_name.trim();

        try {
          const mappedCategory = await databaseService.mapCategory(
            this.platform._id,
            platformCategory,
            {
              unmappedCategoryId: UNMAPPED_CATEGORY_ID,
              autoCreate: true,
            }
          );

          if (mappedCategory && mappedCategory.category_id) {
            productData.category_id = mappedCategory.category_id;
            productData.category_name = mappedCategory.category_name || productData.category_name;
            productData.subcategory_id = mappedCategory.subcategory_id;
            productData.subcategory_name = mappedCategory.subcategory_name || '';

            productData.platform_metadata = productData.platform_metadata || {};
            productData.platform_metadata.original_category = platformCategory;
            if (productData.category_path) {
              productData.platform_metadata.original_category_path =
                productData.category_path.join(' > ');
            }

            productData.mapping_metadata = productData.mapping_metadata || {};
            productData.mapping_metadata.category_confidence = mappedCategory.confidence || 1.0;

            const sourceMapping = {
              existing_mapping: 'database_verified',
              auto_created: 'auto',
              fuzzy_match: 'fuzzy',
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
          } else {
            logger.warn(`   ⚠️  Category mapping failed for "${platformCategory}"`);
            productData.category_id = null;
            productData.subcategory_id = null;
          }
        } catch (categoryError) {
          logger.error(`   ❌ Category mapping error:`, categoryError.message);
          productData.category_id = null;
          productData.subcategory_id = null;
        }
      }

      // Clean up category_path from final output (not in Product model)
      delete productData.category_path;

      return productData;
    } catch (error) {
      logger.error(`❌ Failed to scrape product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract product data from HTML (primary method)
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Promise<object>} Product data matching Product model schema
   */
  async extractProductDataFromHTML($) {
    try {
      logger.info('   📄 Extracting data from HTML...');

      const product = {};

      // ========== BASIC INFORMATION ==========

      // Name
      product.name =
        cleanText($(this.selectors.product.name).text()) ||
        cleanText($(this.selectors.product.nameAlt).text()) ||
        cleanText($('h1').first().text());

      if (!product.name) {
        logger.error('   ❌ Product name not found');
        return null;
      }

      // Brand
      product.brand =
        cleanText($(this.selectors.product.brand).text()) ||
        cleanText($(this.selectors.product.brandAlt).text()) ||
        ''; // ========== CATEGORY (from breadcrumb) ==========
      const categoryPath = [];

      // Extract breadcrumb items, excluding the last one (product name)
      // The last item has class 'breadcrumb_item_anchor_last'
      $('#J_breadcrumb .breadcrumb_item').each((i, el) => {
        const $item = $(el);
        // Skip the last item (product name) - it has 'breadcrumb_item_anchor_last' class
        if ($item.find('.breadcrumb_item_anchor_last').length > 0) {
          return; // Skip product name
        }

        const text = cleanText(
          $item.find('.breadcrumb_item_anchor span').text() || $item.find('a').text()
        );
        if (text && text !== 'Home' && text.length > 1) {
          categoryPath.push(text);
        }
      });

      // Fallback to generic breadcrumb selector if Daraz-specific one fails
      if (categoryPath.length === 0) {
        $(this.selectors.product.breadcrumb)
          .find('a')
          .each((i, el) => {
            const text = cleanText($(el).text());
            const href = $(el).attr('href') || '';
            // Skip Home and product page links
            if (text && text !== 'Home' && !href.includes('/products/') && text.length > 1) {
              categoryPath.push(text);
            }
          });
      }

      if (categoryPath.length > 0) {
        product.category_path = categoryPath;
        // Use the most specific category (last in path) as category_name
        product.category_name = categoryPath[categoryPath.length - 1] || '';

        // Set subcategory if path has more than 1 item
        if (categoryPath.length >= 2) {
          product.subcategory_name = categoryPath[categoryPath.length - 1];
        }
      }

      // ========== PRICING ==========
      // Try multiple selectors for price (Daraz sometimes changes their HTML)
      let currentPriceText = $(this.selectors.product.price.current).text();

      // Fallback selectors for price
      if (!currentPriceText || currentPriceText.trim() === '') {
        // Try alternative selectors
        const priceSelectors = [
          '.pdp-price_type_normal',
          '.pdp-price_color_orange',
          '.pdp-price',
          '[data-spm="price"]',
          '.pdp-product-price span',
        ];

        for (const selector of priceSelectors) {
          const text = $(selector).first().text();
          if (text && text.includes('Rs')) {
            currentPriceText = text;
            logger.info(`   💰 Found price with selector: ${selector}`);
            break;
          }
        }
      }

      product.price = parsePrice(currentPriceText) || 0;

      // If still no price, try to extract from page source (JSON-LD or meta)
      if (product.price === 0) {
        // Try JSON-LD
        const jsonLd = $('script[type="application/ld+json"]').text();
        if (jsonLd) {
          try {
            const ldData = JSON.parse(jsonLd);
            if (ldData.offers?.price) {
              product.price = parseFloat(ldData.offers.price) || 0;
              logger.info(`   💰 Found price from JSON-LD: ${product.price}`);
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }

        // Try meta tag
        if (product.price === 0) {
          const metaPrice = $('meta[property="product:price:amount"]').attr('content');
          if (metaPrice) {
            product.price = parseFloat(metaPrice) || 0;
            logger.info(`   💰 Found price from meta: ${product.price}`);
          }
        }
      }

      const originalPriceText = $(this.selectors.product.price.original).text();
      const originalPrice = parsePrice(originalPriceText);

      // Handle sale price logic (same as PriceOye)
      if (originalPrice && originalPrice > product.price) {
        product.sale_price = product.price;
        product.price = originalPrice; // Original price becomes "price"
      }

      const discountText = $(this.selectors.product.price.discount).text();
      if (discountText) {
        const discountMatch = discountText.match(/-?(\d+)%/);
        if (discountMatch) {
          product.sale_percentage = parseInt(discountMatch[1], 10);
        }
      } else if (originalPrice && originalPrice > product.price) {
        // Calculate discount if not shown
        product.sale_percentage = Math.round(
          ((originalPrice - (product.sale_price || product.price)) / originalPrice) * 100
        );
      }

      product.currency = 'PKR';

      // ========== DESCRIPTION ==========
      const descriptionParts = [];

      // Get highlights
      const highlights = $(this.selectors.product.description.highlights).text();
      if (highlights) {
        descriptionParts.push(cleanText(highlights));
      }

      // Get full description
      const detailContent = $(this.selectors.product.description.detailContent).text();
      if (detailContent) {
        descriptionParts.push(cleanText(detailContent));
      }

      const fullDesc = $(this.selectors.product.description.fullDescription).text();
      if (fullDesc) {
        descriptionParts.push(cleanText(fullDesc));
      }

      // Also try meta description as fallback
      if (descriptionParts.length === 0) {
        const metaDesc = $('meta[name="description"]').attr('content');
        if (metaDesc) {
          descriptionParts.push(cleanText(metaDesc));
        }
      }

      product.description = descriptionParts.join('\n\n').substring(0, 5000); // Limit length

      // ========== SPECIFICATIONS ==========
      product.specifications = new Map();
      $(this.selectors.product.specifications.row).each((i, el) => {
        const key = cleanText($(el).find(this.selectors.product.specifications.key).text());
        const value = cleanText($(el).find(this.selectors.product.specifications.value).text());
        if (key && value) {
          product.specifications.set(key, value);
        }
      });

      // What's in the box
      const whatsInBox = cleanText($(this.selectors.product.specifications.whatsInBox).text());
      if (whatsInBox) {
        product.specifications.set("What's in the box", whatsInBox);
      }

      logger.info(`   📋 Specs: ${product.specifications.size} items`);

      // ========== MEDIA (Images) ==========
      product.media = { images: [], videos: [] };

      // Extract all gallery images
      $(this.selectors.product.images.gallery).each((i, el) => {
        let src = $(el).attr('src');
        if (src) {
          // Convert thumbnail URL to large image URL
          // Daraz thumbnails: _80x80q80 -> convert to _720x720q80
          const largeUrl = src.replace(/_\d+x\d+q\d+/, '_720x720q80').replace(/\.webp$/, '.jpg'); // Some may be webp

          if (!product.media.images.some(img => img.url === largeUrl)) {
            product.media.images.push({
              url: largeUrl,
              type: i === 0 ? 'main' : 'gallery',
              alt_text: product.name,
            });
          }
        }
      });

      // Also try main gallery image
      const mainImage = $(this.selectors.product.images.main).attr('src');
      if (mainImage && !product.media.images.some(img => img.url === mainImage)) {
        product.media.images.unshift({
          url: mainImage,
          type: 'main',
          alt_text: product.name,
        });
      }

      // Try og:image as fallback
      if (product.media.images.length === 0) {
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage) {
          product.media.images.push({
            url: ogImage,
            type: 'main',
            alt_text: product.name,
          });
        }
      }

      logger.info(`   🖼️  Images: ${product.media.images.length} items`);

      // ========== VARIANTS ==========
      product.variants = new Map();
      $(this.selectors.product.variants.group).each((i, el) => {
        const groupTitle = cleanText($(el).find(this.selectors.product.variants.groupTitle).text());
        const options = [];

        // Check for text options
        $(el)
          .find('.sku-name')
          .each((j, opt) => {
            const optName = cleanText($(opt).text());
            if (optName) options.push(optName);
          });

        // Check for image-based options (colors)
        $(el)
          .find(this.selectors.product.variants.imageOptions)
          .each((j, opt) => {
            const optName = $(opt).attr('title') || $(opt).find('img').attr('alt');
            if (optName) options.push(cleanText(optName));
          });

        if (groupTitle && options.length > 0) {
          const normalizedName = this.normalizeVariantName(groupTitle);
          product.variants.set(normalizedName, options);
          logger.info(`   🎨 ${normalizedName}: ${options.join(', ')}`);
        }
      }); // ========== REVIEWS/RATINGS ==========
      // Try to get average rating from review section
      let avgRatingText = $(this.selectors.product.reviews.averageRating).text();
      product.average_rating = parseFloat(avgRatingText) || 0;

      // Fallback: Count stars in header summary section
      // Stars in .pdp-review-summary__stars indicate approximate rating
      if (product.average_rating === 0) {
        const headerStars = $('.pdp-review-summary__stars img.star').length;
        if (headerStars > 0) {
          // Star images represent the rating (e.g., 5 stars = 5.0 rating)
          product.average_rating = headerStars;
        }
      }

      // Get review count from header or review section
      const totalRatingsText =
        $(this.selectors.product.reviews.totalRatings).text() ||
        $('.pdp-review-summary__link').first().text();
      const ratingsMatch = totalRatingsText.match(/(\d+)/);
      product.review_count = ratingsMatch ? parseInt(ratingsMatch[1], 10) : 0;

      // Set positive_percent to -1 (not yet analyzed)
      product.positive_percent = -1;

      logger.info(`   ⭐ Rating: ${product.average_rating}/5 (${product.review_count} reviews)`);

      // ========== AVAILABILITY ==========
      const outOfStock = $(this.selectors.product.availability.outOfStock).length > 0;
      product.availability = outOfStock ? 'out_of_stock' : 'in_stock';

      // ========== SELLER INFO ==========
      const sellerName = cleanText($(this.selectors.product.seller.name).text());
      if (sellerName) {
        product.seller = {
          name: sellerName,
        };

        const positiveRating = $(this.selectors.product.seller.positiveRating).text();
        if (positiveRating) {
          const ratingMatch = positiveRating.match(/(\d+)%/);
          if (ratingMatch) {
            product.seller.positive_rating = parseInt(ratingMatch[1], 10);
          }
        }

        const shipOnTime = $(this.selectors.product.seller.shipOnTime).text();
        if (shipOnTime) {
          const shipMatch = shipOnTime.match(/(\d+)%/);
          if (shipMatch) {
            product.seller.ship_on_time = parseInt(shipMatch[1], 10);
          }
        }
      }

      // ========== DELIVERY INFO ==========
      const deliveryTime = cleanText($(this.selectors.product.delivery.standardDelivery).text());
      if (deliveryTime) {
        product.delivery_time = deliveryTime;
      }

      const shippingFee = $(this.selectors.product.delivery.shippingFee).text();
      if (shippingFee) {
        product.shipping_cost = parsePrice(shippingFee) || 0;
      }

      // ========== PLATFORM METADATA ==========
      product.platform_metadata = product.platform_metadata || {};

      // Extract item_id from URL (format: i{item_id}-s{sku_id}.html)
      const urlMatch = this.page ? this.page.url().match(/i(\d+)-s(\d+)/) : null;
      if (urlMatch) {
        product.platform_metadata.item_id = urlMatch[1];
        product.platform_metadata.sku_id = urlMatch[2];
      }

      // Try to get SKU from specifications
      const skuSpec = product.specifications.get('SKU');
      if (skuSpec) {
        product.platform_metadata.sku = skuSpec;
      }

      // ========== DEFAULTS ==========
      product.condition = 'new';
      product.is_active = true;

      // Log extraction summary
      logger.info(`   ✅ Extracted from HTML: ${product.name}`);
      logger.info(`   💰 Price: Rs ${product.sale_price || product.price}`);
      if (product.sale_percentage) {
        logger.info(`   💸 Discount: ${product.sale_percentage}%`);
      }

      return product;
    } catch (error) {
      logger.error('   ❌ Failed to extract data from HTML:', error.message);
      return null;
    }
  }

  /**
   * Normalize variant name to standard format
   * @param {string} name - Raw variant name
   * @returns {string} Normalized variant name
   */
  normalizeVariantName(name) {
    const nameMap = {
      'color family': 'color',
      color: 'color',
      colour: 'color',
      'storage capacity': 'storage',
      storage: 'storage',
      'internal storage': 'storage',
      ram: 'ram',
      size: 'size',
      weight: 'weight',
      'pack size': 'pack_size',
      quantity: 'quantity',
      flavor: 'flavor',
      flavour: 'flavor',
      type: 'type',
      model: 'model',
      version: 'version',
    };

    const normalized = name.toLowerCase().trim();
    return nameMap[normalized] || normalized.replace(/\s+/g, '_');
  }

  /**
   * Clean HTML from description
   * @param {string} html - Raw HTML description
   * @returns {string} Clean text
   */
  cleanDescription(html) {
    if (!html) return '';

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    // Clean extra whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Extract reviews for a product (with pagination support)
   * @param {string} url - Product URL
   * @param {object} options - Options
   * @param {number} options.maxPages - Maximum pages to scrape (default: all)
   * @param {number} options.maxReviews - Maximum reviews to collect (default: all)
   * @returns {Promise<Array>} Array of review objects
   */
  async scrapeReviews(url, options = {}) {
    const { maxPages = null, maxReviews = null } = options;

    try {
      logger.info(`\n📝 Scraping reviews for: ${url}`);

      // Navigate to product page if not already there
      const currentUrl = this.page.url();
      if (!currentUrl.includes(url.split('/products/')[1]?.split('.html')[0])) {
        await this.goto(url);
      }

      // Wait for review section to load
      await this.page
        .waitForSelector(this.selectors.product.reviews.container, {
          timeout: 10000,
        })
        .catch(() => {
          logger.warn('   ⚠️  Review container not found');
        });

      const allReviews = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        logger.info(`   📄 Scraping review page ${currentPage}...`);

        // Extract reviews from current page
        const pageReviews = await this.extractReviewsFromPage();
        allReviews.push(...pageReviews);

        logger.info(`   ✅ Found ${pageReviews.length} reviews on page ${currentPage}`);

        // Check limits
        if (maxReviews && allReviews.length >= maxReviews) {
          logger.info(`   📊 Reached max reviews limit (${maxReviews})`);
          break;
        }

        if (maxPages && currentPage >= maxPages) {
          logger.info(`   📊 Reached max pages limit (${maxPages})`);
          break;
        }

        // Check for next page button
        const nextButton = await this.page.$(this.selectors.product.reviewPagination.nextButton);

        if (nextButton) {
          // Click next page
          await nextButton.click();

          // Wait for reviews to update
          await this.page.waitForTimeout(1500);
          await this.page
            .waitForSelector(this.selectors.product.reviewItem.container, {
              timeout: 10000,
            })
            .catch(() => {});

          currentPage++;
        } else {
          hasMorePages = false;
        }
      }

      logger.info(`   📊 Total reviews scraped: ${allReviews.length}`);

      return maxReviews ? allReviews.slice(0, maxReviews) : allReviews;
    } catch (error) {
      logger.error(`❌ Failed to scrape reviews: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract reviews from the current page
   * @returns {Promise<Array>} Array of review objects
   */
  async extractReviewsFromPage() {
    try {
      const html = await this.page.content();
      const $ = cheerio.load(html);

      const reviews = [];
      const reviewSelector = this.selectors.product.reviewItem;

      $(reviewSelector.container).each((i, el) => {
        try {
          const $review = $(el);

          // Count stars
          const starCount = $review.find(reviewSelector.stars).length;

          // Extract date
          const dateText = cleanText($review.find(reviewSelector.date).text());

          // Extract author
          const author = cleanText($review.find(reviewSelector.author).text());

          // Check if verified purchase
          const isVerified = $review.find(reviewSelector.verified).length > 0;

          // Extract content
          const content = cleanText($review.find(reviewSelector.content).text());

          // Extract review images
          const images = [];
          $review.find(reviewSelector.images).each((j, img) => {
            const src = $(img).attr('src');
            if (src) images.push(src);
          });

          // Extract SKU info (variant purchased)
          const skuInfo = cleanText($review.find(reviewSelector.skuInfo).text());

          // Extract likes count
          const likesText = $review.find(reviewSelector.likes).text();
          const likes = parseInt(likesText, 10) || 0;

          reviews.push({
            rating: starCount,
            date: this.parseReviewDate(dateText),
            author: author || 'Anonymous',
            is_verified: isVerified,
            content: content,
            images: images,
            variant_purchased: skuInfo,
            helpful_count: likes,
          });
        } catch (reviewError) {
          logger.warn(`   ⚠️  Failed to extract review ${i + 1}:`, reviewError.message);
        }
      });

      return reviews;
    } catch (error) {
      logger.error('   ❌ Failed to extract reviews from page:', error.message);
      return [];
    }
  }

  /**
   * Parse review date string
   * @param {string} dateStr - Date string from review
   * @returns {Date} Parsed date
   */
  parseReviewDate(dateStr) {
    if (!dateStr) return new Date();

    try {
      // Handle relative dates like "2 days ago", "1 month ago"
      const relativeMatch = dateStr.match(
        /(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago/i
      );
      if (relativeMatch) {
        const value = parseInt(relativeMatch[1], 10);
        const unit = relativeMatch[2].toLowerCase();
        const now = new Date();

        if (unit.startsWith('day')) {
          now.setDate(now.getDate() - value);
        } else if (unit.startsWith('week')) {
          now.setDate(now.getDate() - value * 7);
        } else if (unit.startsWith('month')) {
          now.setMonth(now.getMonth() - value);
        } else if (unit.startsWith('year')) {
          now.setFullYear(now.getFullYear() - value);
        }

        return now;
      }

      // Try parsing standard date format
      return new Date(dateStr);
    } catch {
      return new Date();
    }
  }

  /**
   * Scrape listing page (category or search results) with pagination
   * @param {string} url - Listing page URL
   * @param {object} options - Options
   * @param {number} options.maxPages - Maximum pages to scrape
   * @param {number} options.maxProducts - Maximum products to collect
   * @returns {Promise<Array>} Array of product URLs
   */
  async scrapeListingPage(url, options = {}) {
    const { maxPages = 5, maxProducts = null } = options;

    try {
      logger.info(`\n📋 Scraping listing page: ${url}`);

      await this.goto(url);

      // Wait for products to load
      await this.page.waitForSelector(this.selectors.listing.productCard, {
        timeout: 15000,
      });

      const allProductUrls = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= maxPages) {
        logger.info(`   📄 Scraping page ${currentPage}...`);

        // Extract product URLs from current page
        const pageUrls = await this.extractProductUrlsFromPage();
        allProductUrls.push(...pageUrls);

        logger.info(`   ✅ Found ${pageUrls.length} products on page ${currentPage}`);

        // Check product limit
        if (maxProducts && allProductUrls.length >= maxProducts) {
          logger.info(`   📊 Reached max products limit (${maxProducts})`);
          break;
        }

        // Check for next page
        const nextButton = await this.page.$(this.selectors.listing.pagination.nextButton);

        if (nextButton && currentPage < maxPages) {
          await nextButton.click();
          await this.page.waitForTimeout(2000);
          await this.page.waitForSelector(this.selectors.listing.productCard, {
            timeout: 15000,
          });
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }

      // Deduplicate URLs
      const uniqueUrls = [...new Set(allProductUrls)];

      logger.info(`   📊 Total unique product URLs: ${uniqueUrls.length}`);

      return maxProducts ? uniqueUrls.slice(0, maxProducts) : uniqueUrls;
    } catch (error) {
      logger.error(`❌ Failed to scrape listing page: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract product URLs from current listing page
   * @returns {Promise<Array<string>>} Array of product URLs
   */
  async extractProductUrlsFromPage() {
    try {
      const html = await this.page.content();
      const $ = cheerio.load(html);

      const urls = [];

      $(this.selectors.listing.productLink).each((i, el) => {
        let href = $(el).attr('href');
        if (href) {
          // Make absolute URL
          if (href.startsWith('/')) {
            href = this.baseUrl + href;
          }
          // Only include product pages
          if (href.includes('/products/') && href.includes('.html')) {
            urls.push(href);
          }
        }
      });

      return urls;
    } catch (error) {
      logger.error('Failed to extract product URLs:', error.message);
      return [];
    }
  }

  /**
   * Validate product data before saving
   * @param {object} data - Product data to validate
   * @throws {Error} If validation fails
   */
  validateProductData(data) {
    const required = ['name', 'price', 'platform_id', 'original_url'];

    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (data.name.length < 3) {
      throw new Error('Product name too short');
    }
  }

  /**
   * Save product to database
   * @param {object} productData - Product data to save
   * @returns {Promise<object>} Saved product
   */
  async saveProduct(productData) {
    try {
      // Validate before saving
      this.validateProductData(productData);

      // Convert Map to Object for MongoDB
      const dataToSave = { ...productData };
      if (dataToSave.specifications instanceof Map) {
        dataToSave.specifications = Object.fromEntries(dataToSave.specifications);
      }
      if (dataToSave.variants instanceof Map) {
        dataToSave.variants = Object.fromEntries(dataToSave.variants);
      }

      // Upsert product
      const saved = await Product.findOneAndUpdate(
        { original_url: dataToSave.original_url },
        dataToSave,
        { upsert: true, new: true }
      );

      logger.info(`   💾 Product saved: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('   ❌ Failed to save product:', error.message);
      throw error;
    }
  }

  /**
   * Save reviews to database
   * @param {string} productId - Product ID
   * @param {Array} reviews - Reviews to save
   * @returns {Promise<number>} Number of reviews saved
   */
  async saveReviews(productId, reviews) {
    try {
      let savedCount = 0;

      for (const review of reviews) {
        const reviewData = {
          product_id: productId,
          platform_id: this.platform._id,
          ...review,
        };

        await Review.findOneAndUpdate(
          {
            product_id: productId,
            author: review.author,
            content: review.content,
          },
          reviewData,
          { upsert: true, new: true }
        );

        savedCount++;
      }

      logger.info(`   💾 Saved ${savedCount} reviews`);
      return savedCount;
    } catch (error) {
      logger.error('   ❌ Failed to save reviews:', error.message);
      throw error;
    }
  }

  /**
   * Close scraper and cleanup resources
   */
  async close() {
    try {
      await this.closeBrowser();
      logger.info('🔒 Daraz scraper closed');
    } catch (error) {
      logger.error('Error closing scraper:', error);
    }
  }
}

module.exports = DarazScraper;

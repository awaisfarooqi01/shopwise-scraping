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
// const UNMAPPED_CATEGORY_ID = process.env.UNMAPPED_CATEGORY_ID || null;
const UNMAPPED_CATEGORY_ID = '692eb8c6ac1679df1d60ed19';

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
   * Scrape an entire category or search query from Daraz
   * @param {string} url - Category or search URL (e.g., 'https://www.daraz.pk/catalog?q=iphone+15')
   * @param {Object} options - Scraping options
   * @param {number} [options.maxPages=10] - Maximum number of listing pages to scrape
   * @param {number} [options.maxProducts=null] - Maximum number of products to scrape (null = all)
   * @param {boolean} [options.includeReviews=true] - Whether to scrape reviews for each product
   * @param {number} [options.maxReviewPages=5] - Maximum review pages per product
   * @param {string} [options.name=null] - Category name for logging (auto-detected from URL if not provided)
   * @param {number} [options.startPage=1] - Starting page number (1-indexed)
   * @param {number} [options.endPage=null] - Ending page number (null = unlimited)
   * @returns {Promise<Array>} Array of scraped products with their reviews
   */ async scrapeCategoryByUrl(url, options = {}) {
    const {
      maxPages = 10,
      maxProducts = null,
      includeReviews = false, // Default to false (reviews not yet implemented for category mode)
      maxReviewPages = 5,
      name = null,
      startPage = 1,
      endPage = null,
    } = options;

    try {
      // Extract name from URL if not provided
      let categoryName = name;
      if (!categoryName) {
        try {
          const urlObj = new URL(url);
          const query = urlObj.searchParams.get('q');
          if (query) {
            // Decode and format query (e.g., "iphone+15" -> "iPhone 15")
            categoryName = decodeURIComponent(query.replace(/\+/g, ' '));
          } else {
            // Try to extract from path (e.g., /electronics/)
            const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
            categoryName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'unknown';
          }
        } catch (e) {
          categoryName = 'unknown';
        }
      }

      logger.info(`\n🏷️  Scraping Daraz category: ${categoryName}`);
      logger.info(`📍 URL: ${url}`);

      // Log page range if specified
      const pageRangeStr = endPage
        ? `pages ${startPage}-${endPage}`
        : startPage > 1
          ? `pages ${startPage}+`
          : `maxPages=${maxPages}`;
      logger.info(
        `⚙️  Options: ${pageRangeStr}, maxProducts=${maxProducts || 'all'}, includeReviews=${includeReviews}`
      );

      // Step 1: Get all product URLs from listing pages
      const productUrls = await this.scrapeListingPage(url, {
        maxPages,
        maxProducts,
        startPage,
        endPage,
      });

      if (productUrls.length === 0) {
        logger.warn(`⚠️  No products found for category: ${categoryName}`);
        return [];
      }

      logger.info(`\n📊 Found ${productUrls.length} products to scrape`);

      // Step 2: Scrape each product (with reviews if enabled)
      const scrapedProducts = [];
      const failedProducts = [];

      for (let i = 0; i < productUrls.length; i++) {
        const productUrl = productUrls[i];
        logger.info(`\n[${i + 1}/${productUrls.length}] 🔍 Scraping: ${productUrl}`);

        try {
          // Scrape product details
          const productData = await this.scrapeProduct(productUrl);

          if (!productData) {
            logger.warn(`   ⚠️  No data extracted for ${productUrl}`);
            failedProducts.push({ url: productUrl, reason: 'No data extracted' });
            continue;
          }

          // Save product to database
          const savedProduct = await this.saveProduct(productData);
          scrapedProducts.push(savedProduct);
          logger.info(`   ✅ Product saved: ${savedProduct.name}`);

          // Scrape reviews if enabled
          if (includeReviews) {
            try {
              logger.info(`   💬 Scraping reviews (max ${maxReviewPages} pages)...`);
              const reviews = await this.scrapeReviews(productUrl, {
                maxPages: maxReviewPages,
                scrollToReviews: true,
              });

              if (reviews.length > 0) {
                const saveResult = await this.saveReviews(savedProduct._id, reviews);
                logger.info(
                  `   ✅ Reviews: ${saveResult.saved} saved, ${saveResult.skipped} skipped`
                );
              } else {
                logger.info(`   ℹ️  No reviews found for this product`);
              }
            } catch (reviewError) {
              logger.error(`   ⚠️  Failed to scrape reviews: ${reviewError.message}`);
              // Continue even if reviews fail
            }
          }

          // Random delay between products (anti-bot measure)
          await this.randomDelay(2000, 4000);
        } catch (error) {
          logger.error(`   ❌ Failed to scrape ${productUrl}: ${error.message}`);
          failedProducts.push({ url: productUrl, reason: error.message });
          // Continue with next product
        }
      }

      // Summary
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`✅ Category scraping complete: ${categoryName}`);
      logger.info(`📊 Results:`);
      logger.info(`   - Total products found: ${productUrls.length}`);
      logger.info(`   - Successfully scraped: ${scrapedProducts.length}`);
      logger.info(`   - Failed: ${failedProducts.length}`);
      logger.info(`${'='.repeat(80)}\n`);

      if (failedProducts.length > 0) {
        logger.info(`⚠️  Failed products:`);
        failedProducts.forEach(({ url, reason }) => {
          logger.info(`   - ${url}: ${reason}`);
        });
      }

      return scrapedProducts;
    } catch (error) {
      logger.error(`❌ Failed to scrape category ${url}:`, error);
      throw error;
    }
  }

  /**
   * Scrape listing page(s) to extract product URLs
   * @param {string} url - Listing page URL
   * @param {Object} options - Options
   * @param {number} [options.maxPages=5] - Maximum pages to scrape
   * @param {number} [options.maxProducts=null] - Maximum products to extract
   * @returns {Promise<Array>} Array of product URLs
   */
  async scrapeListingPage(url, options = {}) {
    const { maxPages = 5, maxProducts = null, startPage = 1, endPage = null } = options;

    // Calculate effective max pages based on startPage and endPage
    let effectiveMaxPages = maxPages;
    if (endPage) {
      effectiveMaxPages = endPage; // We'll scrape up to endPage
    }

    try {
      logger.info(`\n📋 Scraping listing page: ${url}`);
      if (startPage > 1 || endPage) {
        logger.info(`   🔢 Page range: ${startPage} to ${endPage || effectiveMaxPages}`);
      }

      // Navigate to the starting page
      let startUrl = url;
      if (startPage > 1) {
        // Append page parameter to URL
        const urlObj = new URL(url);
        urlObj.searchParams.set('page', startPage.toString());
        startUrl = urlObj.toString();
        logger.info(`   📍 Starting from page ${startPage}: ${startUrl}`);
      }

      await this.goto(startUrl);

      // Wait for products to load
      await this.page.waitForSelector(this.selectors.listing.productCard, {
        timeout: 15000,
      });

      const allProductUrls = [];
      let currentPage = startPage;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= effectiveMaxPages) {
        // Skip pages before startPage (shouldn't happen with direct URL, but safety check)
        if (currentPage < startPage) {
          currentPage++;
          continue;
        }

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

        // Check if we've reached the end page
        if (endPage && currentPage >= endPage) {
          logger.info(`   📊 Reached end page limit (${endPage})`);
          break;
        }

        // Check for next page
        const nextButton = await this.page.$(this.selectors.listing.pagination.nextButton);

        if (nextButton && currentPage < effectiveMaxPages) {
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

      const urls = new Set(); // Use Set to avoid duplicates

      // Try multiple selectors (Daraz uses different ones on different pages)
      const linkSelectors = [
        'a[href*="/products/"]', // Most common
        '.gridItem a', // Grid layout
        '.Bm3ON a', // Alternative grid
        '.RfADt a', // Product card
        '[data-item-id] a', // Data attribute
      ];
      linkSelectors.forEach(selector => {
        $(selector).each((i, el) => {
          let href = $(el).attr('href');
          if (href) {
            // Clean up URL
            href = href.trim();

            // Handle relative URLs
            if (href.startsWith('/')) {
              href = this.baseUrl + href;
            } else if (href.startsWith('//')) {
              // Protocol-relative URL
              href = 'https:' + href;
            } else if (!href.startsWith('http')) {
              // Skip invalid URLs
              return;
            }

            // Fix URL issues - remove duplicate domains or paths
            // Pattern: https://www.daraz.pk/www.daraz.pk/products/...
            href = href.replace(/^(https?:\/\/[^/]+)\/(www\.daraz\.pk\/)/, '$1/');

            // Also handle: //www.daraz.pk/www.daraz.pk/...
            href = href.replace(/^(https?:)\/\/(www\.daraz\.pk)\/+/, '$1//$2/');

            // Only include product pages with proper format
            if (href.includes('/products/') && href.includes('.html')) {
              urls.add(href);
            }
          }
        });
      });

      const urlArray = Array.from(urls);
      logger.info(`   📦 Extracted ${urlArray.length} unique product URLs from page`);

      return urlArray;
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
   * @param {Array} reviews - Reviews to save (matching Review model schema)
   * @returns {Promise<{saved: number, skipped: number}>} Count of saved and skipped reviews
   */
  async saveReviews(productId, reviews) {
    try {
      let savedCount = 0;
      let skippedCount = 0;

      for (const review of reviews) {
        // Check if review already exists using stable unique key
        // Use reviewer_name + first 100 chars of text (text content doesn't change)
        const textFingerprint = review.text.substring(0, 100);

        const existingReview = await Review.findOne({
          product_id: productId,
          reviewer_name: review.reviewer_name,
          text: { $regex: `^${textFingerprint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
        });

        if (existingReview) {
          skippedCount++;
          continue; // Skip duplicate review
        }

        // Build review data matching Review model schema
        const reviewData = {
          product_id: productId,
          platform_id: this.platform._id,
          platform_name: this.platform.name,

          // Core review fields
          reviewer_name: review.reviewer_name,
          rating: review.rating,
          text: review.text,
          review_date: review.review_date,
          helpful_votes: review.helpful_votes || 0,
          verified_purchase: review.verified_purchase || false,
          images: review.images || [],

          // Sentiment analysis (to be updated by ML service)
          sentiment_analysis: review.sentiment_analysis || { needs_analysis: true },

          // Platform metadata
          platform_metadata: review.platform_metadata || {},

          // Status
          is_active: review.is_active !== undefined ? review.is_active : true,
        };

        // Insert new review
        await Review.create(reviewData);
        savedCount++;
      }

      if (skippedCount > 0) {
        logger.info(`   💾 Saved ${savedCount} new reviews, skipped ${skippedCount} existing`);
      } else {
        logger.info(`   💾 Saved ${savedCount} reviews`);
      }
      return { saved: savedCount, skipped: skippedCount };
    } catch (error) {
      logger.error('   ❌ Failed to save reviews:', error.message);
      throw error;
    }
  }

  /**
   * Scrape reviews from a product page with pagination
   * @param {string} url - Product URL
   * @param {Object} options - Scraping options
   * @param {number} [options.maxPages=5] - Maximum review pages to scrape
   * @param {number} [options.maxReviews=null] - Maximum reviews to collect (null = all)
   * @param {boolean} [options.scrollToReviews=true] - Whether to scroll to reviews section first
   * @returns {Promise<Array>} Array of review objects matching Review model schema
   */
  async scrapeReviews(url, options = {}) {
    const { maxPages = 5, maxReviews = null, scrollToReviews = true } = options;

    try {
      logger.info(`\n💬 Scraping reviews from: ${url}`);
      logger.info(`   ⚙️  Options: maxPages=${maxPages}, maxReviews=${maxReviews || 'all'}`);

      // Navigate to product page if not already there
      const currentUrl = this.page.url();
      if (!currentUrl.includes(url.split('/products/')[1]?.split('.html')[0] || '')) {
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await this.page.waitForTimeout(3000);
      }

      // Scroll to reviews section if requested
      if (scrollToReviews) {
        logger.info('   📜 Scrolling to reviews section...');
        await this.scrollToReviews();
      }

      // Wait for reviews container to load
      const reviewsFound = await this.page
        .waitForSelector(this.selectors.product.reviews.container, { timeout: 10000 })
        .then(() => true)
        .catch(() => false);

      if (!reviewsFound) {
        logger.warn('   ⚠️  Reviews section not found');
        return [];
      }

      // Collect reviews across multiple pages
      const allReviews = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= maxPages) {
        logger.info(`   📄 Extracting reviews from page ${currentPage}...`);

        // Wait for reviews to load on current page
        await this.page.waitForTimeout(1500);

        // Extract reviews from current page
        const pageReviews = await this.extractReviewsFromPage();

        if (pageReviews.length === 0) {
          logger.info(`   ℹ️  No reviews found on page ${currentPage}`);
          break;
        }

        // Add unique reviews (avoid duplicates)
        const newReviews = pageReviews.filter(
          review =>
            !allReviews.some(
              existing =>
                existing.reviewer_name === review.reviewer_name &&
                existing.text.substring(0, 50) === review.text.substring(0, 50)
            )
        );

        allReviews.push(...newReviews);
        logger.info(
          `   ✅ Page ${currentPage}: Found ${pageReviews.length} reviews (${newReviews.length} new, ${allReviews.length} total)`
        );

        // Check if we've reached max reviews limit
        if (maxReviews && allReviews.length >= maxReviews) {
          logger.info(`   📊 Reached max reviews limit (${maxReviews})`);
          break;
        } // Try to go to next page
        if (currentPage < maxPages) {
          hasMorePages = await this.goToNextReviewPage();
          if (hasMorePages) {
            currentPage++;
            // Small additional wait for DOM to stabilize
            await this.page.waitForTimeout(500);
          }
        } else {
          hasMorePages = false;
        }
      }

      logger.info(`   ✅ Total reviews scraped: ${allReviews.length}`);
      return maxReviews ? allReviews.slice(0, maxReviews) : allReviews;
    } catch (error) {
      logger.error(`   ❌ Failed to scrape reviews: ${error.message}`);
      return [];
    }
  }

  /**
   * Scroll to reviews section on product page
   * @returns {Promise<void>}
   */
  async scrollToReviews() {
    try {
      // Try to find and scroll to reviews section
      const reviewsSection = await this.page.$(this.selectors.product.reviews.container);

      if (reviewsSection) {
        await reviewsSection.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(1000);
      } else {
        // Fallback: scroll down the page to trigger lazy loading
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight * 0.6);
        });
        await this.page.waitForTimeout(2000);
      }
    } catch (error) {
      logger.warn(`   ⚠️  Failed to scroll to reviews: ${error.message}`);
    }
  }
  /**
   * Extract reviews from current page
   * @returns {Promise<Array>} Array of review objects
   */
  async extractReviewsFromPage() {
    try {
      const html = await this.page.content();
      const $ = cheerio.load(html);
      const reviews = [];

      // Get all review items (excluding seller replies which are inside .seller-reply-wrapper)
      const reviewItems = $('.mod-reviews > .item');
      logger.info(`   🔍 Found ${reviewItems.length} review elements`);

      reviewItems.each((index, element) => {
        try {
          const $review = $(element);

          // Skip if this is a seller reply wrapper (not a customer review)
          if ($review.hasClass('seller-reply-wrapper')) {
            return;
          }

          // Extract rating from stars
          const rating = this.extractReviewRating($, $review);

          // Extract reviewer name
          const reviewerName = this.extractReviewerName($, $review);

          // Extract review date
          const dateText = cleanText($review.find(this.selectors.product.reviewItem.date).text());
          const reviewDate = this.parseReviewDate(dateText);

          // Extract review text
          const reviewText = cleanText(
            $review.find(this.selectors.product.reviewItem.content).first().text()
          );

          // Check verified purchase
          const isVerified = $review.find(this.selectors.product.reviewItem.verified).length > 0;

          // Extract review images
          const images = this.extractReviewImages($, $review);

          // Extract helpful votes (likes)
          const helpfulVotes = this.extractHelpfulVotes($, $review);

          // Extract variant/SKU info
          const variantInfo = cleanText(
            $review.find(this.selectors.product.reviewItem.skuInfo).text()
          );

          // Extract seller reply if exists (it's a sibling element)
          const sellerReply = this.extractSellerReply($, $review);

          // Only add review if it has meaningful content
          if (reviewerName || reviewText) {
            reviews.push({
              reviewer_name: reviewerName || 'Anonymous',
              rating: rating,
              text: reviewText || '',
              review_date: reviewDate,
              verified_purchase: isVerified,
              helpful_votes: helpfulVotes,
              images: images,
              platform_metadata: {
                original_date_text: dateText,
                variant_purchased: variantInfo || null,
                seller_reply: sellerReply,
              },
              sentiment_analysis: { needs_analysis: true },
              is_active: true,
            });
          }
        } catch (itemError) {
          logger.warn(`   ⚠️  Failed to extract review ${index + 1}: ${itemError.message}`);
        }
      });

      return reviews;
    } catch (error) {
      logger.error(`   ❌ Failed to extract reviews from page: ${error.message}`);
      return [];
    }
  }
  /**
   * Extract rating from review element by counting filled stars
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {Cheerio} $review - Cheerio element for the review
   * @returns {number} Rating (1-5)
   */
  extractReviewRating($, $review) {
    try {
      const starsContainer = $review.find(this.selectors.product.reviewItem.starsContainer);
      const stars = starsContainer.find('img.star');
      let rating = 0;

      stars.each((i, star) => {
        const src = $(star).attr('src') || '';
        // Filled star pattern from selectors (TB19ZvEgfDH8KJjy1XcXXcpdXXa = filled star)
        if (src.includes(this.selectors.product.reviewItem.filledStarPattern)) {
          rating++;
        }
      });

      return rating > 0 ? rating : 5; // Default to 5 if can't determine
    } catch (error) {
      return 5;
    }
  }

  /**
   * Extract reviewer name from review element
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {Cheerio} $review - Cheerio element for the review
   * @returns {string} Reviewer name
   */
  extractReviewerName($, $review) {
    try {
      // Author is in .middle > span:first-child according to selectors
      const authorEl = $review.find(this.selectors.product.reviewItem.author);
      let name = cleanText(authorEl.text());

      // Clean up common prefixes
      if (name.startsWith('By ')) {
        name = name.substring(3);
      }

      return name || 'Anonymous';
    } catch (error) {
      return 'Anonymous';
    }
  }

  /**
   * Parse review date from text
   * @param {string} dateText - Date text (e.g., "25 Dec 2024", "2 days ago")
   * @returns {Date} Parsed date
   */
  parseReviewDate(dateText) {
    try {
      if (!dateText) return new Date();

      // Try direct date parsing first
      const directDate = new Date(dateText);
      if (!isNaN(directDate.getTime())) {
        return directDate;
      }

      // Handle relative dates
      const lowerText = dateText.toLowerCase();
      const now = new Date();

      if (lowerText.includes('today') || lowerText.includes('just now')) {
        return now;
      }

      if (lowerText.includes('yesterday')) {
        return new Date(now.setDate(now.getDate() - 1));
      }

      // "X days ago" pattern
      const daysMatch = lowerText.match(/(\d+)\s*days?\s*ago/);
      if (daysMatch) {
        return new Date(now.setDate(now.getDate() - parseInt(daysMatch[1], 10)));
      }

      // "X weeks ago" pattern
      const weeksMatch = lowerText.match(/(\d+)\s*weeks?\s*ago/);
      if (weeksMatch) {
        return new Date(now.setDate(now.getDate() - parseInt(weeksMatch[1], 10) * 7));
      }

      // "X months ago" pattern
      const monthsMatch = lowerText.match(/(\d+)\s*months?\s*ago/);
      if (monthsMatch) {
        return new Date(now.setMonth(now.getMonth() - parseInt(monthsMatch[1], 10)));
      }

      // Try common date formats: "25 Dec 2024", "Dec 25, 2024"
      const datePatterns = [
        /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/, // 25 Dec 2024
        /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/, // Dec 25, 2024
      ];

      for (const pattern of datePatterns) {
        const match = dateText.match(pattern);
        if (match) {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
      }

      return new Date();
    } catch (error) {
      return new Date();
    }
  } /**
   * Extract images from review
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {Cheerio} $review - Cheerio element for the review
   * @returns {Array<string>} Array of image URLs
   */
  extractReviewImages($, $review) {
    const images = [];

    try {
      // Daraz review images use background-image style in .image div
      $review.find(this.selectors.product.reviewItem.imageContainer).each((i, el) => {
        const style = $(el).attr('style') || '';
        const urlMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          images.push(urlMatch[1]); // Just push the URL string
        }
      });

      // Also check for img tags as fallback
      $review.find('.review-image img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !images.includes(src)) {
          images.push(src); // Just push the URL string
        }
      });
    } catch (error) {
      logger.warn(`   ⚠️  Failed to extract review images: ${error.message}`);
    }

    return images;
  }

  /**
   * Extract helpful votes count from review
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {Cheerio} $review - Cheerio element for the review
   * @returns {number} Helpful votes count
   */
  extractHelpfulVotes($, $review) {
    try {
      // Likes are in .left-content > span (the last span contains the count)
      const likesContainer = $review.find('.item-content .left-content');
      const likesText = likesContainer.find('span').last().text();
      const match = likesText.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract seller reply from review if exists
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {Cheerio} $review - Cheerio element for the review
   * @returns {Object|null} Seller reply object or null
   */
  extractSellerReply($, $review) {
    try {
      // Seller reply is a sibling element after the review item
      const replyEl = $review.next('.seller-reply-wrapper');
      if (replyEl.length === 0) return null;

      const content = cleanText(replyEl.find('.item-content .content').text());
      const dateText = cleanText(replyEl.find('.item-title span').text());

      if (!content) return null;

      return {
        content: content,
        date: this.parseReviewDate(dateText),
        original_date_text: dateText,
      };
    } catch (error) {
      return null;
    }
  }
  /**
   * Navigate to next review page
   * @returns {Promise<boolean>} True if navigation successful, false if no more pages
   */
  async goToNextReviewPage() {
    try {
      // Check if next button exists and is enabled
      const nextButton = await this.page.$(this.selectors.product.reviewPagination.nextButton);

      if (!nextButton) {
        logger.info('   ℹ️  No next page button found');
        return false;
      }

      // Get the current first review content to detect when new reviews load
      const firstReviewBefore = await this.page.evaluate(() => {
        const firstReview = document.querySelector('.mod-reviews .item .content');
        return firstReview ? firstReview.textContent.substring(0, 50) : null;
      });

      // Click next button
      await nextButton.click();
      logger.info('   ➡️  Clicked next page button');

      // Wait for reviews to change (since there's no loader, we wait for content change)
      try {
        await this.page.waitForFunction(
          previousContent => {
            const firstReview = document.querySelector('.mod-reviews .item .content');
            const currentContent = firstReview ? firstReview.textContent.substring(0, 50) : null;
            return currentContent !== previousContent;
          },
          { timeout: 10000 },
          firstReviewBefore
        );
        logger.info('   ✅ New reviews loaded');
      } catch (e) {
        // Fallback: just wait a bit
        logger.warn('   ⚠️  Timeout waiting for new reviews, using fallback delay');
        await this.page.waitForTimeout(2000);
      }

      return true;
    } catch (error) {
      logger.warn(`   ⚠️  Failed to navigate to next review page: ${error.message}`);
      return false;
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

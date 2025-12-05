/**
 * Daraz Selectors
 * CSS selectors for extracting data from Daraz.pk pages
 *
 * Data extraction strategy:
 * - PRIMARY: Extract from `__moduleData__` JavaScript variable (contains all product data in JSON)
 * - FALLBACK: HTML parsing with CSS selectors
 *
 * @module scrapers/daraz/selectors
 */

module.exports = {
  // ============================================
  // JAVASCRIPT DATA EXTRACTION
  // ============================================
  javascript: {
    // Main data variable - contains all product info
    moduleData: '__moduleData__',

    // Tracking data variable - contains category, brand, SKU info
    trackingData: 'pdpTrackingData',

    // Data paths within __moduleData__
    paths: {
      // Product info
      product: 'data.root.fields.product',
      productTitle: 'data.root.fields.product.title',
      productBrand: 'data.root.fields.product.brand',
      productDescription: 'data.root.fields.product.desc',
      productHighlights: 'data.root.fields.product.highlights',

      // SKU/Variant info
      productOption: 'data.root.fields.productOption',
      skuBase: 'data.root.fields.productOption.skuBase',
      skuProperties: 'data.root.fields.productOption.skuBase.properties',

      // Images per SKU
      skuGalleries: 'data.root.fields.skuGalleries',

      // Stock/Price per SKU
      skuInfos: 'data.root.fields.skuInfos',

      // Primary identifiers
      primaryKey: 'data.root.fields.primaryKey',
      itemId: 'data.root.fields.primaryKey.itemId',
      skuId: 'data.root.fields.primaryKey.skuId',
      sellerId: 'data.root.fields.primaryKey.sellerId',

      // Tracking data (category, brand)
      tracking: 'data.root.fields.tracking',

      // Review data
      review: 'data.root.fields.review',

      // Seller info
      seller: 'data.root.fields.seller',

      // Specifications (if available)
      specifications: 'data.root.fields.specifications',
    },
  },

  // ============================================
  // PRODUCT DETAIL PAGE - HTML SELECTORS
  // ============================================
  product: {
    // Title
    name: 'h1.pdp-mod-product-badge-title',
    nameAlt: '.pdp-product-title h1',

    // Breadcrumb (for category extraction)
    breadcrumb: '.breadcrumb, .pdp-breadcrumb',
    breadcrumbItems: 'a, span',

    // Brand
    brand: '.pdp-product-brand__brand-link',
    brandAlt: 'a[href*="type=brand"]',

    // Pricing
    price: {
      current: '.pdp-price.pdp-price_type_normal',
      original: '.pdp-price.pdp-price_type_deleted',
      discount: '.pdp-product-price__discount',
      currency: '.pdp-price', // Extract from price text (Rs.)
    },

    // Stock/Availability
    availability: {
      outOfStock: '.quantity-info-sold-out, .sold-out',
      inStock: '.pdp-cart-concern', // If buy buttons exist, in stock
      quantity: '.next-number-picker-input input',
    },

    // Images
    images: {
      main: '.gallery-preview-panel__image',
      gallery: '.item-gallery__thumbnail-image',
      galleryLarge: '.pdp-mod-common-image',
    },

    // Description
    description: {
      container: '#module_product_detail',
      highlights: '.pdp-product-highlights',
      detailContent: '.detail-content',
      fullDescription: '.pdp-product-desc',
    },

    // Specifications
    specifications: {
      container: '.pdp-mod-specification',
      table: '.specification-keys',
      row: '.key-li',
      key: '.key-title',
      value: '.key-value',
      whatsInBox: '.box-content-html',
    },

    // Reviews Summary
    reviews: {
      container: '#module_product_review, .pdp-mod-review',
      averageRating: '.score-average',
      totalRatings: '.pdp-review-summary__link, .count',
      ratingBreakdown: '.mod-rating .detail li',
    }, // Individual Review Items
    reviewItem: {
      container: '.mod-reviews .item',
      // Stars - filled stars have different image URL than empty stars
      starsContainer: '.starCtn',
      stars: '.starCtn img.star',
      // Filled star image pattern (TB19ZvEgfDH8KJjy1XcXXcpdXXa = filled)
      filledStarPattern: 'TB19ZvEgfDH8KJjy1XcXXcpdXXa',
      // Date in top right
      date: '.top .title.right',
      // Author is first span in .middle
      author: '.middle > span:first-child',
      // Verified purchase indicators
      verified: '.verify, .verifyImg',
      // Review text content
      content: '.item-content > .content',
      // Review images use background-image style, not img tags
      imageContainer: '.review-image__item .image',
      // SKU/variant info
      skuInfo: '.skuInfo',
      // Likes count - second span inside .left-content
      likesContainer: '.left-content',
      likes: '.left-content > span:last-child',
      // Seller response (if exists)
      sellerReply: '.seller-reply-wrapper',
      sellerReplyContent: '.seller-reply-wrapper .content',
      sellerReplyDate: '.seller-reply-wrapper .item-title span',
    },

    // Review Pagination
    reviewPagination: {
      container: '.review-pagination',
      pageButtons: '.next-pagination-list .next-pagination-item',
      currentPage: '.next-pagination-item.current',
      nextButton: '.next-pagination-item.next:not([disabled])',
      prevButton: '.next-pagination-item.prev:not([disabled])',
      // Last page number button (excluding ellipsis)
      lastPageButton: '.next-pagination-list button.next-pagination-item:last-of-type',
    },

    // Variants (SKU Selection)
    variants: {
      container: '.sku-selector',
      group: '.sku-prop',
      groupTitle: '.sku-prop-selection .section-title',
      // Image-based variants (colors)
      imageOptions: '.sku-variable-img-wrap, .sku-variable-img-wrap-selected',
      imageSelected: '.sku-variable-img-wrap-selected',
      // Text-based variants (storage, size)
      textOptions: '.sku-variable-name, .sku-variable-name-selected',
      textSelected: '.sku-variable-name-selected',
      optionName: '.sku-name',
    },

    // Seller Info
    seller: {
      container: '.seller-container',
      name: '.seller-name__detail-name',
      badge: '.pdp-seller-badge',
      positiveRating: '.rating-positive',
      shipOnTime: '.info-content .seller-info-value',
      chatResponse: '.info-content:nth-child(3) .seller-info-value',
      storeLink: '.seller-link a',
    },

    // Delivery Info
    delivery: {
      container: '.delivery',
      location: '.location__address',
      standardDelivery: '.delivery-option-item_type_standard .delivery-option-item__time',
      shippingFee: '.delivery-option-item__shipping-fee',
      codAvailable: '.delivery-option-item_type_COD',
    },

    // Warranty/Return
    warranty: {
      container: '.warranty',
      returnPolicy: '.delivery-option-item_type_returnPolicy14',
      warrantyInfo: '.delivery-option-item_type_warranty .delivery-option-item__title',
    },

    // Platform Metadata
    metadata: {
      itemId: '[itemid]',
      sku: '.specification-keys .key-li:has(.key-title:contains("SKU")) .key-value',
    },
  },

  // ============================================
  // PRODUCT LISTING PAGE (Category/Search Results)
  // ============================================
  listing: {
    // Product Grid/List
    productContainer: '[data-tracking="product-card"]',
    productCard: '.Bm3ON, [data-item-id]',

    // Product Link
    productLink: 'a[href*="/products/"]',

    // Product Name
    productName: '.RfADt a, .product-title',

    // Product Image
    productImage: 'img.jBwCF, .picture-wrapper img',

    // Pricing
    currentPrice: '.aBrP0 span, .price-current',
    originalPrice: '.WNoq3 del, .price-original',
    discountBadge: '.IcOsH, .discount-tag',

    // Rating
    rating: '.qzqFw, .rating-stars',
    soldCount: '._1cEkb span, .sold-count',

    // Seller Badge (LazMall, etc)
    sellerBadge: '.e9IMo img, .seller-badge',

    // Free Shipping Badge
    freeShipping: '._2kg2Y, .free-shipping',

    // Pagination
    pagination: {
      container: '.ant-pagination',
      pageItem: '.ant-pagination-item',
      currentPage: '.ant-pagination-item-active',
      nextButton: '.ant-pagination-next:not(.ant-pagination-disabled)',
      prevButton: '.ant-pagination-prev:not(.ant-pagination-disabled)',
      totalPages: '.ant-pagination-item:last-of-type',
    },

    // Sorting/Filters
    sort: {
      container: '.ant-select-selector',
      options: '.ant-select-item-option',
    },

    // Category Filters
    filters: {
      container: '.ant-collapse-content',
      category: '[data-category]',
      brand: '[data-brand]',
      priceRange: '.price-filter',
    },
  },

  // ============================================
  // COMMON SELECTORS
  // ============================================
  common: {
    // Loading indicators
    loading: '.loading, .spinner, [class*="loading"]',

    // Error messages
    error: '.error-message, .not-found',

    // Modal dialogs
    modal: '.ant-modal, .next-dialog',
    modalClose: '.ant-modal-close, .next-dialog-close',

    // Lazy load triggers
    lazyLoad: '.lazyload-wrapper, [data-spm]',
  },
};

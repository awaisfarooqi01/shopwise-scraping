/**
 * PriceOye Selectors
 * CSS selectors for extracting data from PriceOye pages
 * 
 * Note: These selectors are based on common e-commerce patterns
 * They may need adjustment after analyzing actual HTML
 */

module.exports = {
  // ============================================
  // PRODUCT LISTING PAGE (Category/Brand Pages)
  // ============================================
  listing: {
    // Product Cards Container
    productContainer: '.product-list, .products-grid, [class*="product"][class*="list"], [class*="grid"]',
    
    // Individual Product Card
    productCard: '.product-card, .product-item, [class*="product-card"], [data-product-id]',
    
    // Product Link (to detail page)
    productLink: 'a[href*="/mobiles/"]',
    
    // Product Name
    productName: '.product-name, .product-title, h3, h4, [class*="product-name"]',
    
    // Product Image
    productImage: 'img[class*="product"], img[alt], .product-img',
    
    // Current Price
    currentPrice: '.price-current, .current-price, .price-new, [class*="price-current"]',
    
    // Original Price (before discount)
    originalPrice: '.price-old, .price-original, .mrp, [class*="price-old"]',
    
    // Discount Percentage
    discountBadge: '.discount, .sale-badge, .discount-percent, [class*="discount"]',
    
    // Rating
    rating: '.rating, [class*="rating"], [data-rating]',
    ratingValue: '[class*="rating-value"], .stars',
    
    // Review Count
    reviewCount: '.review-count, .reviews, [class*="review"]',
    
    // Pagination
    pagination: {
      container: '.pagination, .page-numbers, [class*="pagination"]',
      nextButton: '.next, .next-page, a[rel="next"], [class*="next"]',
      pageNumbers: '.page-number, .pagination a, [class*="page-"]',
      currentPage: '.current, .active, [class*="active"]',
    }
  },

  // ============================================
  // PRODUCT DETAIL PAGE
  // ============================================
  product: {
    // Basic Information
    name: 'h1, h1.product-title, [class*="product"][class*="title"]',
    
    // Breadcrumbs (for category)
    breadcrumb: '.breadcrumb, [class*="breadcrumb"], nav[aria-label="breadcrumb"]',
    breadcrumbItems: 'a, span',
    
    // Brand
    brand: '[class*="brand"], [data-brand], .manufacturer',
    
    // Pricing
    price: {
      current: '.price-current, .selling-price, [class*="price-current"], [itemprop="price"]',
      original: '.price-original, .mrp, .price-old, [class*="price-old"]',
      discount: '.discount-percent, .save-amount, [class*="discount"]',
      currency: '[itemprop="priceCurrency"]',
    },
    
    // Stock/Availability
    availability: {
      status: '.stock-status, .availability, [class*="stock"], [class*="availability"]',
      inStock: '.in-stock, [class*="in-stock"]',
      outOfStock: '.out-of-stock, [class*="out-stock"]',
    },
    
    // Delivery Information
    delivery: {
      time: '.delivery-time, .shipping-time, [class*="delivery"]',
      cost: '.shipping-cost, .delivery-cost, [class*="shipping-cost"]',
    },
    
    // Images
    images: {
      main: '.main-image, .product-image-main, [class*="main-image"]',
      gallery: '.product-gallery img, .image-gallery img, [class*="gallery"] img',
      thumbnails: '.thumbnails img, .image-thumb img, [class*="thumbnail"] img',
    },
    
    // Videos
    videos: 'video, .product-video, [class*="video"]',
    
    // Description
    description: '.product-description, .description, [class*="description"], [itemprop="description"]',
    
    // Specifications/Features Table
    specifications: {
      table: 'table[class*="spec"], .specifications-table, .product-specs, [class*="specification"]',
      rows: 'tr, .spec-row, [class*="spec-row"]',
      key: 'th, td:first-child, .spec-name, [class*="spec-name"]',
      value: 'td:last-child, .spec-value, [class*="spec-value"]',
      // Alternative: Key-value pairs without table
      list: '.specs-list, .features-list, [class*="specs"]',
      listItem: 'li, .spec-item, [class*="spec-item"]',
    },
    
    // Reviews
    reviews: {
      container: '.reviews, .product-reviews, [class*="review"]',
      rating: '.rating-value, [itemprop="ratingValue"], [class*="rating-value"]',
      count: '.review-count, [itemprop="reviewCount"], [class*="review-count"]',
      stars: '.stars, [class*="star"], [class*="rating"]',
      positivePercent: '.positive-percent, [class*="positive"]',
      
      // Individual reviews
      reviewList: '.review-list, .reviews-list',
      reviewItem: '.review-item, .review, [class*="review-item"]',
      reviewAuthor: '.review-author, .author-name',
      reviewDate: '.review-date, .date',
      reviewText: '.review-text, .review-content',
      reviewRating: '.review-rating',
    },
    
    // Variants (Color, Storage, etc.)
    variants: {
      container: '.variants, .product-variants, [class*="variant"]',
      color: {
        container: '.color-options, .colors, [class*="color"]',
        option: '.color-option, .color-swatch, button, a',
        name: '[data-color], [title]',
      },
      storage: {
        container: '.storage-options, .memory-options, [class*="storage"], [class*="memory"]',
        option: '.storage-option, .memory-option, button, a',
        size: '[data-storage], [data-memory]',
      },
      other: {
        container: '[class*="variant"]',
        option: 'button, a, [class*="option"]',
      }
    },
    
    // Additional Info
    sku: '[class*="sku"], [itemprop="sku"]',
    category: '[class*="category"], [itemprop="category"]',
    tags: '.tags, .product-tags, [class*="tag"]',
    
    // Call-to-Action
    buyButton: '.buy-button, .add-to-cart, [class*="buy"], [class*="cart"]',
    
    // Express Delivery Badge
    expressDelivery: '[class*="express"], [class*="fast-delivery"]',
  },

  // ============================================
  // CATEGORY PAGE SPECIFIC
  // ============================================
  category: {
    // Category Name/Title
    title: 'h1, .category-title, [class*="category"][class*="title"]',
    
    // Product Count
    productCount: '.product-count, .results-count, [class*="count"]',
    
    // Filters/Sidebar
    filters: {
      container: '.filters, .sidebar, [class*="filter"]',
      brandFilter: '[class*="brand"][class*="filter"]',
      priceFilter: '[class*="price"][class*="filter"]',
      ratingFilter: '[class*="rating"][class*="filter"]',
    },
    
    // Sorting
    sort: {
      container: '.sorting, .sort-by, [class*="sort"]',
      dropdown: 'select, [class*="dropdown"]',
      option: 'option',
    },
  },

  // ============================================
  // BRAND PAGE SPECIFIC
  // ============================================
  brand: {
    // Brand Name
    title: 'h1, .brand-title, [class*="brand"][class*="title"]',
    
    // Brand Logo
    logo: '.brand-logo, [class*="brand"][class*="logo"]',
    
    // Brand Description
    description: '.brand-description, [class*="brand"][class*="description"]',
    
    // Product Count
    productCount: '.product-count, [class*="count"]',
  },
  // ============================================
  // REVIEWS PAGE (Dedicated Reviews Page)
  // ============================================
  reviewsPage: {
    // Reviews List Container
    container: '.user-reviews, .section-body',
    
    // Individual Review Items - UPDATED FOR PRICEOYE
    reviewItem: '.review-box',
    
    // Review Details - UPDATED FOR PRICEOYE
    reviewerName: '.user-reivew-name',
    reviewDate: '.review-date',
    reviewRating: '.rating-star',
    reviewText: '.user-reivew-description',
    
    // Verification Badge - UPDATED FOR PRICEOYE
    verifiedPurchase: '.verified-user',
    
    // Helpful Votes
    helpfulVotes: '.helpful-count, .votes, [class*="helpful"]',
    
    // Review Images - UPDATED FOR PRICEOYE
    reviewImages: '.review-images img',
    
    // Pagination
    pagination: {
      container: '.pagination, .page-numbers, [class*="pagination"]',
      nextButton: '.next, .next-page, a[rel="next"], [class*="next"]',
      pageNumbers: '.page-number, .pagination a, [class*="page-"]',
      currentPage: '.current, .active, [class*="active"]',
      lastPage: '.last, [class*="last"]',
    },
    
    // Load More Button (if infinite scroll)
    loadMoreButton: '.load-more, .show-more, [class*="load-more"]',
    
    // Review Stats/Summary
    summary: {
      totalReviews: '.total-reviews, .review-count, [class*="total"]',
      averageRating: '.average-rating, [class*="average"]',
      ratingDistribution: '.rating-distribution, [class*="distribution"]',
    },
  },

  // ============================================
  // MOBILE/RESPONSIVE SPECIFIC
  // ============================================
  mobile: {
    menuToggle: '.menu-toggle, .hamburger, [class*="menu-toggle"]',
    mobileNav: '.mobile-nav, [class*="mobile-nav"]',
    closeButton: '.close, .close-button, [class*="close"]',
  },

  // ============================================
  // COMMON/UTILITY SELECTORS
  // ============================================
  common: {
    // Loading indicators
    loader: '.loader, .loading, [class*="loading"], [class*="spinner"]',
    
    // Error messages
    error: '.error, .error-message, [class*="error"]',
    
    // No results
    noResults: '.no-results, .empty, [class*="no-results"]',
    
    // Success messages
    success: '.success, .success-message, [class*="success"]',
  }
};

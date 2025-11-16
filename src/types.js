/**
 * JSDoc Type Definitions for ShopWise Scraping Service
 * 
 * This file provides TypeScript-like type definitions using JSDoc
 * to enable better IntelliSense and GitHub Copilot suggestions.
 * 
 * @file Type definitions for the scraping service
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * @typedef {Object} ScraperConfig
 * @property {string} platformId - Unique platform identifier (e.g., 'priceoye', 'daraz')
 * @property {string} name - Human-readable platform name
 * @property {string} baseUrl - Base URL of the platform
 * @property {number} rateLimit - Delay between requests (ms)
 * @property {number} maxRetries - Maximum retry attempts
 * @property {number} timeout - Request timeout (ms)
 * @property {string} type - Scraper type: 'static' | 'browser' | 'api'
 * @property {Object.<string, string>} selectors - CSS selectors for data extraction
 */

/**
 * @typedef {Object} Product
 * @property {string} platform - Platform identifier
 * @property {string} platformProductId - Platform-specific product ID
 * @property {string} name - Product name
 * @property {string} slug - URL-friendly slug
 * @property {string} [description] - Product description
 * @property {string} normalizedBrand - Normalized brand name from backend
 * @property {string} originalBrand - Original brand from platform
 * @property {string[]} normalizedCategories - Normalized category IDs
 * @property {string[]} originalCategories - Original categories from platform
 * @property {PriceInfo} price - Current price information
 * @property {Image[]} images - Product images
 * @property {Specification[]} [specifications] - Technical specifications
 * @property {string} url - Product URL
 * @property {Availability} availability - Stock availability
 * @property {Rating} [rating] - Product ratings
 * @property {Object} [metadata] - Additional platform-specific data
 * @property {Date} scrapedAt - When data was scraped
 */

/**
 * @typedef {Object} PriceInfo
 * @property {number} current - Current price
 * @property {number} [original] - Original price (before discount)
 * @property {number} [discount] - Discount amount
 * @property {number} [discountPercentage] - Discount percentage
 * @property {string} currency - Currency code (e.g., 'PKR')
 */

/**
 * @typedef {Object} Image
 * @property {string} url - Image URL
 * @property {string} type - Image type: 'main' | 'thumbnail' | 'gallery'
 * @property {number} [order] - Display order
 */

/**
 * @typedef {Object} Specification
 * @property {string} key - Specification name
 * @property {string} value - Specification value
 * @property {string} [category] - Spec category (e.g., 'Display', 'Camera')
 */

/**
 * @typedef {Object} Availability
 * @property {boolean} inStock - Whether product is in stock
 * @property {string} status - Status: 'in_stock' | 'out_of_stock' | 'pre_order' | 'discontinued'
 * @property {number} [quantity] - Available quantity (if provided)
 * @property {string} [restockDate] - Expected restock date
 */

/**
 * @typedef {Object} Rating
 * @property {number} average - Average rating (0-5)
 * @property {number} count - Number of ratings
 * @property {Object.<string, number>} [distribution] - Rating distribution
 */

/**
 * @typedef {Object} Review
 * @property {string} platform - Platform identifier
 * @property {string} platformProductId - Platform-specific product ID
 * @property {string} platformReviewId - Platform-specific review ID
 * @property {string} [author] - Reviewer name
 * @property {number} rating - Review rating (1-5)
 * @property {string} [title] - Review title
 * @property {string} comment - Review text
 * @property {Date} date - Review date
 * @property {boolean} [verified] - Verified purchase
 * @property {number} [helpful] - Helpful votes
 * @property {Date} scrapedAt - When data was scraped
 */

// ============================================================================
// NORMALIZATION TYPES
// ============================================================================

/**
 * @typedef {Object} BrandNormalizationRequest
 * @property {string} brandName - Brand name to normalize
 * @property {string} platformId - Platform identifier
 * @property {boolean} [autoLearn=false] - Auto-create if not found
 */

/**
 * @typedef {Object} BrandNormalizationResponse
 * @property {boolean} success - Whether normalization succeeded
 * @property {string} normalizedBrand - Normalized brand name
 * @property {string} brandId - Brand ID in backend
 * @property {boolean} isNew - Whether brand was newly created
 * @property {number} confidence - Confidence score (0-100)
 */

/**
 * @typedef {Object} CategoryMappingRequest
 * @property {string} platformId - Platform identifier
 * @property {string} platformCategory - Platform category path/name
 * @property {boolean} [autoCreate=false] - Auto-create mapping if not found
 */

/**
 * @typedef {Object} CategoryMappingResponse
 * @property {boolean} success - Whether mapping succeeded
 * @property {string} categoryId - Backend category ID
 * @property {string} categoryPath - Full category path
 * @property {boolean} isNew - Whether mapping was newly created
 */

// ============================================================================
// SCRAPER TYPES
// ============================================================================

/**
 * @typedef {Object} ScrapeOptions
 * @property {number} [page=1] - Page number for pagination
 * @property {number} [limit=20] - Items per page
 * @property {string} [category] - Category filter
 * @property {string} [searchQuery] - Search query
 * @property {Object.<string, any>} [filters] - Additional filters
 * @property {boolean} [includeReviews=false] - Include reviews
 * @property {boolean} [forceRefresh=false] - Bypass cache
 */

/**
 * @typedef {Object} ScrapeResult
 * @property {boolean} success - Whether scraping succeeded
 * @property {Product[]} products - Scraped products
 * @property {Review[]} [reviews] - Scraped reviews
 * @property {PaginationInfo} [pagination] - Pagination information
 * @property {ScrapeMetrics} metrics - Scraping metrics
 * @property {Error[]} [errors] - Any errors encountered
 */

/**
 * @typedef {Object} PaginationInfo
 * @property {number} currentPage - Current page number
 * @property {number} totalPages - Total pages available
 * @property {number} totalItems - Total items available
 * @property {boolean} hasNext - Whether next page exists
 * @property {boolean} hasPrevious - Whether previous page exists
 */

/**
 * @typedef {Object} ScrapeMetrics
 * @property {number} duration - Time taken (ms)
 * @property {number} itemsScraped - Number of items scraped
 * @property {number} itemsSuccessful - Successfully processed items
 * @property {number} itemsFailed - Failed items
 * @property {number} retries - Number of retries
 * @property {number} cacheHits - Cache hits
 * @property {number} cacheMisses - Cache misses
 */

// ============================================================================
// PIPELINE TYPES
// ============================================================================

/**
 * @typedef {Object} PipelineStage
 * @property {string} name - Stage name
 * @property {function(any): Promise<any>} process - Processing function
 * @property {function(any): Promise<boolean>} [validate] - Validation function
 * @property {Object} [options] - Stage options
 */

/**
 * @typedef {Object} PipelineResult
 * @property {boolean} success - Whether pipeline succeeded
 * @property {any} data - Processed data
 * @property {Object[]} stages - Stage execution details
 * @property {number} duration - Total duration (ms)
 * @property {Error[]} [errors] - Pipeline errors
 */

// ============================================================================
// QUEUE TYPES
// ============================================================================

/**
 * @typedef {Object} JobData
 * @property {string} type - Job type: 'scrape_product' | 'scrape_category' | 'scrape_reviews'
 * @property {string} platform - Platform identifier
 * @property {string} [productId] - Product ID to scrape
 * @property {string} [categoryUrl] - Category URL to scrape
 * @property {ScrapeOptions} [options] - Scraping options
 * @property {Object} [metadata] - Additional job metadata
 */

/**
 * @typedef {Object} JobOptions
 * @property {number} priority - Job priority (1-10, higher = more important)
 * @property {number} attempts - Maximum retry attempts
 * @property {number} backoff - Backoff delay (ms)
 * @property {number} timeout - Job timeout (ms)
 * @property {boolean} removeOnComplete - Remove job when complete
 * @property {boolean} removeOnFail - Remove job when failed
 */

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * @typedef {Object} CacheOptions
 * @property {number} ttl - Time to live (seconds)
 * @property {string} [prefix] - Key prefix
 * @property {boolean} [compress] - Compress data
 */

/**
 * @typedef {Object} ProxyConfig
 * @property {string} host - Proxy host
 * @property {number} port - Proxy port
 * @property {string} [username] - Proxy username
 * @property {string} [password] - Proxy password
 * @property {string} protocol - Protocol: 'http' | 'https' | 'socks5'
 * @property {string[]} [countries] - Allowed countries
 */

/**
 * @typedef {Object} HealthCheck
 * @property {boolean} healthy - Overall health status
 * @property {Date} timestamp - Check timestamp
 * @property {Object.<string, boolean>} services - Individual service status
 * @property {Object.<string, number>} metrics - Health metrics
 */

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * @typedef {Object} ScraperError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {string} platform - Platform where error occurred
 * @property {string} [url] - URL being scraped
 * @property {number} [statusCode] - HTTP status code
 * @property {boolean} retryable - Whether error is retryable
 * @property {Object} [context] - Additional error context
 */

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * @typedef {Object} Logger
 * @property {function(string, ...any): void} info - Log info message
 * @property {function(string, ...any): void} warn - Log warning
 * @property {function(string, ...any): void} error - Log error
 * @property {function(string, ...any): void} debug - Log debug info
 */

/**
 * @typedef {Object} DatabaseConnection
 * @property {boolean} isConnected - Connection status
 * @property {function(): Promise<void>} connect - Connect to database
 * @property {function(): Promise<void>} disconnect - Disconnect from database
 * @property {function(): Promise<boolean>} healthCheck - Check health
 * @property {function(): Object} getStatus - Get connection status
 */

// Export types for JSDoc use
module.exports = {};

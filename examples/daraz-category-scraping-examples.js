/**
 * Example: Scraping Daraz Categories
 *
 * This script demonstrates how to use the new category scraping feature
 * to extract products from entire categories or search queries.
 */

const DarazScraper = require('../src/scrapers/daraz/daraz-scraper');
const databaseService = require('../src/services/database-service');
const { logger } = require('../src/utils/logger');

/**
 * Example 1: Basic category scraping
 */
async function example1_basicCategoryScraping() {
  const scraper = new DarazScraper();

  try {
    await databaseService.connect();
    await scraper.initialize();

    // Scrape a small category (iPhone 15)
    const products = await scraper.scrapeCategoryByUrl('https://www.daraz.pk/catalog?q=iphone+15');

    console.log(`Scraped ${products.length} products`);
  } finally {
    await scraper.close();
    await databaseService.disconnect();
  }
}

/**
 * Example 2: Category scraping with custom options
 */
async function example2_categoryScraping_withOptions() {
  const scraper = new DarazScraper();

  try {
    await databaseService.connect();
    await scraper.initialize();

    const products = await scraper.scrapeCategoryByUrl(
      'https://www.daraz.pk/catalog?q=Smart+Phones',
      {
        maxPages: 3, // Only first 3 listing pages
        maxProducts: 20, // Stop after 20 products
        includeReviews: true, // Include reviews
        maxReviewPages: 2, // Only 2 review pages per product
        name: 'Smart Phones', // Custom name for logging
      }
    );

    console.log(`Scraped ${products.length} products with reviews`);
  } finally {
    await scraper.close();
    await databaseService.disconnect();
  }
}

/**
 * Example 3: Quick scraping without reviews (faster)
 */
async function example3_quickScraping_noReviews() {
  const scraper = new DarazScraper();

  try {
    await databaseService.connect();
    await scraper.initialize();

    const products = await scraper.scrapeCategoryByUrl(
      'https://www.daraz.pk/catalog?q=Wireless+Earbuds',
      {
        maxPages: 2,
        maxProducts: 15,
        includeReviews: false, // Skip reviews for faster scraping
      }
    );

    console.log(`Quickly scraped ${products.length} products (no reviews)`);
  } finally {
    await scraper.close();
    await databaseService.disconnect();
  }
}

/**
 * Example 4: Scraping multiple categories sequentially
 */
async function example4_multipleCategories() {
  const scraper = new DarazScraper();

  try {
    await databaseService.connect();
    await scraper.initialize();

    const categories = [
      'https://www.daraz.pk/catalog?q=iPhone+15',
      'https://www.daraz.pk/catalog?q=Samsung+Galaxy+S24',
      'https://www.daraz.pk/catalog?q=Xiaomi+Redmi',
    ];

    const allProducts = [];

    for (const categoryUrl of categories) {
      const products = await scraper.scrapeCategoryByUrl(categoryUrl, {
        maxPages: 1,
        maxProducts: 5,
        includeReviews: false,
      });

      allProducts.push(...products);

      // Delay between categories (anti-bot)
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`Total products scraped: ${allProducts.length}`);
  } finally {
    await scraper.close();
    await databaseService.disconnect();
  }
}

/**
 * Example 5: Large-scale scraping with batching
 */
async function example5_largeCategoryScraping() {
  const scraper = new DarazScraper();

  try {
    await databaseService.connect();
    await scraper.initialize();

    // For large categories, scrape in batches to avoid timeouts
    // This will scrape 100 products from "Mobiles" category
    const products = await scraper.scrapeCategoryByUrl('https://www.daraz.pk/catalog?q=Mobiles', {
      maxPages: 5, // 5 pages × ~24 products = ~120 products
      maxProducts: 100, // But limit to 100
      includeReviews: true, // Include reviews
      maxReviewPages: 3, // 3 review pages per product
      name: 'All Mobiles',
    });

    console.log(`Large-scale scraping: ${products.length} products`);

    // Calculate statistics
    const withReviews = products.filter(p => p.reviews && p.reviews.length > 0);
    console.log(`Products with reviews: ${withReviews.length}`);
  } finally {
    await scraper.close();
    await databaseService.disconnect();
  }
}

// Run examples
// Uncomment the example you want to run:

// example1_basicCategoryScraping();
// example2_categoryScraping_withOptions();
// example3_quickScraping_noReviews();
// example4_multipleCategories();
// example5_largeCategoryScraping();

module.exports = {
  example1_basicCategoryScraping,
  example2_categoryScraping_withOptions,
  example3_quickScraping_noReviews,
  example4_multipleCategories,
  example5_largeCategoryScraping,
};

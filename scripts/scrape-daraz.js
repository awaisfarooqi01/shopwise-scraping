/**
 * Daraz Full Scraper Script
 *
 * This script scrapes all products from Daraz based on the configuration
 * in daraz-categories.json. It supports:
 * - Category scraping with pagination
 * - Optional review scraping for each product
 * - Progress tracking and resume functionality
 * - CI/CD integration (GitHub Actions)
 *
 * Usage:
 *   node scripts/scrape-daraz.js                     # Scrape all enabled categories
 *   node scripts/scrape-daraz.js --category "Phone Cases" # Scrape specific category
 *   node scripts/scrape-daraz.js --dry-run           # Show what would be scraped without scraping
 *   node scripts/scrape-daraz.js --resume            # Resume from last failed category
 *   node scripts/scrape-daraz.js --with-reviews      # Include review scraping
 *   node scripts/scrape-daraz.js --max-pages 5       # Limit pages per category
 *   node scripts/scrape-daraz.js --max-products 50   # Limit products per category
 *
 * @module scripts/scrape-daraz
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const DarazScraper = require('../src/scrapers/daraz/daraz-scraper');
const { logger } = require('../src/utils/logger');

// Load configuration
const configPath = path.join(__dirname, '../src/scrapers/daraz/daraz-categories.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Progress tracking file
const progressPath = path.join(__dirname, '../data/daraz-scrape-progress.json');

// Statistics
const stats = {
  startTime: null,
  endTime: null,
  categoriesProcessed: 0,
  totalProductsScraped: 0,
  totalReviewsScraped: 0,
  errors: [],
  skipped: [],
};

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    category: null,
    dryRun: false,
    resume: false,
    help: false,
    ci: false,
    withReviews: true, // Default: scrape reviews with products
    maxPages: null, // null = unlimited (scrape all pages)
    maxProducts: null, // null = unlimited (scrape all products)
    maxReviewPages: null, // null = unlimited (scrape all review pages)
    startPage: 1, // Starting page number (1-indexed)
    endPage: null, // Ending page number (null = unlimited)
    noReviews: false, // Explicitly disable reviews
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--category':
      case '-c':
        options.category = args[++i];
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--resume':
      case '-r':
        options.resume = true;
        break;
      case '--ci':
        options.ci = true;
        break;
      case '--with-reviews':
      case '-w':
        options.withReviews = true;
        break;
      case '--no-reviews':
        options.noReviews = true;
        options.withReviews = false;
        break;
      case '--max-pages':
      case '-p':
        options.maxPages = parseInt(args[++i], 10) || 10;
        break;
      case '--max-products':
      case '-m':
        options.maxProducts = parseInt(args[++i], 10) || null;
        break;
      case '--max-review-pages':
        options.maxReviewPages = parseInt(args[++i], 10) || 3;
        break;
      case '--start-page':
      case '-s':
        options.startPage = parseInt(args[++i], 10) || 1;
        break;
      case '--end-page':
      case '-e':
        options.endPage = parseInt(args[++i], 10) || null;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  // Auto-detect CI environment
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    options.ci = true;
  }

  // If --no-reviews is not set, withReviews defaults to true
  if (!options.noReviews) {
    options.withReviews = true;
  }

  return options;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                      Daraz Full Scraper Script                          ║
╚══════════════════════════════════════════════════════════════════════════╝

Usage: node scripts/scrape-daraz.js [options]

Options:
  --category, -c <name>     Scrape specific category only
  --dry-run, -d             Show what would be scraped without actually scraping
  --resume, -r              Resume from last failed/incomplete scrape
  --ci                      CI mode - no prompts, auto-detected in GitHub Actions
  --with-reviews, -w        Include review scraping for each product (default: enabled)
  --no-reviews              Disable review scraping
  --max-pages, -p <num>     Maximum listing pages per category (default: unlimited)
  --max-products, -m <num>  Maximum products per category (default: unlimited)
  --max-review-pages <num>  Maximum review pages per product (default: unlimited)
  --start-page, -s <num>    Starting page number (default: 1, for pagination splits)
  --end-page, -e <num>      Ending page number (default: unlimited, for pagination splits)
  --help, -h                Show this help message

Examples:
  node scripts/scrape-daraz.js                           # Scrape all categories
  node scripts/scrape-daraz.js --category "Phone Cases"  # Only Phone Cases
  node scripts/scrape-daraz.js --with-reviews            # Include reviews
  node scripts/scrape-daraz.js --no-reviews              # Disable reviews
  node scripts/scrape-daraz.js --max-pages 3             # Limited scrape
  node scripts/scrape-daraz.js --dry-run                 # Preview mode
  node scripts/scrape-daraz.js --resume                  # Resume interrupted scrape
  
  # Pagination splits for large categories (GitHub Actions):
  node scripts/scrape-daraz.js -c "Phone Cases" --start-page 1 --end-page 200
  node scripts/scrape-daraz.js -c "Phone Cases" --start-page 201 --end-page 400
  node scripts/scrape-daraz.js -c "Phone Cases" --start-page 401 --end-page 600

Environment Variables:
  CI=true                   Auto-enables CI mode
  GITHUB_ACTIONS=true       Auto-enables CI mode
  MONGODB_URI               MongoDB connection string (required)

Configuration: src/scrapers/daraz/daraz-categories.json

GitHub Actions:
  For large categories (40k+ products), use pagination splits:
  - Each 200 pages ~= 8000 products (~3-4 hours with reviews)
  - Split into multiple workflow jobs using --start-page/--end-page
  `);
}

/**
 * Load progress from file (for resume functionality)
 * @returns {Object} Progress data
 */
function loadProgress() {
  try {
    if (fs.existsSync(progressPath)) {
      return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    }
  } catch (error) {
    logger.warn('Could not load progress file:', error.message);
  }
  return { completedCategories: [], lastCategory: null, timestamp: null };
}

/**
 * Save progress to file
 * @param {Object} progress - Progress data to save
 */
function saveProgress(progress) {
  try {
    const dir = path.dirname(progressPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    progress.timestamp = new Date().toISOString();
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
  } catch (error) {
    logger.warn('Could not save progress:', error.message);
  }
}

/**
 * Clear progress file (on successful completion)
 */
function clearProgress() {
  try {
    if (fs.existsSync(progressPath)) {
      fs.unlinkSync(progressPath);
      logger.info('Progress file cleared');
    }
  } catch (error) {
    logger.warn('Could not clear progress file:', error.message);
  }
}

/**
 * Build list of categories to scrape based on options
 * @param {Object} options - Parsed command line options
 * @param {Object} progress - Progress data for resume functionality
 * @returns {Array} List of categories to scrape
 */
function buildScrapeList(options, progress) {
  const scrapeList = [];

  // Sort categories by priority
  const sortedCategories = [...config.categories].sort((a, b) => a.priority - b.priority);

  for (const category of sortedCategories) {
    // Skip disabled categories
    if (!category.enabled) {
      stats.skipped.push({ name: category.name, reason: 'disabled' });
      continue;
    }

    // Filter by category name if specified
    if (options.category && category.name.toLowerCase() !== options.category.toLowerCase()) {
      continue;
    }

    // Skip if already completed (resume mode)
    if (options.resume && progress.completedCategories.includes(category.name)) {
      stats.skipped.push({ name: category.name, reason: 'already completed' });
      continue;
    }

    scrapeList.push({
      name: category.name,
      url: category.base,
      priority: category.priority,
    });
  }

  return scrapeList;
}

/**
 * Display scrape plan (dry run or confirmation)
 * @param {Array} scrapeList - List of categories to scrape
 * @param {Object} options - Parsed command line options
 */
function displayScrapePlan(scrapeList, options) {
  console.log('\n' + '═'.repeat(70));
  console.log('📋 SCRAPE PLAN');
  console.log('═'.repeat(70));
  console.log(`\n📊 Summary:`);
  console.log(`   Categories to scrape: ${scrapeList.length}`);
  console.log(`   Start page: ${options.startPage}`);
  console.log(`   End page: ${options.endPage || 'unlimited'}`);
  console.log(`   Max pages per category: ${options.maxPages || 'unlimited'}`);
  console.log(`   Max products per category: ${options.maxProducts || 'unlimited'}`);
  console.log(`   Include reviews: ${options.withReviews ? 'Yes' : 'No'}`);
  if (options.withReviews) {
    console.log(`   Max review pages per product: ${options.maxReviewPages || 'unlimited'}`);
  }

  // Show page range info if specified
  if (options.startPage > 1 || options.endPage) {
    const pageRange = options.endPage
      ? `pages ${options.startPage}-${options.endPage}`
      : `pages ${options.startPage}+`;
    console.log(`\n🔢 Page Range Mode: ${pageRange}`);
    console.log(`   This is useful for splitting large categories across multiple runs.`);
  }

  console.log(`\n📍 Categories to scrape:`);
  scrapeList.forEach((item, index) => {
    console.log(`   ${index + 1}. 📁 ${item.name} (Priority: ${item.priority})`);
    console.log(`      ${item.url.substring(0, 80)}...`);
  });

  if (stats.skipped.length > 0) {
    console.log(`\n⏭️  Skipped (${stats.skipped.length}):`);
    stats.skipped.forEach(item => {
      console.log(`   • ${item.name}: ${item.reason}`);
    });
  }

  console.log('\n' + '═'.repeat(70));
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Display final summary
 */
function displayFinalSummary() {
  const duration = stats.endTime - stats.startTime;

  console.log('\n' + '═'.repeat(70));
  console.log('📊 FINAL SCRAPING SUMMARY');
  console.log('═'.repeat(70));

  console.log(`\n⏱️  Duration: ${formatDuration(duration)}`);
  console.log(`📁 Categories processed: ${stats.categoriesProcessed}`);
  console.log(`📦 Total products scraped: ${stats.totalProductsScraped}`);
  console.log(`💬 Total reviews scraped: ${stats.totalReviewsScraped}`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`);
    stats.errors.forEach(err => {
      console.log(`   • ${err.name}: ${err.error}`);
    });
    console.log('\n💡 Use --resume flag to retry failed categories');
  } else {
    console.log('\n✅ All categories scraped successfully!');
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 SCRAPING COMPLETE');
  console.log('═'.repeat(70));
}

/**
 * Main scraping function
 * @param {Object} options - Parsed command line options
 */
async function scrapeAll(options) {
  let scraper = null;
  const progress = options.resume ? loadProgress() : { completedCategories: [] };

  try {
    // Build scrape list
    const scrapeList = buildScrapeList(options, progress);

    if (scrapeList.length === 0) {
      console.log('\n⚠️  No categories to scrape based on current options.');
      if (options.category) {
        console.log(`   Category "${options.category}" not found or already completed.`);
      }
      if (options.resume) {
        console.log(
          `   All categories may have been completed. Use without --resume to start fresh.`
        );
      }
      return;
    }

    // Display plan
    displayScrapePlan(scrapeList, options);

    // If dry run, stop here
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No actual scraping performed.');
      console.log('   Remove --dry-run flag to start scraping.\n');
      return;
    }

    // Confirmation prompt (skip in CI mode)
    if (options.ci) {
      console.log('\n🤖 CI MODE - Starting scrape immediately...\n');
    } else {
      console.log('\n⚠️  This will scrape all categories listed above.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Connect to database
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Initialize scraper
    console.log('🔧 Initializing Daraz scraper...');
    scraper = new DarazScraper();
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');

    stats.startTime = new Date();

    // Process each category
    for (let i = 0; i < scrapeList.length; i++) {
      const category = scrapeList[i];

      console.log('\n' + '═'.repeat(70));
      console.log(`📍 [${i + 1}/${scrapeList.length}] Scraping: ${category.name}`);
      console.log('═'.repeat(70));
      console.log(`   URL: ${category.url}`);
      console.log(`   Priority: ${category.priority}`);

      try {
        // Scrape category
        const products = await scraper.scrapeCategoryByUrl(category.url, {
          maxPages: options.maxPages,
          maxProducts: options.maxProducts,
          includeReviews: options.withReviews,
          maxReviewPages: options.maxReviewPages,
          startPage: options.startPage,
          endPage: options.endPage,
          name: category.name,
        });

        stats.totalProductsScraped += products.length;
        stats.categoriesProcessed++;

        // Mark category as completed
        progress.completedCategories.push(category.name);
        progress.lastCategory = category.name;

        console.log(`   ✅ Scraped ${products.length} products from ${category.name}`);

        // Save progress after each successful category
        saveProgress(progress);

        // Delay between categories (anti-bot measure)
        const delay = config.settings?.delayBetweenCategories || 5000;
        if (i < scrapeList.length - 1) {
          console.log(`   ⏳ Waiting ${delay / 1000}s before next category...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        logger.error(`Failed to scrape ${category.name}:`, error);
        stats.errors.push({
          name: category.name,
          url: category.url,
          error: error.message,
        });

        // Check if we should continue on error
        const continueOnError = config.settings?.continueOnError !== false;
        if (!continueOnError) {
          throw error;
        }

        console.log(`   ❌ Failed: ${error.message}`);
        console.log(`   ⏩ Continuing with next category...`);
      }
    }

    stats.endTime = new Date();

    // Clear progress on successful completion
    if (stats.errors.length === 0) {
      clearProgress();
    }

    // Display final summary
    displayFinalSummary();
  } catch (error) {
    logger.error('Scraping failed:', error);
    console.error('\n❌ Scraping failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (scraper) {
      try {
        await scraper.close();
        console.log('\n🔒 Scraper closed');
      } catch (e) {
        logger.warn('Failed to close scraper:', e.message);
      }
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('👋 Database connection closed');
    }
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

const options = parseArgs();

if (options.help) {
  showHelp();
  process.exit(0);
}

console.log('\n' + '╔'.padEnd(69, '═') + '╗');
console.log('║' + '          🛒 Daraz Full Product Scraper          '.padEnd(68) + '║');
console.log('╚'.padEnd(69, '═') + '╝');

scrapeAll(options).catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});

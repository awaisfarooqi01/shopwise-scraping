/**
 * Daraz Full Scraper Script
 * 
 * This script scrapes all products from Daraz.pk based on the configuration
 * in daraz-categories.json. It scrapes category/search URLs and extracts
 * individual product details + ALL reviews (no review limit).
 * 
 * Usage:
 *   node scripts/scrape-daraz.js                           # Scrape all enabled categories
 *   node scripts/scrape-daraz.js --category "Phone Cases"  # Scrape specific category
 *   node scripts/scrape-daraz.js --dry-run                 # Show what would be scraped without scraping
 *   node scripts/scrape-daraz.js --resume                  # Resume from last failed category
 *   node scripts/scrape-daraz.js --max-pages 5             # Limit listing pages per category
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
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    category: null,
    dryRun: false,
    resume: false,
    help: false,
    ci: false,
    maxPages: 10,
    startPage: 1,
    endPage: null,
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
      case '--max-pages':
      case '-m':
        options.maxPages = parseInt(args[++i], 10);
        break;

      case '--start-page':
        options.startPage = parseInt(args[++i], 10);
        break;
      case '--end-page':
        options.endPage = parseInt(args[++i], 10);
        break;
      case '--ci':
        options.ci = true;
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

  return options;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                       Daraz Full Scraper Script                        ║
╚══════════════════════════════════════════════════════════════════════════╝

Usage: node scripts/scrape-daraz.js [options]

Options:
  --category, -c <name>       Scrape specific category only
  --dry-run, -d               Show what would be scraped without actually scraping
  --resume, -r                Resume from last failed/incomplete scrape
  --max-pages, -m <number>    Maximum listing pages per category (default: 10)
  --start-page <number>       Starting page number (default: 1)
  --end-page <number>         Ending page number (default: unlimited)
  --ci                        CI mode - no prompts, auto-detected in GitHub Actions
  --help, -h                  Show this help message

Note: ALL product reviews are always scraped (no limit).

Examples:
  node scripts/scrape-daraz.js                                 # Scrape everything
  node scripts/scrape-daraz.js --category "Phone Cases"        # Only Phone Cases
  node scripts/scrape-daraz.js --category "Car Mounts" -m 3    # Car Mounts, max 3 pages
  node scripts/scrape-daraz.js --dry-run                       # Preview mode

Environment Variables:
  CI=true                 Auto-enables CI mode
  GITHUB_ACTIONS=true     Auto-enables CI mode

Configuration: src/scrapers/daraz/daraz-categories.json
  `);
}

/**
 * Load progress from file (for resume functionality)
 */
function loadProgress() {
  try {
    if (fs.existsSync(progressPath)) {
      return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    }
  } catch (error) {
    logger.warn('Could not load progress file:', error.message);
  }
  return { completedCategories: [] };
}

/**
 * Save progress to file
 */
function saveProgress(progress) {
  try {
    const dir = path.dirname(progressPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
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
    }
  } catch (error) {
    logger.warn('Could not clear progress file:', error.message);
  }
}

/**
 * Build list of categories to scrape based on options
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
      categoryName: category.name,
      url: category.base,
      priority: category.priority,
    });
  }

  return scrapeList;
}

/**
 * Display scrape plan (dry run or confirmation)
 */
function displayScrapePlan(scrapeList, options) {
  console.log('\n' + '═'.repeat(70));
  console.log('📋 DARAZ SCRAPE PLAN');
  console.log('═'.repeat(70));

  console.log(`\n📊 Summary:`);
  console.log(`   Categories to scrape: ${scrapeList.length}`);
  console.log(`   Max listing pages per category: ${options.maxPages}`);
  console.log(`   Reviews: All (no limit)`);
  if (options.startPage > 1 || options.endPage) {
    console.log(`   Page range: ${options.startPage}${options.endPage ? `-${options.endPage}` : '+'}`);
  }

  console.log(`\n📍 Categories to scrape:`);
  scrapeList.forEach((item, index) => {
    console.log(`   ${index + 1}. 📁 ${item.categoryName}`);
    console.log(`      ${item.url}`);
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
 * Main scraping function
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
        console.log(`   Available categories:`);
        config.categories
          .filter(c => c.enabled)
          .forEach(c => console.log(`     - ${c.name}`));
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
      const item = scrapeList[i];

      console.log('\n' + '═'.repeat(70));
      console.log(`📍 [${i + 1}/${scrapeList.length}] Scraping: ${item.categoryName}`);
      console.log('═'.repeat(70));
      console.log(`   URL: ${item.url}`);

      try {
        const products = await scraper.scrapeCategoryByUrl(item.url, {
          maxPages: options.maxPages,
          includeReviews: true,
          maxReviewPages: 9999,
          name: item.categoryName,
          startPage: options.startPage,
          endPage: options.endPage,
        });

        const productCount = products ? products.length : 0;
        stats.totalProductsScraped += productCount;
        stats.categoriesProcessed++;
        progress.completedCategories.push(item.categoryName);

        console.log(`   ✅ Scraped ${productCount} products from ${item.categoryName}`);

        // Save progress after each successful scrape
        saveProgress(progress);

        // Delay between categories
        const delay = config.settings.delayBetweenCategories || 5000;
        if (i < scrapeList.length - 1) {
          console.log(`   ⏳ Waiting ${delay / 1000}s before next category...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        logger.error(`Failed to scrape ${item.categoryName}:`, error);
        stats.errors.push({
          url: item.url,
          name: item.categoryName,
          error: error.message,
        });

        if (!config.settings.continueOnError) {
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
      await scraper.close();
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n👋 Database connection closed');
    }
  }
}

/**
 * Display final summary
 */
function displayFinalSummary() {
  const duration = stats.endTime - stats.startTime;
  const durationMinutes = Math.floor(duration / 60000);
  const durationSeconds = Math.floor((duration % 60000) / 1000);

  console.log('\n' + '═'.repeat(70));
  console.log('📊 FINAL SCRAPING SUMMARY');
  console.log('═'.repeat(70));

  console.log(`\n⏱️  Duration: ${durationMinutes}m ${durationSeconds}s`);
  console.log(`📁 Categories processed: ${stats.categoriesProcessed}`);
  console.log(`📦 Total products scraped: ${stats.totalProductsScraped}`);

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
  console.log('🎉 DARAZ SCRAPING COMPLETE');
  console.log('═'.repeat(70));
}

// Main execution
const options = parseArgs();

if (options.help) {
  showHelp();
  process.exit(0);
}

console.log('\n' + '╔'.padEnd(69, '═') + '╗');
console.log('║' + '        🛒 Daraz Full Product Scraper              '.padEnd(68) + '║');
console.log('╚'.padEnd(69, '═') + '╝');

scrapeAll(options).catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});

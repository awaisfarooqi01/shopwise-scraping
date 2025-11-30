/**
 * PriceOye Full Scraper Script
 * 
 * This script scrapes all products from PriceOye based on the configuration
 * in priceoye-categories.json. It can scrape:
 * - Entire categories (when brands array is empty)
 * - Specific brands within categories (when brands are specified)
 * 
 * Usage:
 *   node scripts/scrape-priceoye.js                    # Scrape all enabled categories
 *   node scripts/scrape-priceoye.js --category Mobiles # Scrape specific category
 *   node scripts/scrape-priceoye.js --brand samsung    # Scrape specific brand across all categories
 *   node scripts/scrape-priceoye.js --dry-run          # Show what would be scraped without scraping
 *   node scripts/scrape-priceoye.js --resume           # Resume from last failed category
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const { logger } = require('../src/utils/logger');

// Load configuration
const configPath = path.join(__dirname, '../src/scrapers/priceoye/priceoye-categories.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Progress tracking file
const progressPath = path.join(__dirname, '../data/scrape-progress.json');

// Statistics
const stats = {
  startTime: null,
  endTime: null,
  categoriesProcessed: 0,
  brandsProcessed: 0,
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
    brand: null,
    dryRun: false,
    resume: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--category':
      case '-c':
        options.category = args[++i];
        break;
      case '--brand':
      case '-b':
        options.brand = args[++i];
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
        options.ci = true;  // CI mode - no prompts, no delays
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
║                     PriceOye Full Scraper Script                        ║
╚══════════════════════════════════════════════════════════════════════════╝

Usage: node scripts/scrape-priceoye.js [options]

Options:
  --category, -c <name>   Scrape specific category only
  --brand, -b <name>      Scrape specific brand across all categories
  --dry-run, -d           Show what would be scraped without actually scraping
  --resume, -r            Resume from last failed/incomplete scrape
  --ci                    CI mode - no prompts, auto-detected in GitHub Actions
  --help, -h              Show this help message

Examples:
  node scripts/scrape-priceoye.js                    # Scrape everything
  node scripts/scrape-priceoye.js --category Mobiles # Only mobiles
  node scripts/scrape-priceoye.js --brand samsung    # Samsung products only
  node scripts/scrape-priceoye.js --dry-run          # Preview mode

Environment Variables:
  CI=true                 Auto-enables CI mode
  GITHUB_ACTIONS=true     Auto-enables CI mode

Configuration: src/scrapers/priceoye/priceoye-categories.json
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
  return { completedCategories: [], completedBrands: {} };
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
 * Build list of URLs to scrape based on options
 */
function buildScrapeList(options, progress) {
  const scrapeList = [];

  // Sort categories by priority
  const sortedCategories = [...config.categories].sort((a, b) => a.priority - b.priority);

  for (const category of sortedCategories) {
    // Skip disabled categories
    if (!category.enabled) {
      stats.skipped.push({ type: 'category', name: category.name, reason: 'disabled' });
      continue;
    }

    // Filter by category name if specified
    if (options.category && category.name.toLowerCase() !== options.category.toLowerCase()) {
      continue;
    }

    // Skip if already completed (resume mode)
    if (options.resume && progress.completedCategories.includes(category.name)) {
      stats.skipped.push({ type: 'category', name: category.name, reason: 'already completed' });
      continue;
    }

    // If category has brands, scrape each brand
    if (category.brands && category.brands.length > 0) {
      for (const brand of category.brands) {
        // Filter by brand if specified
        if (options.brand && brand.toLowerCase() !== options.brand.toLowerCase()) {
          continue;
        }

        // Skip if already completed (resume mode)
        const brandKey = `${category.name}/${brand}`;
        if (options.resume && progress.completedBrands[brandKey]) {
          stats.skipped.push({ type: 'brand', name: brandKey, reason: 'already completed' });
          continue;
        }

        scrapeList.push({
          type: 'brand',
          categoryName: category.name,
          brandName: brand,
          url: `${category.base}/${brand}`,
          name: `${category.name} - ${brand}`,
        });
      }
    } else {
      // No brands specified, scrape entire category
      if (options.brand) {
        // Skip if looking for specific brand but category has no brands
        continue;
      }

      scrapeList.push({
        type: 'category',
        categoryName: category.name,
        brandName: null,
        url: category.base,
        name: category.name,
      });
    }
  }

  return scrapeList;
}

/**
 * Display scrape plan (dry run or confirmation)
 */
function displayScrapePlan(scrapeList) {
  console.log('\n' + '═'.repeat(70));
  console.log('📋 SCRAPE PLAN');
  console.log('═'.repeat(70));

  const categories = new Set();
  const brands = new Set();

  scrapeList.forEach(item => {
    categories.add(item.categoryName);
    if (item.brandName) {
      brands.add(item.brandName);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Categories: ${categories.size}`);
  console.log(`   Brand-specific URLs: ${scrapeList.filter(i => i.type === 'brand').length}`);
  console.log(`   Category-wide URLs: ${scrapeList.filter(i => i.type === 'category').length}`);
  console.log(`   Total URLs to scrape: ${scrapeList.length}`);

  console.log(`\n📍 URLs to scrape:`);
  scrapeList.forEach((item, index) => {
    const icon = item.type === 'brand' ? '🏷️ ' : '📁';
    console.log(`   ${index + 1}. ${icon} ${item.name}`);
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
  const progress = options.resume ? loadProgress() : { completedCategories: [], completedBrands: {} };

  try {
    // Build scrape list
    const scrapeList = buildScrapeList(options, progress);

    if (scrapeList.length === 0) {
      console.log('\n⚠️  No URLs to scrape based on current options.');
      if (options.category) {
        console.log(`   Category "${options.category}" not found or already completed.`);
      }
      if (options.brand) {
        console.log(`   Brand "${options.brand}" not found in any enabled category.`);
      }
      return;
    }

    // Display plan
    displayScrapePlan(scrapeList);

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
      console.log('\n⚠️  This will scrape all URLs listed above.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Connect to database
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Initialize scraper
    console.log('🔧 Initializing scraper...');
    scraper = new PriceOyeScraper();
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');

    stats.startTime = new Date();

    // Process each URL
    for (let i = 0; i < scrapeList.length; i++) {
      const item = scrapeList[i];

      console.log('\n' + '═'.repeat(70));
      console.log(`📍 [${i + 1}/${scrapeList.length}] Scraping: ${item.name}`);
      console.log('═'.repeat(70));
      console.log(`   URL: ${item.url}`);
      console.log(`   Type: ${item.type}`);

      try {
        const products = await scraper.scrapeCategoryOrBrandByUrl(item.url, item.name);

        stats.totalProductsScraped += products.length;

        if (item.type === 'brand') {
          stats.brandsProcessed++;
          progress.completedBrands[`${item.categoryName}/${item.brandName}`] = true;
        } else {
          stats.categoriesProcessed++;
          progress.completedCategories.push(item.categoryName);
        }

        console.log(`   ✅ Scraped ${products.length} products`);

        // Save progress after each successful scrape
        saveProgress(progress);

        // Delay between scrapes
        const delay = item.type === 'brand' 
          ? config.settings.delayBetweenBrands 
          : config.settings.delayBetweenCategories;
        
        if (i < scrapeList.length - 1) {
          console.log(`   ⏳ Waiting ${delay / 1000}s before next scrape...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        logger.error(`Failed to scrape ${item.name}:`, error);
        stats.errors.push({
          url: item.url,
          name: item.name,
          error: error.message,
        });

        if (!config.settings.continueOnError) {
          throw error;
        }

        console.log(`   ❌ Failed: ${error.message}`);
        console.log(`   ⏩ Continuing with next URL...`);
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
      await scraper.cleanup();
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
  console.log(`🏷️  Brands processed: ${stats.brandsProcessed}`);
  console.log(`📦 Total products scraped: ${stats.totalProductsScraped}`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`);
    stats.errors.forEach(err => {
      console.log(`   • ${err.name}: ${err.error}`);
    });
    console.log('\n💡 Use --resume flag to retry failed URLs');
  } else {
    console.log('\n✅ All URLs scraped successfully!');
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 SCRAPING COMPLETE');
  console.log('═'.repeat(70));
}

// Main execution
const options = parseArgs();

if (options.help) {
  showHelp();
  process.exit(0);
}

console.log('\n' + '╔'.padEnd(69, '═') + '╗');
console.log('║' + '        🛒 PriceOye Full Product Scraper        '.padEnd(68) + '║');
console.log('╚'.padEnd(69, '═') + '╝');

scrapeAll(options).catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});

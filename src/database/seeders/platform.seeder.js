/**
 * Platform Seeder for Production
 * Seeds e-commerce platforms that the scraper supports
 */

const Platform = require('../../models/Platform');
const { logger } = require('../../utils/logger');

const platforms = [
  {
    name: 'PriceOye',
    domain: 'priceoye.pk',
    base_url: 'https://priceoye.pk',
    logo_url: 'https://priceoye.pk/images/logo.svg',
    scraping_config: {
      selectors: new Map([
        ['product_name', '.product-name, h1'],
        ['price', '.price-box, .product-price'],
        ['image', '.product-image img'],
        ['specs', '.specifications, .spec-list'],
        ['reviews', '.reviews-list'],
      ]),
      rate_limit: 50,
      supports_infinite_scroll: true,
      default_timeout: 30000,
    },
    supported_categories: [
      'mobiles', 'smart-watches', 'wireless-earbuds', 'tablets', 
      'laptops', 'power-banks', 'bluetooth-speakers', 'led-tv',
      'ac', 'refrigerators', 'motorcycle', 'electric-bikes'
    ],
    is_active: true,
  },
  {
    name: 'Daraz',
    domain: 'daraz.pk',
    base_url: 'https://www.daraz.pk',
    logo_url: 'https://img.lazcdn.com/g/tps/imgextra/i3/O1CN01ajf8Fs1GKJQdXBBTA_!!6000000000606-2-tps-240-240.png',
    scraping_config: {
      selectors: new Map([
        ['product_name', '.pdp-mod-product-badge-title'],
        ['price', '.pdp-price'],
        ['image', '.gallery-preview-panel__image'],
        ['rating', '.score-average'],
      ]),
      rate_limit: 60,
      requires_javascript: true,
    },
    is_active: true,
  },
  {
    name: 'Telemart',
    domain: 'telemart.pk',
    base_url: 'https://www.telemart.pk',
    logo_url: 'https://www.telemart.pk/images/logo.svg',
    scraping_config: {
      selectors: new Map([
        ['product_name', '.product-name'],
        ['price', '.price-new'],
      ]),
      rate_limit: 45,
    },
    is_active: true,
  },
  {
    name: 'Homeshopping',
    domain: 'homeshopping.pk',
    base_url: 'https://homeshopping.pk',
    logo_url: 'https://homeshopping.pk/logo.png',
    scraping_config: {
      selectors: new Map([
        ['product_name', 'h1.product-title'],
        ['price', '.price'],
      ]),
      rate_limit: 30,
    },
    is_active: true,
  },
  {
    name: 'Goto',
    domain: 'goto.com.pk',
    base_url: 'https://www.goto.com.pk',
    logo_url: 'https://www.goto.com.pk/assets/images/logo.png',
    scraping_config: {
      selectors: new Map([
        ['product_name', '.product-title'],
        ['price', '.product-price'],
        ['image', '.product-image'],
      ]),
      rate_limit: 40,
    },
    is_active: true,
  },
];

const seedPlatforms = async () => {
  try {
    logger.info('🌱 Seeding platforms...');

    const results = [];
    
    for (const platformData of platforms) {
      // Use upsert to avoid duplicates
      const platform = await Platform.findOneAndUpdate(
        { name: platformData.name },
        platformData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(platform);
      logger.info(`   ✅ ${platform.name} (${platform._id})`);
    }

    logger.info(`✅ Successfully seeded ${results.length} platforms`);
    return results;
  } catch (error) {
    logger.error('Error seeding platforms:', error);
    throw error;
  }
};

module.exports = { seedPlatforms, platforms };

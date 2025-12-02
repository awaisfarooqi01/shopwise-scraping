/**
 * Master Seeder Index
 * Orchestrates all database seeders in correct order for production
 */

const { seedPlatforms } = require('./platform.seeder');
const { seedCategories } = require('./category.seeder');
const { seedBrands } = require('./brand.seeder');
const { seedCategoryMappings } = require('./category-mapping.seeder');
const { logger } = require('../../utils/logger');

/**
 * Run all seeders in correct order
 * Order matters due to dependencies:
 * 1. Platforms (no dependencies)
 * 2. Categories (no dependencies)
 * 3. Brands (no dependencies)
 * 4. Category Mappings (depends on platforms and categories)
 */
const seedAll = async () => {
  try {
    logger.info('');
    logger.info('🌱 Starting production database seeding...');
    logger.info('═'.repeat(60));

    // 1. Seed platforms (no dependencies)
    logger.info('\n📡 Step 1: Seeding Platforms...');
    const platforms = await seedPlatforms();

    // 2. Seed categories (no dependencies)
    logger.info('\n📁 Step 2: Seeding Categories...');
    const { rootCategories, subcategories, unmappedCategory } = await seedCategories();
    const allCategories = [...rootCategories, ...subcategories];

    // 3. Seed brands (no dependencies)
    logger.info('\n🏷️  Step 3: Seeding Brands...');
    const brands = await seedBrands();

    // 4. Seed category mappings (depends on platforms and categories)
    logger.info('\n🔗 Step 4: Seeding Category Mappings...');
    const categoryMappings = await seedCategoryMappings();

    // Summary
    logger.info('\n' + '═'.repeat(60));
    logger.info('✅ Production database seeding completed!');
    logger.info('');
    logger.info('📊 Seeding Summary:');
    logger.info(`   Platforms:         ${platforms.length}`);
    logger.info(`   Root Categories:   ${rootCategories.length}`);
    logger.info(`   Subcategories:     ${subcategories.length}`);
    logger.info(`   Brands:            ${brands.length}`);
    logger.info(`   Category Mappings: ${categoryMappings.length}`);
    logger.info('');
    
    if (unmappedCategory) {
      logger.info('📋 Important IDs for .env:');
      logger.info(`   UNMAPPED_CATEGORY_ID=${unmappedCategory._id}`);
      
      const priceoyePlatform = platforms.find(p => p.name === 'PriceOye');
      if (priceoyePlatform) {
        logger.info(`   PRICEOYE_PLATFORM_ID=${priceoyePlatform._id}`);
      }
    }
    
    logger.info('═'.repeat(60));

    return {
      platforms,
      categories: allCategories,
      rootCategories,
      subcategories,
      unmappedCategory,
      brands,
      categoryMappings,
    };
  } catch (error) {
    logger.error('❌ Error during database seeding:', error);
    throw error;
  }
};

/**
 * Seed only essential data (platforms, categories, unmapped)
 * Use this for quick setup without all brands
 */
const seedEssential = async () => {
  try {
    logger.info('🌱 Seeding essential data only...');

    const platforms = await seedPlatforms();
    const { rootCategories, subcategories, unmappedCategory } = await seedCategories();

    logger.info('✅ Essential seeding completed');
    
    return { platforms, rootCategories, subcategories, unmappedCategory };
  } catch (error) {
    logger.error('❌ Error during essential seeding:', error);
    throw error;
  }
};

module.exports = {
  seedAll,
  seedEssential,
  seedPlatforms,
  seedCategories,
  seedBrands,
  seedCategoryMappings,
};

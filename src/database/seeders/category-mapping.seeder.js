/**
 * Category Mapping Seeder for Production
 * Maps platform-specific categories to our unified category structure
 * Critical for proper product categorization during scraping
 */

const CategoryMapping = require('../../models/CategoryMapping');
const Platform = require('../../models/Platform');
const Category = require('../../models/Category');
const { logger } = require('../../utils/logger');

/**
 * PriceOye category mappings
 * These map PriceOye URL slugs to our category structure
 */
const priceoyeMappings = [
  // Electronics > Mobile Phones
  { platform_category: 'mobiles', platform_category_path: 'mobiles', our_category: 'Electronics', our_subcategory: 'Mobile Phones' },
  { platform_category: 'Mobiles', platform_category_path: 'Mobiles', our_category: 'Electronics', our_subcategory: 'Mobile Phones' },
  
  // Electronics > Smart Watches
  { platform_category: 'smart-watches', platform_category_path: 'smart-watches', our_category: 'Electronics', our_subcategory: 'Smart Watches' },
  { platform_category: 'Smart Watches', platform_category_path: 'Smart Watches', our_category: 'Electronics', our_subcategory: 'Smart Watches' },
  
  // Electronics > Wireless Earbuds
  { platform_category: 'wireless-earbuds', platform_category_path: 'wireless-earbuds', our_category: 'Electronics', our_subcategory: 'Wireless Earbuds' },
  { platform_category: 'Wireless Earbuds', platform_category_path: 'Wireless Earbuds', our_category: 'Electronics', our_subcategory: 'Wireless Earbuds' },
  
  // Electronics > Tablets
  { platform_category: 'tablets', platform_category_path: 'tablets', our_category: 'Electronics', our_subcategory: 'Tablets' },
  { platform_category: 'Tablets', platform_category_path: 'Tablets', our_category: 'Electronics', our_subcategory: 'Tablets' },
  
  // Electronics > Laptops
  { platform_category: 'laptops', platform_category_path: 'laptops', our_category: 'Electronics', our_subcategory: 'Laptops' },
  { platform_category: 'Laptops', platform_category_path: 'Laptops', our_category: 'Electronics', our_subcategory: 'Laptops' },
  
  // Electronics > Power Banks
  { platform_category: 'power-banks', platform_category_path: 'power-banks', our_category: 'Electronics', our_subcategory: 'Power Banks' },
  { platform_category: 'Power Banks', platform_category_path: 'Power Banks', our_category: 'Electronics', our_subcategory: 'Power Banks' },
  
  // Electronics > Bluetooth Speakers
  { platform_category: 'bluetooth-speakers', platform_category_path: 'bluetooth-speakers', our_category: 'Electronics', our_subcategory: 'Bluetooth Speakers' },
  { platform_category: 'Bluetooth Speakers', platform_category_path: 'Bluetooth Speakers', our_category: 'Electronics', our_subcategory: 'Bluetooth Speakers' },
  
  // Electronics > LED TV
  { platform_category: 'led-tv', platform_category_path: 'led-tv', our_category: 'Electronics', our_subcategory: 'LED TV' },
  { platform_category: 'LED TV', platform_category_path: 'LED TV', our_category: 'Electronics', our_subcategory: 'LED TV' },
  
  // Electronics > Mobile Accessories
  { platform_category: 'mobiles-accessories', platform_category_path: 'mobiles-accessories', our_category: 'Electronics', our_subcategory: 'Mobile Accessories' },
  { platform_category: 'Mobile Accessories', platform_category_path: 'Mobile Accessories', our_category: 'Electronics', our_subcategory: 'Mobile Accessories' },
  
  // Electronics > Mobile Cables
  { platform_category: 'mobile-cables', platform_category_path: 'mobile-cables', our_category: 'Electronics', our_subcategory: 'Mobile Cables' },
  
  // Electronics > Mobile Chargers
  { platform_category: 'mobile-chargers', platform_category_path: 'mobile-chargers', our_category: 'Electronics', our_subcategory: 'Mobile Chargers' },
  { platform_category: 'mobile-car-chargers', platform_category_path: 'mobile-car-chargers', our_category: 'Electronics', our_subcategory: 'Mobile Chargers' },
  
  // Electronics > Wireless Chargers
  { platform_category: 'wireless-chargers', platform_category_path: 'wireless-chargers', our_category: 'Electronics', our_subcategory: 'Wireless Chargers' },
  
  // Home Appliances > Air Conditioners
  { platform_category: 'ac', platform_category_path: 'ac', our_category: 'Home Appliances', our_subcategory: 'Air Conditioners' },
  { platform_category: 'AC', platform_category_path: 'AC', our_category: 'Home Appliances', our_subcategory: 'Air Conditioners' },
  
  // Home Appliances > Refrigerators
  { platform_category: 'refrigerators', platform_category_path: 'refrigerators', our_category: 'Home Appliances', our_subcategory: 'Refrigerators' },
  { platform_category: 'Refrigerators', platform_category_path: 'Refrigerators', our_category: 'Home Appliances', our_subcategory: 'Refrigerators' },
  
  // Home Appliances > Air Purifiers
  { platform_category: 'air-purifiers', platform_category_path: 'air-purifiers', our_category: 'Home Appliances', our_subcategory: 'Air Purifiers' },
  
  // Beauty & Health > Personal Care
  { platform_category: 'personal-cares', platform_category_path: 'personal-cares', our_category: 'Beauty & Health', our_subcategory: 'Personal Care' },
  { platform_category: 'Personal Care', platform_category_path: 'Personal Care', our_category: 'Beauty & Health', our_subcategory: 'Personal Care' },
  
  // Beauty & Health > Trimmers & Shavers
  { platform_category: 'trimmers-shaver', platform_category_path: 'trimmers-shaver', our_category: 'Beauty & Health', our_subcategory: 'Trimmers & Shavers' },
  
  // Beauty & Health > Hair Straighteners & Curlers
  { platform_category: 'hair-straightners-curlers', platform_category_path: 'hair-straightners-curlers', our_category: 'Beauty & Health', our_subcategory: 'Hair Straighteners & Curlers' },
  
  // Beauty & Health > Tooth Brushes
  { platform_category: 'tooth-brushes', platform_category_path: 'tooth-brushes', our_category: 'Beauty & Health', our_subcategory: 'Tooth Brushes' },
  
  // Beauty & Health > Epilators
  { platform_category: 'epilators', platform_category_path: 'epilators', our_category: 'Beauty & Health', our_subcategory: 'Epilators' },
  
  // Beauty & Health > Hair Dryers
  { platform_category: 'hair-dryers', platform_category_path: 'hair-dryers', our_category: 'Beauty & Health', our_subcategory: 'Hair Dryers' },
  
  // Vehicles > Motorcycles
  { platform_category: 'motorcycle', platform_category_path: 'motorcycle', our_category: 'Vehicles', our_subcategory: 'Motorcycles' },
  { platform_category: 'Motorcycle', platform_category_path: 'Motorcycle', our_category: 'Vehicles', our_subcategory: 'Motorcycles' },
  
  // Vehicles > Electric Bikes
  { platform_category: 'electric-bikes', platform_category_path: 'electric-bikes', our_category: 'Vehicles', our_subcategory: 'Electric Bikes' },
  { platform_category: 'Electric Bikes', platform_category_path: 'Electric Bikes', our_category: 'Vehicles', our_subcategory: 'Electric Bikes' },
];

const seedCategoryMappings = async () => {
  try {
    logger.info('🌱 Seeding category mappings...');

    // Get PriceOye platform
    const priceoye = await Platform.findOne({ name: 'PriceOye' });
    if (!priceoye) {
      logger.warn('⚠️ PriceOye platform not found. Please seed platforms first.');
      return [];
    }

    // Get all categories
    const allCategories = await Category.find({});
    const categoryMap = {};
    
    // Build lookup map
    for (const cat of allCategories) {
      categoryMap[cat.name] = cat;
    }

    const results = [];
    let skipped = 0;

    for (const mapping of priceoyeMappings) {
      const ourCategory = categoryMap[mapping.our_category];
      const ourSubcategory = categoryMap[mapping.our_subcategory];

      if (!ourCategory) {
        logger.warn(`   ⚠️ Category not found: ${mapping.our_category}`);
        skipped++;
        continue;
      }

      if (!ourSubcategory) {
        logger.warn(`   ⚠️ Subcategory not found: ${mapping.our_subcategory}`);
        skipped++;
        continue;
      }

      // Use upsert to avoid duplicates
      const categoryMapping = await CategoryMapping.findOneAndUpdate(
        {
          platform_id: priceoye._id,
          platform_category: mapping.platform_category,
        },
        {
          platform_id: priceoye._id,
          platform_category: mapping.platform_category,
          platform_category_path: mapping.platform_category_path,
          our_category_id: ourCategory._id,
          our_subcategory_id: ourSubcategory._id,
          mapping_type: 'manual',
          confidence: 1.0,
          is_verified: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      results.push(categoryMapping);
    }

    logger.info(`✅ Successfully seeded ${results.length} category mappings`);
    if (skipped > 0) {
      logger.warn(`   ⚠️ Skipped ${skipped} mappings due to missing categories`);
    }

    return results;
  } catch (error) {
    logger.error('Error seeding category mappings:', error);
    throw error;
  }
};

module.exports = { seedCategoryMappings, priceoyeMappings };

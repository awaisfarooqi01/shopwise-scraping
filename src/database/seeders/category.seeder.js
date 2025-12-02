/**
 * Category Seeder for Production
 * Seeds hierarchical product categories including "Unmapped Products"
 */

const Category = require('../../models/Category');
const { logger } = require('../../utils/logger');

// Root categories (level 0)
const rootCategories = [
  {
    name: 'Electronics',
    level: 0,
    icon: '📱',
    parent_category_id: null,
    path: [],
    is_active: true,
  },
  {
    name: 'Home Appliances',
    level: 0,
    icon: '🏠',
    parent_category_id: null,
    path: [],
    is_active: true,
  },
  {
    name: 'Fashion',
    level: 0,
    icon: '👗',
    parent_category_id: null,
    path: [],
    is_active: true,
  },
  {
    name: 'Beauty & Health',
    level: 0,
    icon: '💄',
    parent_category_id: null,
    path: [],
    is_active: true,
  },
  {
    name: 'Vehicles',
    level: 0,
    icon: '🏍️',
    parent_category_id: null,
    path: [],
    is_active: true,
  },
  {
    name: 'Unmapped Products',
    level: 0,
    icon: '❓',
    parent_category_id: null,
    path: [],
    is_active: true,
    description: 'Products awaiting category mapping review. Auto-created by scraper when no manual mapping exists.',
    metadata: {
      auto_created: true,
      purpose: 'Temporary holding category for unmapped products',
      admin_action_required: true
    }
  },
];

// Subcategories for each root category
const subcategoriesMap = {
  'Electronics': [
    'Mobile Phones',
    'Smart Watches',
    'Wireless Earbuds',
    'Tablets',
    'Laptops',
    'Power Banks',
    'Bluetooth Speakers',
    'LED TV',
    'Headphones',
    'Cameras',
    'Gaming Consoles',
    'Mobile Accessories',
    'Mobile Cables',
    'Mobile Chargers',
    'Wireless Chargers',
  ],
  'Home Appliances': [
    'Air Conditioners',
    'Refrigerators',
    'Washing Machines',
    'Air Purifiers',
    'Kitchen Appliances',
    'Vacuum Cleaners',
  ],
  'Beauty & Health': [
    'Personal Care',
    'Trimmers & Shavers',
    'Hair Straighteners & Curlers',
    'Tooth Brushes',
    'Epilators',
    'Hair Dryers',
    'Skincare',
    'Makeup',
  ],
  'Vehicles': [
    'Motorcycles',
    'Electric Bikes',
    'Bicycle',
    'Vehicle Accessories',
  ],
  'Fashion': [
    "Men's Clothing",
    "Women's Clothing",
    "Kids' Clothing",
    'Shoes',
    'Bags',
    'Watches',
    'Jewelry',
  ],
};

const seedCategories = async () => {
  try {
    logger.info('🌱 Seeding categories...');

    const createdRootCategories = [];
    const createdSubcategories = [];

    // Create root categories
    for (const catData of rootCategories) {
      const category = await Category.findOneAndUpdate(
        { name: catData.name, level: 0 },
        catData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      createdRootCategories.push(category);
      logger.info(`   ✅ Root: ${category.name} (${category._id})`);
    }

    // Create subcategories
    for (const rootCat of createdRootCategories) {
      const subs = subcategoriesMap[rootCat.name] || [];
      
      for (const subName of subs) {
        const subCategory = await Category.findOneAndUpdate(
          { name: subName, parent_category_id: rootCat._id },
          {
            name: subName,
            parent_category_id: rootCat._id,
            level: 1,
            path: [rootCat._id],
            is_active: true,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        createdSubcategories.push(subCategory);
        logger.info(`   ✅ Sub: ${rootCat.name} > ${subCategory.name}`);
      }
    }

    // Get the Unmapped Products category for returning
    const unmappedCategory = createdRootCategories.find(c => c.name === 'Unmapped Products');

    logger.info(`\n✅ Successfully seeded categories:`);
    logger.info(`   Root Categories: ${createdRootCategories.length}`);
    logger.info(`   Subcategories: ${createdSubcategories.length}`);
    logger.info(`   Total: ${createdRootCategories.length + createdSubcategories.length}`);
    
    if (unmappedCategory) {
      logger.info(`\n📋 Unmapped Products Category ID: ${unmappedCategory._id}`);
      logger.info(`   Add to .env: UNMAPPED_CATEGORY_ID=${unmappedCategory._id}`);
    }

    return {
      rootCategories: createdRootCategories,
      subcategories: createdSubcategories,
      unmappedCategory,
    };
  } catch (error) {
    logger.error('Error seeding categories:', error);
    throw error;
  }
};

module.exports = { seedCategories, rootCategories, subcategoriesMap };

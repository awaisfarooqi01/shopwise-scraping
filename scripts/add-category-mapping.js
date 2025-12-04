/**
 * Add Category Mapping Script
 * Creates category mappings for platform-specific category names
 *
 * Usage:
 *   node scripts/add-category-mapping.js
 *   node scripts/add-category-mapping.js --platform=daraz --from="Mobiles" --to="Mobile Phones"
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Platform = require('../src/models/Platform');
const Category = require('../src/models/Category');
const CategoryMapping = require('../src/models/CategoryMapping');

// Common mappings to add (Daraz → Our Categories)
const DARAZ_MAPPINGS = [
  { from: 'Mobiles', to: 'Mobile Phones' },
  { from: 'Tablets', to: 'Tablets' },
  { from: 'Smart Watches', to: 'Smart Watches' },
  { from: 'Laptops', to: 'Laptops' },
  { from: 'Televisions', to: 'TVs & Monitors' },
  { from: 'Headphones & Headsets', to: 'Headphones' },
  { from: 'Audio', to: 'Audio & Speakers' },
];

async function addCategoryMapping(platformName, platformCategory, ourCategoryName) {
  try {
    // Find platform
    const platform = await Platform.findOne({
      name: { $regex: new RegExp(`^${platformName}$`, 'i') },
    });

    if (!platform) {
      console.log(`❌ Platform "${platformName}" not found`);
      return null;
    }

    // Find our category
    const category = await Category.findOne({
      name: { $regex: new RegExp(`^${ourCategoryName}$`, 'i') },
      is_active: true,
    });

    if (!category) {
      console.log(`❌ Category "${ourCategoryName}" not found in database`);
      return null;
    }

    // Check if mapping already exists
    const existingMapping = await CategoryMapping.findOne({
      platform_id: platform._id,
      platform_category: { $regex: new RegExp(`^${platformCategory}$`, 'i') },
    });

    if (existingMapping) {
      console.log(
        `⚠️  Mapping already exists: "${platformCategory}" → "${existingMapping.our_category_id}"`
      );

      // Update if different
      if (existingMapping.our_category_id.toString() !== category._id.toString()) {
        existingMapping.our_category_id = category._id;
        existingMapping.is_verified = true;
        await existingMapping.save();
        console.log(`✅ Updated mapping: "${platformCategory}" → "${ourCategoryName}"`);
      }
      return existingMapping;
    }

    // Create new mapping
    const mapping = await CategoryMapping.create({
      platform_id: platform._id,
      platform_category: platformCategory,
      our_category_id: category._id,
      our_subcategory_id: null,
      confidence: 1.0,
      is_verified: true,
      is_active: true,
      usage_count: 0,
      metadata: {
        created_by: 'script',
        notes: 'Manual mapping',
      },
    });

    console.log(
      `✅ Created mapping: "${platformCategory}" → "${ourCategoryName}" (ID: ${mapping._id})`
    );
    return mapping;
  } catch (error) {
    console.error(`❌ Error creating mapping:`, error.message);
    return null;
  }
}

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let platformName = 'Daraz';
    let fromCategory = null;
    let toCategory = null;

    for (const arg of args) {
      if (arg.startsWith('--platform=')) {
        platformName = arg.split('=')[1];
      } else if (arg.startsWith('--from=')) {
        fromCategory = arg.split('=')[1];
      } else if (arg.startsWith('--to=')) {
        toCategory = arg.split('=')[1];
      }
    }

    console.log('='.repeat(60));
    console.log('📂 ADD CATEGORY MAPPING');
    console.log('='.repeat(60));

    // Connect to MongoDB
    console.log('\n📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    if (fromCategory && toCategory) {
      // Single mapping mode
      console.log(`Adding single mapping for ${platformName}:`);
      console.log(`  "${fromCategory}" → "${toCategory}"`);
      await addCategoryMapping(platformName, fromCategory, toCategory);
    } else {
      // Batch mode - add all Daraz mappings
      console.log(`Adding batch mappings for ${platformName}:\n`);

      for (const mapping of DARAZ_MAPPINGS) {
        await addCategoryMapping(platformName, mapping.from, mapping.to);
      }
    }

    // Show all current mappings
    console.log('\n' + '-'.repeat(60));
    console.log('📋 CURRENT DARAZ CATEGORY MAPPINGS:');
    console.log('-'.repeat(60));

    const platform = await Platform.findOne({ name: /daraz/i });
    if (platform) {
      const mappings = await CategoryMapping.find({ platform_id: platform._id })
        .populate('our_category_id', 'name')
        .populate('our_subcategory_id', 'name')
        .sort({ platform_category: 1 });

      if (mappings.length === 0) {
        console.log('No mappings found');
      } else {
        for (const m of mappings) {
          const categoryName = m.our_category_id?.name || 'Unknown';
          const subcategoryName = m.our_subcategory_id?.name;
          const target = subcategoryName ? `${categoryName} > ${subcategoryName}` : categoryName;
          console.log(`  "${m.platform_category}" → "${target}" (verified: ${m.is_verified})`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB');
    console.log('='.repeat(60));
  }
}

main();

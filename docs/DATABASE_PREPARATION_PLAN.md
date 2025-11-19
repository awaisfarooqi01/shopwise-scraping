# Database Preparation Plan - Before Phase 2

**Date:** November 16, 2025  
**Purpose:** Clean and prepare database for real PriceOye data  
**Status:** 📋 PLANNING

---

## 🎯 Objective

Remove test/seed data and prepare database for **real product data** from PriceOye scraping.

---

## 📊 Current Database State

### What's Currently in the Database?
1. **Brands** - Seeded brands (Samsung, Apple, Xiaomi, etc.)
2. **Categories** - Possibly seeded categories
3. **Products** - Test/demo products (if any)
4. **Category Mappings** - Test mappings
5. **Users** - Admin users, test users
6. **Other Collections** - Reviews, wishlists, etc.

---

## 🗑️ What to Keep vs What to Delete

### ✅ KEEP (Don't Delete)
- **Brands** - Keep seeded brands (they're valid!)
  - Samsung, Apple, Xiaomi, OnePlus, etc.
  - These will be used by normalization service
  - Cache is already initialized with these
  
- **Categories** - Keep IF they're the standardized categories
  - Electronics, Smartphones, etc.
  - These are for normalization
  
- **Admin Users** - Keep admin accounts
  - Needed for backend management
  
- **Platform Records** - Keep platform definitions
  - PriceOye, Daraz, etc.
  - Needed for scraping

### ❌ DELETE (Clean Up)
- **Products** - Delete ALL test/demo products
  - We'll add real PriceOye products
  
- **Category Mappings** - Delete test mappings
  - We'll create real mappings during scraping
  
- **Reviews** - Delete test reviews
  - No real reviews yet
  
- **Wishlists** - Delete test wishlists
  
- **Test Users** - Delete non-admin test users (optional)

---

## 📝 Step-by-Step Execution Plan

### Step 1: Verify Current Database State ✅
**Objective:** Understand what's in the database

**Actions:**
```bash
# Connect to MongoDB
mongo shopwise

# Check each collection
db.brands.countDocuments()
db.categories.countDocuments()
db.products.countDocuments()
db.category_mappings.countDocuments()
db.users.countDocuments()
db.platforms.countDocuments()
db.reviews.countDocuments()
db.wishlists.countDocuments()
```

**Expected Output:**
- Brands: ~36 (from seed)
- Categories: ? (check count)
- Products: ? (likely test data)
- Category Mappings: ? (likely test data)
- Users: 1-5 (admin + test)
- Platforms: 4-5 (PriceOye, Daraz, etc.)

---

### Step 2: Backup Current Database ✅
**Objective:** Create backup before deletion (safety measure)

**Actions:**
```bash
# Navigate to backend
cd E:\University Work\FYP\code\shopwise-backend

# Run backup script
node scripts/backup-database.js
```

**Expected Output:**
- Backup file created in `backups/` folder
- Filename: `shopwise-backup-YYYY-MM-DD-HH-MM-SS.gz`

---

### Step 3: Review Brands Collection ✅
**Objective:** Verify brands are correct and keep them

**Actions:**
```javascript
// Check brands in database
db.brands.find({}, { name: 1, normalized_name: 1, aliases: 1 }).pretty()

// Count brands
db.brands.countDocuments()
```

**Decision:**
- ✅ **KEEP** if brands are valid (Samsung, Apple, etc.)
- ❌ **REVIEW** if brands look wrong or incomplete

---

### Step 4: Review Categories Collection ✅
**Objective:** Verify categories are standardized

**Actions:**
```javascript
// Check categories
db.categories.find({}, { name: 1, slug: 1, parent_id: 1 }).pretty()

// Count categories
db.categories.countDocuments()
```

**Decision:**
- ✅ **KEEP** if categories are standardized (Electronics → Smartphones)
- ❌ **DELETE** if categories are test data or platform-specific

---

### Step 5: Delete Test Products ✅
**Objective:** Remove ALL products to make room for real data

**Actions:**
```javascript
// Count products before deletion
db.products.countDocuments()

// DELETE ALL PRODUCTS
db.products.deleteMany({})

// Verify deletion
db.products.countDocuments()  // Should be 0
```

**Expected Output:**
```json
{ "acknowledged": true, "deletedCount": X }
```

---

### Step 6: Delete Category Mappings ✅
**Objective:** Remove test category mappings

**Actions:**
```javascript
// Count mappings before deletion
db.category_mappings.countDocuments()

// DELETE ALL CATEGORY MAPPINGS
db.category_mappings.deleteMany({})

// Verify deletion
db.category_mappings.countDocuments()  // Should be 0
```

---

### Step 7: Delete Test Reviews ✅
**Objective:** Remove test reviews (no real reviews yet)

**Actions:**
```javascript
// Count reviews before deletion
db.reviews.countDocuments()

// DELETE ALL REVIEWS
db.reviews.deleteMany({})

// Verify deletion
db.reviews.countDocuments()  // Should be 0
```

---

### Step 8: Delete Wishlists (Optional) ✅
**Objective:** Clean wishlists

**Actions:**
```javascript
// Count wishlists
db.wishlists.countDocuments()

// DELETE ALL WISHLISTS (optional)
db.wishlists.deleteMany({})

// Verify deletion
db.wishlists.countDocuments()  // Should be 0
```

---

### Step 9: Review Users Collection ✅
**Objective:** Keep admin, remove test users

**Actions:**
```javascript
// List all users
db.users.find({}, { email: 1, role: 1, name: 1 }).pretty()

// Keep admin users, delete test users (optional)
// DELETE test users (carefully!)
db.users.deleteMany({ role: { $ne: "admin" } })  // Keep only admins

// OR keep all users (safer)
// No action needed
```

---

### Step 10: Verify Platforms Collection ✅
**Objective:** Ensure PriceOye platform exists

**Actions:**
```javascript
// Check platforms
db.platforms.find({}).pretty()

// Verify PriceOye exists
db.platforms.findOne({ platform_id: "priceoye" })
```

**Expected:** PriceOye platform should exist

**If Not Exists:**
```javascript
db.platforms.insertOne({
  platform_id: "priceoye",
  name: "PriceOye",
  url: "https://priceoye.pk",
  is_active: true,
  country: "Pakistan",
  currency: "PKR",
  created_at: new Date(),
  updated_at: new Date()
})
```

---

### Step 11: Create Database Cleanup Script ✅
**Objective:** Automate cleanup for future use

**File:** `shopwise-scraping/scripts/cleanup-database.js`

```javascript
/**
 * Database Cleanup Script
 * Removes test data before real scraping
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Count before deletion
    console.log('\n📊 Current State:');
    const productCount = await db.collection('products').countDocuments();
    const mappingCount = await db.collection('category_mappings').countDocuments();
    const reviewCount = await db.collection('reviews').countDocuments();
    const wishlistCount = await db.collection('wishlists').countDocuments();

    console.log(`   Products: ${productCount}`);
    console.log(`   Category Mappings: ${mappingCount}`);
    console.log(`   Reviews: ${reviewCount}`);
    console.log(`   Wishlists: ${wishlistCount}`);

    // Delete test data
    console.log('\n🗑️  Deleting test data...');
    
    const productsResult = await db.collection('products').deleteMany({});
    console.log(`   ✅ Deleted ${productsResult.deletedCount} products`);

    const mappingsResult = await db.collection('category_mappings').deleteMany({});
    console.log(`   ✅ Deleted ${mappingsResult.deletedCount} category mappings`);

    const reviewsResult = await db.collection('reviews').deleteMany({});
    console.log(`   ✅ Deleted ${reviewsResult.deletedCount} reviews`);

    const wishlistsResult = await db.collection('wishlists').deleteMany({});
    console.log(`   ✅ Deleted ${wishlistsResult.deletedCount} wishlists`);

    // Verify deletion
    console.log('\n📊 After Cleanup:');
    console.log(`   Products: ${await db.collection('products').countDocuments()}`);
    console.log(`   Category Mappings: ${await db.collection('category_mappings').countDocuments()}`);
    console.log(`   Reviews: ${await db.collection('reviews').countDocuments()}`);
    console.log(`   Wishlists: ${await db.collection('wishlists').countDocuments()}`);

    // Show what we kept
    console.log('\n✅ Kept:');
    const brandCount = await db.collection('brands').countDocuments();
    const categoryCount = await db.collection('categories').countDocuments();
    const userCount = await db.collection('users').countDocuments();
    const platformCount = await db.collection('platforms').countDocuments();

    console.log(`   Brands: ${brandCount}`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Platforms: ${platformCount}`);

    console.log('\n✅ Database cleanup complete!');
    console.log('📝 Database is ready for real PriceOye data');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

cleanupDatabase();
```

---

### Step 12: Verify Database is Clean ✅
**Objective:** Final verification before scraping

**Actions:**
```bash
# Run verification script
node scripts/verify-database.js
```

**Expected State:**
```
✅ Brands: 36 (seeded brands)
✅ Categories: X (standardized categories)
✅ Products: 0 (cleaned)
✅ Category Mappings: 0 (cleaned)
✅ Reviews: 0 (cleaned)
✅ Wishlists: 0 (cleaned)
✅ Users: 1-5 (admin users)
✅ Platforms: 4-5 (platform definitions)
```

---

## 🔍 Verification Checklist

Before moving to Phase 2, verify:

- [ ] Database backup created
- [ ] Products collection is empty (0 documents)
- [ ] Category mappings collection is empty (0 documents)
- [ ] Reviews collection is empty (0 documents)
- [ ] Brands collection has seeded brands (~36)
- [ ] Categories collection has standardized categories
- [ ] Platforms collection has PriceOye defined
- [ ] Admin users still exist
- [ ] Cleanup script created and tested

---

## 📊 Expected Final State

### Collections After Cleanup

| Collection | Count | Status | Notes |
|------------|-------|--------|-------|
| **brands** | ~36 | ✅ Keep | Seeded brands for normalization |
| **categories** | ? | ✅ Keep | Standardized categories |
| **products** | 0 | ✅ Cleaned | Ready for real data |
| **category_mappings** | 0 | ✅ Cleaned | Will be created during scraping |
| **reviews** | 0 | ✅ Cleaned | No real reviews yet |
| **wishlists** | 0 | ✅ Cleaned | User data cleaned |
| **users** | 1-5 | ✅ Keep | Admin users |
| **platforms** | 4-5 | ✅ Keep | Platform definitions |

---

## 🚀 After Cleanup: Next Steps

### Phase 2 Will Start Fresh
1. ✅ Scrape PriceOye products
2. ✅ Normalize brands using cached data
3. ✅ Map categories (create mappings)
4. ✅ Store real products in MongoDB
5. ✅ Verify data quality

### First PriceOye Scrape Will:
- Create new products (real data)
- Create new category mappings (priceoye → standardized)
- Use existing brands (via normalization)
- Build product database from scratch

---

## 📝 Manual Cleanup (Alternative)

If you prefer manual cleanup via MongoDB Compass or mongo shell:

```javascript
// Connect to database
use shopwise

// Delete products
db.products.deleteMany({})

// Delete category mappings
db.category_mappings.deleteMany({})

// Delete reviews
db.reviews.deleteMany({})

// Delete wishlists
db.wishlists.deleteMany({})

// Verify
db.products.countDocuments()  // Should be 0
db.category_mappings.countDocuments()  // Should be 0
db.reviews.countDocuments()  // Should be 0
db.wishlists.countDocuments()  // Should be 0
```

---

## ⚠️ Important Notes

### What NOT to Delete
- ❌ **DON'T** delete brands - normalization service uses them
- ❌ **DON'T** delete categories - standardized categories needed
- ❌ **DON'T** delete platforms - scraper needs platform definitions
- ❌ **DON'T** delete admin users - you need access!

### Safety Measures
- ✅ **ALWAYS** backup before cleanup
- ✅ **VERIFY** what you're deleting
- ✅ **TEST** cleanup script before running
- ✅ **CHECK** counts before and after

---

## 🎯 Success Criteria

Database is ready when:
- ✅ Products collection is empty
- ✅ Category mappings collection is empty
- ✅ Brands are intact and cached
- ✅ Categories are standardized
- ✅ Platforms are defined
- ✅ Backup exists
- ✅ All verifications pass

---

**Status:** 📋 READY TO EXECUTE  
**Next Step:** Execute cleanup plan step by step

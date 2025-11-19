# 🚀 Database Cleanup - Step-by-Step Execution Guide

**Date:** November 16, 2025  
**Objective:** Clean database and prepare for real PriceOye data  
**Estimated Time:** 10-15 minutes

---

## ✅ Prerequisites

Before starting, ensure:
- [x] MongoDB is running
- [x] Backend is running (port 5000)
- [x] You have database access
- [x] You're in the scraping project directory

---

## 📋 Step-by-Step Instructions

### Step 1: Navigate to Scraping Project

```powershell
cd "E:\University Work\FYP\code\shopwise-scraping"
```

**Verify:** You should see `package.json` in current directory

---

### Step 2: Check Current Database State (Optional)

```powershell
node scripts/verify-database.js
```

**Expected Output:**
- Shows current collection counts
- May show ❌ if collections need cleanup
- Gives you overview of what needs to be done

**Don't worry if it fails** - this is just to see current state!

---

### Step 3: Backup Current Database (IMPORTANT!)

**Option A: Using Backend Backup Script (Recommended)**
```powershell
cd "..\shopwise-backend"
node scripts/backup-database.js
cd "..\shopwise-scraping"
```

**Option B: Using mongodump (Manual)**
```powershell
mongodump --db shopwise --out "./backups/manual-backup-$(Get-Date -Format 'yyyy-MM-dd-HHmmss')"
```

**Expected Output:**
```
✅ Database backup created successfully
   Location: backups/shopwise-backup-2025-11-16-HHMMSS.gz
```

**Why backup?**
- Safety measure in case something goes wrong
- Can restore if needed
- Good practice before any database modifications

---

### Step 4: Run Database Cleanup Script

```powershell
node scripts/cleanup-database.js
```

**What this does:**
1. Connects to MongoDB
2. Shows current state
3. Deletes test data:
   - Products
   - Category mappings
   - Reviews
   - Wishlists
4. Keeps important data:
   - Brands
   - Categories
   - Users
   - Platforms
5. Verifies cleanup was successful

**Expected Output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Current Database State:
──────────────────────────────────────────────────
   Products:          X
   Category Mappings: X
   Reviews:           X
   Wishlists:         X
   Brands:            36 (will keep)
   Categories:        X (will keep)
   Users:             X (will keep)
   Platforms:         X (will keep)

⚠️  WARNING: About to delete:
   - All products
   - All category mappings
   - All reviews
   - All wishlists

   Brands, Categories, Users, and Platforms will be KEPT.

🗑️  Deleting test data...
──────────────────────────────────────────────────
   ✅ Products:          Deleted X documents
   ✅ Category Mappings: Deleted X documents
   ✅ Reviews:           Deleted X documents
   ✅ Wishlists:         Deleted X documents

📊 After Cleanup:
──────────────────────────────────────────────────
   Products:          0 ✅
   Category Mappings: 0 ✅
   Reviews:           0 ✅
   Wishlists:         0 ✅

✅ Collections Kept (Not Deleted):
──────────────────────────────────────────────────
   Brands:     36 documents
   Categories: X documents
   Users:      X documents
   Platforms:  X documents

🔍 Verifying Platform Configuration:
──────────────────────────────────────────────────
   ✅ PriceOye (priceoye)
   ✅ Daraz (daraz-pk)
   ...

   ✅ PriceOye platform found - ready for scraping!

==================================================
✅ Database Cleanup Complete!
==================================================

📝 Summary:
   Deleted: X products
   Deleted: X category mappings
   Deleted: X reviews
   Deleted: X wishlists
   Kept:    36 brands
   Kept:    X categories
   Kept:    X users
   Kept:    X platforms

🚀 Database is ready for real PriceOye data!
   Next step: Run PriceOye scraper

🔌 Disconnected from MongoDB
```

---

### Step 5: Verify Cleanup Was Successful

```powershell
node scripts/verify-database.js
```

**Expected Output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

🔍 Database Verification
============================================================

1️⃣  Products Collection:
   ✅ Empty (0 documents) - Ready for scraping

2️⃣  Category Mappings Collection:
   ✅ Empty (0 documents) - Will be created during scraping

3️⃣  Reviews Collection:
   ✅ Empty (0 documents) - No test reviews

4️⃣  Brands Collection:
   ✅ Contains 36 brands - Normalization ready

   Sample brands:
     - Samsung (samsung) [4 aliases]
     - Apple (apple) [4 aliases]
     - Xiaomi (xiaomi) [5 aliases]
     - OnePlus (oneplus) [3 aliases]
     - Vivo (vivo) [2 aliases]

5️⃣  Categories Collection:
   ✅ Contains X categories

   Sample categories:
     - Electronics (electronics) (root)
     - Smartphones (smartphones) (has parent)
     ...

6️⃣  Platforms Collection:
   ✅ Contains X platforms

   Platforms:
     ✅ PriceOye (priceoye)
     ✅ Daraz (daraz-pk)
     ...

   ✅ PriceOye platform configured

7️⃣  Users Collection:
   ✅ Contains X users (X admins)


📊 Database Statistics
============================================================
   Database:      shopwise
   Collections:   X
   Data Size:     X.XX MB
   Index Size:    X.XX MB
   Total Size:    X.XX MB


🎯 Final Verdict
============================================================

✅ DATABASE IS READY FOR SCRAPING!

Next steps:
  1. Ensure backend is running (port 5000)
  2. Verify normalization cache is loaded
  3. Start PriceOye scraper implementation
  4. Test with a single product first
  5. Then scrape multiple products

🔌 Disconnected from MongoDB
```

---

### Step 6: Verify Backend API is Running

```powershell
# Test backend health
node -e "const axios = require('axios'); axios.get('http://localhost:5000/api/v1/health').then(res => console.log('✅ Backend is running:', res.data)).catch(err => console.error('❌ Backend not running'));"
```

**Expected Output:**
```
✅ Backend is running: { status: 'healthy', ... }
```

**If backend is NOT running:**
```powershell
# Start backend in separate terminal
cd "..\shopwise-backend"
npm run dev
```

---

### Step 7: Verify Normalization Service

```powershell
# Test normalization service
node -e "const service = require('./src/services/normalization-service'); setTimeout(() => { console.log('Cache Stats:', service.getCacheStats()); }, 2000);"
```

**Expected Output:**
```
2025-11-16 XX:XX:XX [info]: Initializing normalization cache...
2025-11-16 XX:XX:XX [info]: NormalizationService initialized
2025-11-16 XX:XX:XX [info]: Initialized brand cache with 36 brands

Cache Stats: {
  brandHits: 0,
  brandMisses: 0,
  categoryHits: 0,
  categoryMisses: 0,
  brandCacheSize: 36,     ✅ 36 brands cached
  categoryCacheSize: 0,
  brandHitRate: 0,
  categoryHitRate: 0
}
```

---

## ✅ Verification Checklist

Before proceeding to Phase 2, verify:

- [ ] Database backup created (in `backups/` folder)
- [ ] Cleanup script ran successfully
- [ ] Products collection is empty (0 documents)
- [ ] Category mappings collection is empty (0 documents)
- [ ] Reviews collection is empty (0 documents)
- [ ] Brands collection has ~36 documents
- [ ] Categories collection has documents
- [ ] Platforms collection has PriceOye
- [ ] Backend API is running (port 5000)
- [ ] Normalization cache loaded (36 brands)
- [ ] Verification script passes with ✅

---

## 🔄 If Something Went Wrong

### Restore from Backup

**Option A: Using Backend Restore Script**
```powershell
cd "..\shopwise-backend"
node scripts/restore-database.js
# Follow prompts to select backup file
cd "..\shopwise-scraping"
```

**Option B: Using mongorestore (Manual)**
```powershell
mongorestore --db shopwise --drop ./backups/[backup-folder]
```

### Re-run Cleanup
```powershell
# Just run cleanup script again
node scripts/cleanup-database.js
```

---

## 📊 What Each Collection Should Look Like

### ✅ After Cleanup - Ready State

| Collection | Count | Status | Purpose |
|------------|-------|--------|---------|
| **products** | 0 | ✅ Empty | Will fill with real PriceOye data |
| **category_mappings** | 0 | ✅ Empty | Will create during scraping |
| **reviews** | 0 | ✅ Empty | Will add later |
| **wishlists** | 0 | ✅ Empty | User feature (later) |
| **brands** | ~36 | ✅ Populated | For normalization |
| **categories** | >0 | ✅ Populated | For mapping |
| **platforms** | 4-5 | ✅ Populated | Platform configs |
| **users** | 1-5 | ✅ Populated | Admin access |

---

## 🚀 After Cleanup - Next Steps

### You're Ready to Build Phase 2! ✅

**Next Session Will Cover:**
1. Create Product Model (Mongoose schema)
2. Implement PriceOye scraper
3. Integrate normalization service
4. Test with real PriceOye URLs
5. Store products in MongoDB

**Flow:**
```
PriceOye Website → Scraper → Normalize Brands/Categories → MongoDB
```

**Example Product Workflow:**
```javascript
// 1. Scrape PriceOye
const productData = scraper.extractProduct(html);
// {
//   title: "Samsung Galaxy S23",
//   price: 189999,
//   brand: "Samsung",  // ← Raw brand name
//   category: "Mobiles" // ← Platform category
// }

// 2. Normalize brand (uses cache!)
const brand = await normalizationService.normalizeBrand(
  productData.brand,
  'priceoye',
  true
);
// { brand_id: "6919ddac...", normalized: "Samsung", ... }

// 3. Map category
const category = await normalizationService.mapCategory(
  'priceoye',
  productData.category,
  true
);
// { category_id: "...", mapped_category: "Smartphones", ... }

// 4. Save to MongoDB
const product = new Product({
  brand_id: brand.brand_id,      // ✅ Normalized ID
  category_id: category.category_id, // ✅ Mapped ID
  title: productData.title,
  price: productData.price,
  platform_id: 'priceoye',
  // ... other fields
});
await product.save();
```

---

## 📝 Summary

### What We Did ✅
1. ✅ Created database cleanup script
2. ✅ Created database verification script
3. ✅ Backed up current database
4. ✅ Deleted test data (products, mappings, reviews)
5. ✅ Kept essential data (brands, categories, platforms)
6. ✅ Verified database is ready
7. ✅ Verified backend API is running
8. ✅ Verified normalization cache is loaded

### What's Ready ✅
- ✅ Clean database (no test products)
- ✅ 36 brands cached for normalization
- ✅ Categories ready for mapping
- ✅ Platforms configured (including PriceOye)
- ✅ Backend API running and healthy
- ✅ All Phase 1 & 1.5 tests passing

### Next Step 🚀
**START PHASE 2: PriceOye Scraper Implementation**

---

**Status:** ✅ DATABASE READY  
**Next:** Build PriceOye scraper with Product model

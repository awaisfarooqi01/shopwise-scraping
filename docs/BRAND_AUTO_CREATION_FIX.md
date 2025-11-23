# Brand Auto-Creation Fix

## Problem

When scraping products with brands not in the database (e.g., "HMD"), the system was incorrectly using fuzzy matching to map them to similar existing brands (e.g., "Nokia"), instead of creating new brand records.

### Example Issue
- **Product**: HMD Aura 2
- **Expected**: Create new "HMD" brand
- **Actual**: Fuzzy matched "HMD" to "Nokia" and auto-learned as alias
- **Result**: Product stored with Nokia's brand_id instead of HMD

## Root Cause

The backend `brand-normalization.service.js` was:
1. ✅ Checking for exact match (correct)
2. ❌ Running fuzzy matching even when `autoLearn=true` (scraper mode)
3. ❌ Auto-learning fuzzy matches with confidence >= 0.9 as aliases
4. ❌ Returning wrong brand_id to scraper

## Solution Implemented

### 1. Backend Changes (`brand-normalization.service.js`)

**Before:**
```javascript
// Step 3: Try fuzzy matching
const fuzzyMatches = await this._fuzzyMatchBrand(cleanedName);
if (fuzzyMatches.length > 0) {
  const bestMatch = fuzzyMatches[0];
  
  // Auto-learn if confidence is high enough
  if (autoLearn && bestMatch.confidence >= this.AUTO_LEARN_THRESHOLD) {
    await this.brandRepository.addAlias(bestMatch.brand_id, cleanedName);
    logger.info(`Auto-learned alias: "${cleanedName}" for brand "${bestMatch.name}"`);
  }
  
  return {
    brand_id: bestMatch.brand_id,
    // ...returns fuzzy match
  };
}
```

**After:**
```javascript
// Step 3: Try fuzzy matching ONLY if autoLearn is false (admin review mode)
// When autoLearn=true (scraper mode), skip fuzzy matching to avoid wrong associations
if (!autoLearn) {
  const fuzzyMatches = await this._fuzzyMatchBrand(cleanedName);
  if (fuzzyMatches.length > 0) {
    const bestMatch = fuzzyMatches[0];
    
    return {
      brand_id: bestMatch.brand_id,
      confidence: bestMatch.confidence,
      source: 'fuzzy_match',
      needs_review: true, // Always require manual review for fuzzy matches
      // ...returns fuzzy match for admin review only
    };
  }
}

// Step 4: No match found - scraper should create new brand
return {
  brand_id: null,
  source: 'no_match',
  shouldCreate: autoLearn, // Signal to scraper to create new brand
  // ...
};
```

### 2. Scraper Changes

Added brand auto-creation in `normalization-service.js`:

```javascript
// If no match found and autoLearn is true, create new brand
if (!result.brand_id && result.shouldCreate && autoLearn) {
  logger.info(`No match found - creating new brand: "${cleanBrandName}"`);
  
  const newBrand = await backendAPIClient.createBrand({
    name: cleanBrandName,
    normalized_name: cleanBrandName.toLowerCase().trim(),
    metadata: {
      source_platform: platformId,
      original_name: brandName,
      auto_created: true
    }
  });

  return {
    brand_id: newBrand._id,
    confidence: 1.0,
    source: 'auto_created',
    needs_review: true, // Still needs admin verification
    // ...
  };
}
```

### 3. Backend API Client

Added `createBrand` method in `backend-api-client.js`:

```javascript
async createBrand(brandData) {
  const response = await this.client.post('/api/v1/brands', {
    name: brandData.name,
    normalized_name: brandData.normalized_name || brandData.name.toLowerCase().trim(),
    is_verified: false, // Mark as unverified for admin review
    metadata: {
      auto_created: true,
      created_by: 'scraper',
      // ...
    }
  });
  
  return response.data.data.brand;
}
```

## Logic Flow

### Before Fix
```
Product: "HMD Aura 2"
  ↓
Backend normalizeBrand("HMD", autoLearn=true)
  ↓
Step 1: No exact match for "HMD" ❌
  ↓
Step 2: Fuzzy matching finds "Nokia" (0.85 similarity)
  ↓
Step 3: Auto-learn "HMD" as alias for Nokia ❌
  ↓
Return: { brand_id: Nokia._id } ❌
  ↓
Product saved with Nokia brand_id ❌
```

### After Fix
```
Product: "HMD Aura 2"
  ↓
Backend normalizeBrand("HMD", autoLearn=true)
  ↓
Step 1: No exact match for "HMD" ❌
  ↓
Step 2: Skip fuzzy matching (autoLearn=true) ✅
  ↓
Return: { brand_id: null, shouldCreate: true } ✅
  ↓
Scraper creates new brand "HMD" ✅
  ↓
Return: { brand_id: HMD._id, source: 'auto_created' } ✅
  ↓
Product saved with HMD brand_id ✅
```

## When Fuzzy Matching Is Used

Fuzzy matching is still available for **admin review mode** (when `autoLearn=false`):

```javascript
// Admin manually reviewing unmapped brands
POST /api/v1/brands/normalize
{
  "brand_name": "HMD",
  "auto_learn": false  // Admin review mode
}

// Response includes fuzzy matches for manual selection
{
  "brand_id": null,
  "source": "fuzzy_match",
  "needs_review": true,
  "alternatives": [
    { "brand": "Nokia", "confidence": 0.85 },
    { "brand": "HTC", "confidence": 0.75 }
  ]
}
```

## Benefits

1. ✅ **Prevents Wrong Associations**: No more automatic fuzzy matching to similar brands
2. ✅ **Explicit Brand Creation**: New brands are created explicitly, not learned as aliases
3. ✅ **Admin Review**: Auto-created brands are marked `is_verified=false` for admin review
4. ✅ **Fuzzy Matching Available**: Admins can still use fuzzy matching for manual review
5. ✅ **Better Data Quality**: Products have correct brand associations

## Testing

Run the test to verify the fix:

```bash
node tests/test-brand-auto-creation.js
```

**Expected Output:**
```
✅ CORRECT: Product assigned to HMD brand
✅ Not incorrectly mapped to Nokia via fuzzy matching
✅ Brand was auto-created by scraper (as expected)

🎉 TEST PASSED: Brand auto-creation works correctly!
```

## Files Modified

### Backend (`shopwise-backend`)
1. `src/services/brand/brand-normalization.service.js` - Fixed fuzzy matching logic

### Scraper (`shopwise-scraping`)
1. `src/services/backend-api-client.js` - Added createBrand method
2. `src/services/normalization-service.js` - Added brand auto-creation logic
3. `tests/test-brand-auto-creation.js` - Added test to verify fix

## Admin Workflow

1. **Auto-created brands** are marked `is_verified=false`
2. Admin reviews auto-created brands periodically
3. Admin can:
   - ✅ Verify brand as correct → Set `is_verified=true`
   - ❌ Merge with existing brand → Update products and delete duplicate
   - 📝 Add aliases → Brand becomes searchable by multiple names

## Next Steps

1. ✅ Apply backend fix
2. ✅ Restart backend server
3. ✅ Run test to verify
4. ⏳ Create admin UI for reviewing auto-created brands
5. ⏳ Add bulk update API for remapping products to correct brands

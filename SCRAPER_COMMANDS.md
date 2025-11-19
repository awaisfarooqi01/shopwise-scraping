# 🚀 PriceOye Scraper - Command Quick Reference

## ✅ Status: WORKING (Nov 18, 2025)

---

## 📋 Quick Commands

### **Setup**
```bash
# 1. Ensure MongoDB is running
# 2. Ensure backend API is running (for brand normalization)

# 3. Create PriceOye platform (if needed)
node scripts/setup-platform.js

# 4. Verify setup
node tests/test-platform-setup.js
```

### **Testing**
```bash
# Test single product
node tests/test-single-product.js

# Test with detailed debug output
node tests/test-scraper-debug.js

# Test multiple products
node tests/test-multiple-products.js

# Test browser connectivity
node tests/test-browser-simple.js
```

### **Viewing Logs**
```bash
# Real-time combined logs
Get-Content logs/combined-2025-11-18.log -Wait -Tail 50

# Real-time error logs
Get-Content logs/error-2025-11-18.log -Wait -Tail 50

# View debug logs
Get-Content logs/debug-2025-11-18.log -Wait -Tail 50
```

---

## 📝 Test Product URLs

```
Samsung Galaxy S23 Ultra:
https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra

Apple iPhone 15 Pro Max:
https://priceoye.pk/mobiles/apple/apple-iphone-15-pro-max

Infinix Note 40 Pro:
https://priceoye.pk/mobiles/infinix/infinix-note-40-pro

Xiaomi Redmi Note 13 Pro:
https://priceoye.pk/mobiles/xiaomi/xiaomi-redmi-note-13-pro

OPPO Reno 11 Pro:
https://priceoye.pk/mobiles/oppo/oppo-reno-11-pro-5g
```

---

## 🔍 Quick Checks

### **Check if MongoDB is running**
```bash
mongosh --eval "db.version()"
```

### **Check if Backend API is running**
```bash
curl http://localhost:3000/api/health
# OR
Invoke-WebRequest -Uri http://localhost:3000/api/health
```

### **Check scraped products in database**
```bash
mongosh shopwise --eval "db.products.countDocuments()"
mongosh shopwise --eval "db.products.find({platform_name: 'PriceOye'}).limit(5).pretty()"
```

### **View latest scraped product**
```bash
mongosh shopwise --eval "db.products.find().sort({createdAt: -1}).limit(1).pretty()"
```

---

## 📊 Expected Output

### **Successful Scrape:**
```
✅ Product scraped successfully: Samsung Galaxy S23 Ultra
📊 SCRAPED PRODUCT DATA:
Name: Samsung Galaxy S23 Ultra
Price: Rs 382999
Sale Price: Rs 329999
Discount: 14%
Images: 16
Specifications: 29
Rating: 4.6/5
Database ID: 691cb70e01daeb95437c2dd5
```

### **Scraper Statistics:**
```
📈 SCRAPER STATISTICS:
Pages Visited: 1
Products Scraped: 1
Errors: 0
Duration: 32000ms
Success Rate: 100.00%
```

---

## ⚠️ Common Issues & Fixes

### **Issue: "PriceOye platform not found"**
```bash
node scripts/setup-platform.js
```

### **Issue: "MongoDB connection failed"**
```bash
# Start MongoDB
net start MongoDB
# OR
mongod --dbpath "C:\data\db"
```

### **Issue: "Brand normalization failed"**
```bash
# Start backend API
cd ..\shopwise-backend
npm start
```

### **Issue: "Page timeout"**
- Check internet connection
- Try with longer timeout in config
- Run with `headless: false` to debug

---

## 📁 Important Files

```
src/scrapers/priceoye/priceoye-scraper.js    # Main scraper
src/config/scraper-config.js                  # Configuration
src/models/Product.js                         # Product schema
tests/test-single-product.js                  # Basic test
tests/test-scraper-debug.js                   # Debug test
```

---

## 🎯 What Gets Scraped

✅ Product Name  
✅ Brand (normalized)  
✅ Category (mapped)  
✅ Price & Sale Price  
✅ Discount Percentage  
✅ 16 Product Images  
✅ 29+ Specifications  
✅ Ratings & Reviews  
✅ Stock Availability  
✅ Delivery Time  
✅ Color Variants  
✅ Storage Variants  

---

## 💾 Database Fields

```javascript
{
  name: "Samsung Galaxy S23 Ultra",
  brand: "Samsung",
  brand_id: ObjectId("..."),
  category_name: "Mobiles",
  price: 382999,
  sale_price: 329999,
  sale_percentage: 14,
  average_rating: 4.6,
  review_count: 14,
  media: {
    images: [{ url, type, alt_text }, ...],
    videos: []
  },
  specifications: Map {
    "Screen Size" => "6.8 inches",
    "RAM" => "12 GB",
    ...
  },
  availability: "in_stock",
  delivery_time: "24hr Delivery",
  original_url: "https://priceoye.pk/...",
  platform_name: "PriceOye",
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 Error Screenshots

Location: `data/screenshots/error-*.png`

Automatically saved when scraping fails.

---

## 📞 Help

**Documentation:**
- `docs/SCRAPER_QUICK_START.md` - Full quick start guide
- `docs/PHASE_2_COMPLETE_SUMMARY.md` - Complete implementation summary
- `docs/PHASE_2_TESTING_SUCCESS.md` - Test results

**Logs:**
- `logs/combined-2025-11-18.log` - All logs
- `logs/error-2025-11-18.log` - Errors only
- `logs/debug-2025-11-18.log` - Debug info

---

**Last Updated:** November 18, 2025  
**Status:** ✅ **WORKING**  
**Success Rate:** 100%  
**Products Tested:** 1+ (ongoing)

# PriceOye Scraper - Quick Start Guide

## ✅ Verified Working - November 18, 2025

---

## 🚀 Quick Start

### **1. Prerequisites**
```bash
# Ensure MongoDB is running
# Ensure backend API is running (for brand normalization)
```

### **2. Run Single Product Test**
```bash
node tests/test-scraper-debug.js
```

**Expected Result:**
```
✅ Product scraped successfully: Samsung Galaxy S23 Ultra
📊 SCRAPED PRODUCT DATA:
Name: Samsung Galaxy S23 Ultra
Price: Rs 382999
Sale Price: Rs 329999
Discount: 14%
Rating: 4.6/5 (14 reviews)
Images: 16
Specifications: 29
```

---

## 📖 Usage Examples

### **Example 1: Scrape Single Product**

```javascript
const mongoose = require('mongoose');
const PriceOyeScraper = require('./src/scrapers/priceoye/priceoye-scraper');

async function scrapeSingleProduct() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const scraper = new PriceOyeScraper();
  await scraper.initialize();
  
  const url = 'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra';
  const product = await scraper.scrapeProduct(url);
  
  console.log('Name:', product.name);
  console.log('Price:', product.price);
  console.log('Brand:', product.brand);
  console.log('Images:', product.media.images.length);
  console.log('Specs:', product.specifications.size);
  
  await scraper.cleanup();
  await mongoose.disconnect();
}

scrapeSingleProduct();
```

### **Example 2: Scrape Multiple Products**

```javascript
async function scrapeMultipleProducts() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const scraper = new PriceOyeScraper();
  await scraper.initialize();
  
  const urls = [
    'https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra',
    'https://priceoye.pk/mobiles/apple/apple-iphone-15-pro-max',
    'https://priceoye.pk/mobiles/infinix/infinix-note-40-pro',
  ];
  
  for (const url of urls) {
    try {
      const product = await scraper.scrapeProduct(url);
      console.log(`✅ Scraped: ${product.name}`);
      
      // Add delay between requests (rate limiting)
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error.message);
    }
  }
  
  const stats = scraper.getStats();
  console.log('\n📊 Statistics:');
  console.log(`Products Scraped: ${stats.productsScraped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Success Rate: ${((stats.productsScraped / urls.length) * 100).toFixed(2)}%`);
  
  await scraper.cleanup();
  await mongoose.disconnect();
}

scrapeMultipleProducts();
```

### **Example 3: Get Scraper Statistics**

```javascript
const stats = scraper.getStats();

console.log('Pages Visited:', stats.pagesVisited);
console.log('Products Scraped:', stats.productsScraped);
console.log('Errors:', stats.errors);
console.log('Duration:', stats.duration, 'ms');
console.log('Success Rate:', `${((stats.productsScraped / stats.pagesVisited) * 100).toFixed(2)}%`);
```

---

## 🔍 What Gets Scraped

### **Product Information:**
- ✅ Product Name
- ✅ Description  
- ✅ Brand (with normalization)
- ✅ Category (with mapping)

### **Pricing:**
- ✅ Current Price
- ✅ Original Price
- ✅ Sale Price
- ✅ Discount Percentage
- ✅ Currency (PKR)

### **Media:**
- ✅ Product Images (up to 16)
- ✅ Image URLs
- ✅ Alt Text

### **Reviews:**
- ✅ Average Rating (e.g., 4.6/5)
- ✅ Review Count
- ✅ Positive Review Percentage

### **Specifications:**
- ✅ Release Date
- ✅ Phone Dimensions
- ✅ Weight
- ✅ Operating System
- ✅ Screen Size
- ✅ Screen Type
- ✅ RAM
- ✅ Storage
- ✅ Processor
- ✅ Battery
- ✅ Camera Details
- ✅ Connectivity (5G, 4G, WiFi, Bluetooth, NFC)
- ✅ And many more...

### **Availability:**
- ✅ Stock Status (in_stock, out_of_stock, limited, pre_order)
- ✅ Delivery Time
- ✅ Warranty Information

### **Variants:**
- ✅ Color Options
- ✅ Storage Options

---

## 🎛️ Configuration

### **Default Configuration** (`src/config/scraper-config.js`)

```javascript
{
  platform: {
    name: 'PriceOye',
    baseUrl: 'https://priceoye.pk',
    currency: 'PKR'
  },
  
  browser: {
    headless: true,
    viewport: { width: 1920, height: 1080 }
  },
  
  rateLimit: {
    concurrent: 3,
    minInterval: 1000,
    randomDelay: { min: 500, max: 1500 }
  },
  
  retry: {
    retries: 3,
    minTimeout: 2000,
    factor: 2  // Exponential backoff
  }
}
```

### **Custom Configuration:**

```javascript
const scraper = new PriceOyeScraper({
  browser: {
    headless: false,  // See the browser in action
  },
  rateLimit: {
    concurrent: 1,  // More conservative
    minInterval: 2000  // 2 seconds between requests
  }
});
```

---

## 🐛 Troubleshooting

### **Issue: "PriceOye platform not found in database"**
**Solution:**
```bash
node scripts/setup-platform.js
```

### **Issue: "MongoDB connection failed"**
**Solution:**
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
# Windows: net start MongoDB
# Linux/Mac: sudo systemctl start mongod
```

### **Issue: "Brand normalization failed"**
**Solution:**
```bash
# Ensure backend API is running
cd ../shopwise-backend
npm start
```

### **Issue: Browser timeout**
**Solution:**
- Increase timeout in config
- Check internet connection
- Try with `headless: false` to see what's happening

### **Issue: "logger.error is not a function"**
**Solution:** Already fixed - use `const { logger } = require('./utils/logger')`

---

## 📊 Output Example

```json
{
  "_id": "691cb70e01daeb95437c2dd5",
  "platform_id": "6919ddac3af87bff38a68140",
  "platform_name": "PriceOye",
  "name": "Samsung Galaxy S23 Ultra",
  "brand": "Samsung",
  "brand_id": "6919ddac3af87bff38a68197",
  "category_name": "Mobiles",
  "price": 382999,
  "sale_price": 329999,
  "sale_percentage": 14,
  "currency": "PKR",
  "average_rating": 4.6,
  "review_count": 14,
  "positive_review_percentage": 92,
  "media": {
    "images": [
      {
        "url": "https://images.priceoye.pk/samsung-galaxy-s23-ultra-pakistan-priceoye-s4z8j-500x500.webp",
        "type": "product",
        "alt_text": "Samsung Galaxy S23 Ultra"
      }
    ],
    "videos": []
  },
  "specifications": {
    "Release Date": "2023-02-20",
    "Screen Size": "6.8 inches",
    "RAM": "12 GB",
    "Battery": "Li-Ion 5000 mAh",
    ...
  },
  "availability": "in_stock",
  "delivery_time": "24hr Delivery",
  "original_url": "https://priceoye.pk/mobiles/samsung/samsung-galaxy-s23-ultra",
  "is_active": true,
  "createdAt": "2025-11-18T18:12:30.000Z",
  "updatedAt": "2025-11-18T18:12:30.000Z"
}
```

---

## ✅ Verification Checklist

Before running large-scale scraping:

- [ ] MongoDB is running
- [ ] Backend API is running (for brand normalization)
- [ ] Platform exists in database
- [ ] Test single product works
- [ ] Check available disk space (for screenshots)
- [ ] Set appropriate rate limits
- [ ] Configure error handling

---

## 📞 Support

### **Check Logs:**
```bash
# View recent logs
tail -f logs/combined-2025-11-18.log

# View errors only
tail -f logs/error-2025-11-18.log
```

### **Debug Mode:**
Set `DEBUG=true` in `.env` to see more detailed logs

### **Screenshot on Error:**
Screenshots are automatically saved to `data/screenshots/` when errors occur

---

## 🎯 Next Steps

1. **Test with more products** (Phase 2.2)
2. **Implement brand scraping** (Phase 2.3)
3. **Implement category scraping** (Phase 2.4)
4. **Add pagination handling**
5. **Optimize for large-scale scraping**

---

**Last Updated:** November 18, 2025  
**Status:** ✅ **WORKING & TESTED**  
**Test Product:** Samsung Galaxy S23 Ultra  
**Success Rate:** 100% (1/1)

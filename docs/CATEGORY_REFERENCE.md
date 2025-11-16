# Category Mapping Reference

> Product categories for data normalization across platforms

This document provides the category structure that scrapers should map products to.

---

## 📂 Category Hierarchy

### Root Categories (Level 0)

1. **Electronics**
2. **Fashion**
3. **Home & Living**
4. **Beauty & Health**
5. **Sports & Outdoors**
6. **Books & Media**

---

## 📱 Electronics

### Mobile Phones & Accessories
- Mobile Phones
  - Android Phones
  - iPhones
  - Feature Phones
- Mobile Accessories
  - Cases & Covers
  - Screen Protectors
  - Chargers & Cables
  - Power Banks
  - Mobile Holders

### Computing
- Laptops
  - Gaming Laptops
  - Business Laptops
  - Budget Laptops
- Desktops & All-in-Ones
- Tablets & E-Readers
- Computer Accessories
  - Keyboards & Mice
  - Monitors
  - External Storage
  - Webcams

### Audio & Wearables
- Headphones & Earphones
  - Over-Ear Headphones
  - In-Ear Earphones
  - True Wireless Earbuds
- Speakers
  - Bluetooth Speakers
  - Home Audio
- Smart Watches & Fitness Bands
  - Smart Watches
  - Fitness Trackers

### Cameras & Photography
- Digital Cameras
  - DSLR Cameras
  - Mirrorless Cameras
  - Point & Shoot Cameras
- Action Cameras
- Camera Accessories
  - Lenses
  - Tripods
  - Camera Bags

### Gaming
- Gaming Consoles
  - PlayStation
  - Xbox
  - Nintendo
- Gaming Accessories
  - Controllers
  - Gaming Headsets
  - Gaming Chairs

### Home Appliances
- Kitchen Appliances
  - Refrigerators
  - Microwave Ovens
  - Blenders
  - Air Fryers
- Cooling & Heating
  - Air Conditioners
  - Fans
  - Heaters
- Cleaning
  - Vacuum Cleaners
  - Irons & Steamers
  - Washing Machines

---

## 👕 Fashion

### Men's Fashion
- Men's Clothing
  - Kurtas & Shalwar Kameez
  - Shirts & T-Shirts
  - Jeans & Pants
  - Winter Wear
- Men's Footwear
  - Formal Shoes
  - Sneakers
  - Sandals & Slippers
- Men's Accessories
  - Watches
  - Wallets
  - Belts
  - Sunglasses

### Women's Fashion
- Women's Clothing
  - Kurtas & Kurtis
  - Shalwar Kameez
  - Western Wear
  - Winter Wear
- Women's Footwear
  - Heels
  - Flats
  - Sneakers
  - Sandals
- Women's Accessories
  - Handbags
  - Jewelry
  - Watches
  - Sunglasses

### Kids' Fashion
- Boys' Clothing
- Girls' Clothing
- Kids' Footwear

---

## 🏠 Home & Living

### Furniture
- Bedroom Furniture
  - Beds
  - Wardrobes
  - Dressing Tables
- Living Room Furniture
  - Sofas
  - Center Tables
  - TV Units
- Office Furniture
  - Office Chairs
  - Desks
  - File Cabinets

### Home Decor
- Wall Art
- Lighting
- Curtains & Blinds
- Rugs & Carpets

### Kitchen & Dining
- Cookware
- Dinnerware
- Kitchen Storage
- Kitchen Tools

### Bedding & Bath
- Bed Sheets
- Pillows & Cushions
- Towels
- Bath Accessories

---

## 💄 Beauty & Health

### Skincare
- Face Care
- Body Care
- Hand & Foot Care

### Makeup
- Face Makeup
- Eye Makeup
- Lip Makeup

### Hair Care
- Shampoos & Conditioners
- Hair Styling Products
- Hair Tools

### Personal Care
- Bath & Body
- Oral Care
- Men's Grooming
- Women's Care

### Health & Wellness
- Supplements & Vitamins
- Medical Supplies
- Fitness Equipment

---

## ⚽ Sports & Outdoors

### Fitness Equipment
- Treadmills
- Exercise Bikes
- Weights & Dumbbells
- Yoga Mats

### Sports Gear
- Cricket Equipment
- Football Equipment
- Badminton Equipment

### Outdoor Recreation
- Camping & Hiking
- Cycling
- Swimming

---

## 📚 Books & Media

### Books
- Fiction
- Non-Fiction
- Educational
- Islamic Books

### Media
- Music
- Movies & TV Shows

---

## 🎯 Category Mapping Guidelines

### For Scrapers

When scraping a product, map it to the most specific category available:

```javascript
// Example: Scraping a Samsung phone from PriceOye

// ✅ Good - Specific mapping
{
  category_name: "Electronics",
  subcategory_name: "Mobile Phones"
}

// ❌ Bad - Too generic
{
  category_name: "Electronics",
  subcategory_name: "Electronics"
}
```

### Common Category Mappings by Platform

#### PriceOye Categories → Our Categories
- "Mobiles" → Electronics > Mobile Phones
- "Laptops" → Electronics > Computing > Laptops
- "Smart Watches" → Electronics > Audio & Wearables > Smart Watches
- "Power Banks" → Electronics > Mobile Phones & Accessories > Power Banks
- "Tablets" → Electronics > Computing > Tablets & E-Readers

#### Daraz Categories → Our Categories
- "Mobile Accessories" → Electronics > Mobile Phones & Accessories
- "Men's Fashion" → Fashion > Men's Fashion
- "Women's Fashion" → Fashion > Women's Fashion
- "Home Appliances" → Electronics > Home Appliances
- "Sports & Outdoor" → Sports & Outdoors

#### Telemart Categories → Our Categories
- "Smartphones" → Electronics > Mobile Phones
- "Computer Accessories" → Electronics > Computing > Computer Accessories
- "Cameras" → Electronics > Cameras & Photography

### Handling Unmapped Categories

If a platform category doesn't match our structure:

1. **Map to closest category**: Choose the most similar category
2. **Store original category**: Keep platform's category in specifications
3. **Flag for review**: Log unmapped categories for future updates

```javascript
// Example handling unmapped category
{
  category_name: "Electronics",  // Best match
  subcategory_name: "Other",     // Fallback
  specifications: {
    original_platform_category: "Gaming Laptops & Accessories"  // Preserve original
  }
}
```

---

## 🔍 Category Search Tips

### For Product Classification

When extracting category from product pages:

1. **Check breadcrumbs**: Most reliable source
   ```html
   <!-- Example -->
   <nav class="breadcrumb">
     <a href="/">Home</a> > 
     <a href="/electronics">Electronics</a> > 
     <a href="/electronics/mobiles">Mobile Phones</a>
   </nav>
   ```

2. **Product metadata**: Check meta tags
   ```html
   <meta property="product:category" content="Electronics > Mobile Phones">
   ```

3. **Structured data**: Look for schema.org markup
   ```html
   <script type="application/ld+json">
   {
     "@type": "Product",
     "category": "Electronics/Mobile Phones"
   }
   </script>
   ```

4. **URL patterns**: Parse from URL
   ```
   https://priceoye.pk/electronics/mobiles/samsung-galaxy-s23
   Category: Electronics
   Subcategory: Mobiles
   ```

---

## 📊 Category Statistics (Reference)

Expected product distribution across categories:

| Root Category | Expected % | Priority for Scraping |
|---------------|-----------|---------------------|
| Electronics | 60% | 🔴 High |
| Fashion | 20% | 🟡 Medium |
| Home & Living | 10% | 🟡 Medium |
| Beauty & Health | 5% | 🟢 Low |
| Sports & Outdoors | 3% | 🟢 Low |
| Books & Media | 2% | 🟢 Low |

---

## 🔗 Related Documentation

- See `DATABASE_SCHEMA.md` for category collection structure
- See `PLATFORM_REFERENCE.md` for platform-specific category mappings
- See backend `src/database/seeders/category.seeder.js` for full category tree

---

**Last Updated**: November 16, 2025  
**Version**: 1.0

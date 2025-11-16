# ShopWise Backend - Database Setup Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Database Configuration](#database-configuration)
- [Running Seeders](#running-seeders)
- [Database Scripts](#database-scripts)
- [Models Overview](#models-overview)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

Before setting up the database, ensure you have:

1. **MongoDB** installed and running
   - Local: MongoDB 6.0+ 
   - Cloud: MongoDB Atlas account (recommended)

2. **Node.js** 18 LTS or higher

3. **Required packages** installed
   ```bash
   npm install
   ```

## ⚙️ Database Configuration

### 1. Create Environment File

Copy the example environment file:
```bash
cp .env.example .env
```

### 2. Configure MongoDB Connection

Edit `.env` file with your MongoDB connection details:

**For Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/shopwise
```

**For MongoDB Atlas (Cloud):**
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/shopwise?retryWrites=true&w=majority
```

Replace `<username>`, `<password>`, and cluster details with your MongoDB Atlas credentials.

### 3. Verify Connection

Test your database connection:
```bash
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost:27017 (or your Atlas cluster)
```

## 🌱 Running Seeders

### Seed All Collections

To populate the database with sample data:

```bash
npm run seed
```

This will create:
- ✅ 5 E-commerce platforms (Daraz, PriceOye, etc.)
- ✅ 50+ Categories (Electronics, Fashion, etc.)
- ✅ 5 Test users
- ✅ 10+ Sample products
- ✅ 100+ Product reviews
- ✅ Price history data

**Test User Credentials:**
- Email: `admin@shopwise.pk` | Password: `Admin@123`
- Email: `ali.khan@example.com` | Password: `User@123`

### Clear Database

To remove all data:

```bash
node scripts/seed-database.js --clear
```

⚠️ **Warning:** This will delete ALL data in the database!

## 📜 Database Scripts

### 1. Seed Database
```bash
npm run seed
# or
node scripts/seed-database.js
```
Populates database with sample data.

### 2. Create Admin User
```bash
npm run create-admin
# or
node scripts/create-admin.js
```
Interactive script to create an admin user.

### 3. Backup Database
```bash
node scripts/backup-database.js
```
Creates a backup in `backups/` folder.

**Requirements:** `mongodump` must be installed (part of MongoDB Database Tools).

### 4. Restore Database
```bash
node scripts/restore-database.js backup-2024-11-03T10-30-00
```
Restores database from a backup folder.

**Requirements:** `mongorestore` must be installed.

## 📊 Models Overview

### Collections

| Collection | Description | Documents |
|------------|-------------|-----------|
| `platforms` | E-commerce platforms | 5 |
| `categories` | Product categories | 50+ |
| `users` | User accounts | 5 |
| `products` | Product listings | 10+ |
| `reviews` | Product reviews | 100+ |
| `sale_history` | Price history | 200+ |
| `search_history` | User searches | - |
| `alerts` | Price alerts | - |
| `notifications` | User notifications | - |

### Key Models

#### Platform
```javascript
{
  name: 'Daraz',
  domain: 'daraz.pk',
  base_url: 'https://www.daraz.pk',
  logo_url: '...',
  is_active: true
}
```

#### Category
```javascript
{
  name: 'Electronics',
  parent_category_id: null, // Root category
  level: 0,
  path: [],
  icon: '📱'
}
```

#### User
```javascript
{
  email: 'user@example.com',
  password: 'hashed_password',
  name: 'User Name',
  language_preference: 'en',
  is_verified: true
}
```

#### Product
```javascript
{
  name: 'Samsung Galaxy S23 Ultra',
  brand: 'Samsung',
  platform_id: ObjectId,
  category_id: ObjectId,
  price: 349999,
  currency: 'PKR',
  average_rating: 4.7,
  review_count: 234,
  availability: 'in_stock'
}
```

#### Review
```javascript
{
  product_id: ObjectId,
  reviewer_name: 'Ahmed Ali',
  rating: 5,
  text: 'Excellent product!',
  verified_purchase: true,
  sentiment_analysis: {
    sentiment: 'positive',
    score: 0.9,
    keywords: ['excellent', 'quality']
  }
}
```

## 🔍 Troubleshooting

### Connection Issues

**Problem:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solutions:**
1. Ensure MongoDB is running:
   ```bash
   # Windows
   net start MongoDB
   
   # Linux/Mac
   sudo systemctl start mongod
   ```

2. Verify MongoDB URI in `.env` file

3. For Atlas, check:
   - Network access (whitelist your IP)
   - Database user credentials
   - Cluster is running

### Seeding Errors

**Problem:** `ValidationError` during seeding

**Solutions:**
1. Clear database first:
   ```bash
   node scripts/seed-database.js --clear
   ```

2. Re-run seeder:
   ```bash
   npm run seed
   ```

### Authentication Errors

**Problem:** `MongoServerError: Authentication failed`

**Solutions:**
1. Verify username and password in MongoDB URI
2. For Atlas: Check database user has proper permissions
3. Ensure password special characters are URL-encoded

### Memory Issues

**Problem:** `JavaScript heap out of memory`

**Solutions:**
1. Increase Node.js memory:
   ```bash
   set NODE_OPTIONS=--max-old-space-size=4096
   npm run seed
   ```

2. Seed collections individually (modify seed scripts)

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Guide](https://mongoosejs.com/docs/guide.html)
- [MongoDB Atlas Setup](https://www.mongodb.com/cloud/atlas/register)

## 🆘 Need Help?

If you encounter issues:
1. Check the logs in `logs/error.log`
2. Enable debug mode: `DEBUG=* npm run seed`
3. Verify all prerequisites are installed
4. Contact the development team

---

**Last Updated:** November 2025  
**Version:** 1.0.0

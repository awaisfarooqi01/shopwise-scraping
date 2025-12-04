# 🚀 GitHub Actions Scraper Setup - Step by Step Guide

This guide will walk you through running the PriceOye scraper on GitHub Actions.

## ✅ Prerequisites Completed

- [x] Production database seeded with platforms, categories, brands, and mappings
- [x] Cloud MongoDB configured and working
- [x] Scraper code ready

---

## 📋 Step-by-Step Setup

### Step 1: Push Code to GitHub

If you haven't already, push your `shopwise-scraping` folder to GitHub:

```powershell
# Navigate to your scraping project
cd "e:\University Work\FYP\code\shopwise-scraping"

# Initialize git if not done
git init

# Add all files
git add .

# Commit
git commit -m "Add PriceOye scraper with GitHub Actions workflows"

# Add your GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/shopwise-scraping.git

# Push to main branch
git push -u origin main
```

---

### Step 2: Add GitHub Secrets

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/shopwise-scraping`

2. Click **Settings** (tab at the top)

3. In the left sidebar, click **Secrets and variables** → **Actions**

4. Click **New repository secret**

5. Add the following secret:

   | Name | Value |
   |------|-------|
   | `MONGODB_URI` | `putyourown` |

6. Click **Add secret**

> ⚠️ **Important**: Copy the exact URI from your `.env` file. The password must be URL-encoded (`@` = `%40`).

---

### Step 3: Run the Scraper Manually

1. Go to your GitHub repository

2. Click the **Actions** tab

3. In the left sidebar, click **PriceOye Scraper**

4. Click the **Run workflow** button (dropdown on the right)

5. Configure the run:

   | Option | Recommended Value | Description |
   |--------|-------------------|-------------|
   | **Branch** | `main` | Your main branch |
   | **Category** | Leave empty | Scrape all categories |
   | **Brand** | Leave empty | Scrape all brands |
   | **Dry run** | ☐ Unchecked | Actually scrape (not preview) |
   | **Resume** | ☐ Unchecked | Start fresh |

6. Click **Run workflow** (green button)

---

### Step 4: Monitor the Scraper

1. Click on the running workflow to see details

2. Click on **Scrape PriceOye Products** job

3. Expand steps to see real-time logs:
   - **🕷️ Run Scraper** - Main scraping output
   - **📊 Upload Logs** - Log files saved

4. The scraper will:
   - Process 24 categories
   - Scrape ~64 brand-specific pages
   - Extract product details, specs, and reviews
   - Save to MongoDB

**Expected Duration**: 4-6 hours for full scrape (6 hour timeout set)

---

### Step 5: Verify Data in MongoDB

After scraping completes, check your MongoDB:

```javascript
// Connect to MongoDB Compass
// Database: shopwise

// Check products count
db.products.countDocuments()

// Check recent products
db.products.find().sort({ created_at: -1 }).limit(5)

// Check by category
db.products.countDocuments({ source_category: "mobiles" })
```

---

## 🧪 Optional: Test with Single Category First

If you want to test with just one category first:

1. Go to **Actions** → **PriceOye Scraper** → **Run workflow**

2. Set:
   - **Category**: `Smart Watches` (small category, faster test)
   - **Dry run**: ☐ Unchecked

3. Click **Run workflow**

This will take ~15-30 minutes instead of 4-6 hours.

---

## 📅 Automatic Scheduling

The workflow is already configured to run automatically:

| Schedule | What It Does |
|----------|--------------|
| **Every Sunday 2 AM UTC** | Full scrape of all categories |

To modify the schedule, edit `.github/workflows/scrape-priceoye.yml`:

```yaml
schedule:
  # Run every Sunday at 2 AM UTC
  - cron: '0 2 * * 0'
  
  # To run daily at 3 AM UTC, uncomment:
  # - cron: '0 3 * * *'
```

---

## 🔄 Resume Failed Scrapes

If a scrape fails midway:

1. Go to **Actions** → **PriceOye Scraper** → **Run workflow**

2. Check ☑️ **Resume from last failed scrape**

3. Click **Run workflow**

This continues from where it left off.

---

## 📊 Download Logs

After any run (success or failure):

1. Go to the completed workflow run

2. Scroll down to **Artifacts**

3. Download:
   - `scraper-logs-{number}` - All log files
   - `error-screenshots-{number}` - Screenshots of errors (if any)

---

## ⚠️ Troubleshooting

### "MONGODB_URI environment variable is required"
- Check that you added the `MONGODB_URI` secret correctly
- Make sure there are no typos in the secret name

### "MongoServerSelectionError: connection timed out"
- MongoDB Atlas might be blocking GitHub IPs
- Go to MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)

### Scraper runs but no products saved
- Check that the category mappings exist: `db.categorymappings.find()`
- Check that the platform exists: `db.platforms.find({ name: "PriceOye" })`

### Timeout after 6 hours
- For large scrapes, consider running categories separately
- Use: `--category "Mobiles"` then `--category "Smart Watches"` etc.

---

## 🎯 Quick Reference

| Action | How To |
|--------|--------|
| Run full scrape | Actions → PriceOye Scraper → Run workflow (leave all empty) |
| Scrape one category | Set `Category` to category name (e.g., "Mobiles") |
| Scrape one brand | Set `Brand` to brand name (e.g., "samsung") |
| Preview without scraping | Check ☑️ Dry run |
| Continue failed scrape | Check ☑️ Resume |

---

## ✅ Checklist Before Running

- [ ] Code pushed to GitHub
- [ ] `MONGODB_URI` secret added
- [ ] MongoDB Atlas allows GitHub IPs (0.0.0.0/0)
- [ ] Database seeded (platforms, categories, brands, mappings)

---

## 🎉 You're Ready!

Once you complete Steps 1-3, your scraper will be running on GitHub Actions!

**Need help?** Check the workflow logs for detailed error messages.


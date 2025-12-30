# GitHub Actions Setup for Daraz Scraper

This guide explains how to set up and run the Daraz scraper using GitHub Actions, with special focus on handling large categories (40k+ products) that require pagination splitting.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Workflow Architecture](#workflow-architecture)
3. [Available Workflows](#available-workflows)
4. [Setting Up](#setting-up)
5. [Running the Scraper](#running-the-scraper)
6. [Page Range Strategy](#page-range-strategy)
7. [Monitoring & Logs](#monitoring--logs)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Daraz scraper is designed to handle large e-commerce categories with tens of thousands of products. Key features:

- **Pagination Splitting**: Large categories are split across multiple jobs
- **Sequential Execution**: Jobs run sequentially to avoid overwhelming the target site
- **Review Scraping**: Optional review scraping with configurable limits
- **Resume Capability**: Can resume from a specific page range
- **6-Hour Limit Compliance**: Each job stays under GitHub Actions' 6-hour timeout

### Category Size Estimates

| Category            | Est. Products | Est. Pages | Jobs Needed | Est. Time  |
| ------------------- | ------------- | ---------- | ----------- | ---------- |
| Tablet Accessories  | ~10,000       | ~250       | 1           | ~4 hours   |
| Car Mounts          | ~8,000        | ~200       | 1           | ~3.5 hours |
| Parts & Tools       | ~15,000       | ~375       | 2           | ~6 hours   |
| Cables & Converters | ~40,000       | ~1,000     | 4           | ~16 hours  |
| Phone Cases         | ~50,000       | ~1,250     | 5           | ~20 hours  |

_Times estimated with review scraping enabled (3 review pages per product)_

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    scrape-daraz-all.yml                         │
│                    (Main Orchestrator)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Small      │  │   Medium     │  │       Large          │  │
│  │ Categories   │  │ Categories   │  │    Categories        │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────┤  │
│  │ • Tablet Acc │  │ • Parts &    │  │ • Cables (4 jobs)    │  │
│  │ • Car Mounts │  │   Tools      │  │ • Phone Cases        │  │
│  │              │  │   (2 jobs)   │  │   (5 jobs)           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                scrape-daraz-category.yml                        │
│                  (Reusable Workflow)                            │
├─────────────────────────────────────────────────────────────────┤
│  Inputs:                                                        │
│  • category_name: "Phone Cases"                                 │
│  • start_page: 1                                                │
│  • end_page: 250                                                │
│  • include_reviews: true                                        │
│  • max_review_pages: 3                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   scrape-daraz.js                               │
│                 (Node.js Script)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Available Workflows

### 1. `scrape-daraz-category.yml` (Reusable)

The core reusable workflow that scrapes a single category with pagination support.

**Features:**

- Direct manual trigger OR called by other workflows
- Page range support (`start_page`, `end_page`)
- Review scraping toggle
- 5.8 hour timeout (under 6-hour limit)

**Manual Trigger Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `category_name` | choice | required | Category name |
| `start_page` | number | 1 | Starting page |
| `end_page` | number | 0 | Ending page (0 = unlimited) |
| `include_reviews` | boolean | true | Scrape reviews |
| `max_review_pages` | number | 3 | Max review pages |

### 2. `scrape-daraz-all.yml` (Orchestrator)

Orchestrates scraping of ALL categories with automatic job splitting.

**Features:**

- Runs all categories with proper job splitting
- Sequential execution for large categories
- Weekly schedule (Sundays 2 AM UTC)
- Summary job with results

**Manual Trigger Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `categories` | string | "all" | Comma-separated categories or "all" |
| `include_reviews` | boolean | true | Scrape reviews |
| `dry_run` | boolean | false | Preview mode |
| `pages_per_job` | number | 250 | Max pages per job |

### 3. `scrape-daraz-phone-cases.yml` (Large Category)

Dedicated workflow for Phone Cases (~50k products, 5 batches).

**Features:**

- 5 sequential batches of 250 pages each
- Batch selection for resuming
- Progress tracking across batches

### 4. `scrape-daraz-cables.yml` (Large Category)

Dedicated workflow for Cables & Converters (~40k products, 4 batches).

**Features:**

- 4 sequential batches of 250 pages each
- Batch selection for resuming

### 5. `scrape-daraz-small.yml` (Small Categories)

Quick workflow for smaller categories that fit in a single job.

**Categories:**

- Tablet Accessories
- Car Mounts
- Parts & Tools

---

## Setting Up

### Required Secrets

Add these in: **Settings** → **Secrets and variables** → **Actions**

| Secret        | Description               | Required |
| ------------- | ------------------------- | -------- |
| `MONGODB_URI` | MongoDB connection string | ✅ Yes   |

### MongoDB Connection String Example

```
mongodb+srv://username:password@cluster.mongodb.net/shopwise?retryWrites=true&w=majority
```

---

## Running the Scraper

### Option 1: Scrape All Categories

1. Go to **Actions** → **Scrape Daraz All Categories**
2. Click **Run workflow**
3. Configure options:
   - `categories`: "all" or specific (e.g., "Phone Cases,Car Mounts")
   - `include_reviews`: true/false
4. Click **Run workflow**

### Option 2: Scrape Single Category with Page Range

1. Go to **Actions** → **Scrape Daraz Category**
2. Click **Run workflow**
3. Select category and page range:
   ```
   category_name: "Phone Cases"
   start_page: 251
   end_page: 500
   include_reviews: true
   ```
4. Click **Run workflow**

### Option 3: Use Dedicated Category Workflow

For large categories, use dedicated workflows:

- **Scrape Daraz - Phone Cases**
- **Scrape Daraz - Cables & Converters**

These allow batch selection for easier resuming:

```
start_batch: 2  # Start from batch 2 (pages 251-500)
end_batch: 3    # End at batch 3 (pages 501-750)
```

---

## Page Range Strategy

### Why Split Categories?

GitHub Actions has a **6-hour maximum** job runtime. With review scraping:

- ~1 minute per product (including reviews)
- ~40 products per page
- ~40 minutes per page
- **~9 pages per hour**
- **~54 pages in 6 hours** (safely ~50 pages)

But without reviews or with faster scraping:

- ~10 seconds per product
- ~40 products = 400 seconds = ~7 minutes per page
- **~8-9 pages per hour**
- **~250-300 pages in 5 hours** (safe buffer)

### Recommended Batch Sizes

| With Reviews   | Without Reviews |
| -------------- | --------------- |
| 50 pages/batch | 250 pages/batch |

### Manual Page Range Example

To scrape Phone Cases in 10 batches (manually):

```bash
# Batch 1
node scripts/scrape-daraz.js -c "Phone Cases" -s 1 -e 125 --with-reviews

# Batch 2
node scripts/scrape-daraz.js -c "Phone Cases" -s 126 -e 250 --with-reviews

# ... and so on
```

---

## Monitoring & Logs

### During Execution

1. Go to **Actions** tab
2. Click on the running workflow
3. Click on a job to see live logs

### After Completion

**Artifacts** are uploaded on failure:

- `logs/` - Application logs
- `data/screenshots/` - Error screenshots

### Log Files

| File             | Content     |
| ---------------- | ----------- |
| `combined-*.log` | All logs    |
| `error-*.log`    | Errors only |
| `debug-*.log`    | Debug info  |

---

## Troubleshooting

### Common Issues

#### 1. "No products found"

**Cause:** Page structure changed or anti-bot triggered
**Solution:**

- Check if Daraz is accessible
- Review error screenshots
- Update selectors in `daraz-scraper.js`

#### 2. "Timeout waiting for selector"

**Cause:** Page loading slowly or element missing
**Solution:**

- Increase timeout in scraper config
- Check network conditions
- Verify selector still valid

#### 3. "Job exceeded 6 hours"

**Cause:** Too many pages in one job
**Solution:**

- Reduce `end_page` value
- Disable review scraping
- Use smaller batch sizes

#### 4. "MongoDB connection failed"

**Cause:** Invalid connection string or network issue
**Solution:**

- Verify `MONGODB_URI` secret is correct
- Check IP whitelist in MongoDB Atlas
- Add `0.0.0.0/0` to Atlas IP Access List for GitHub Actions

### Resuming After Failure

If a batch fails:

1. Check which pages were completed in the logs
2. Run the category workflow with:
   ```
   start_page: <last_successful_page + 1>
   end_page: <original_end_page>
   ```

### Performance Optimization

For faster scraping without reviews:

```
include_reviews: false
# OR
max_review_pages: 1
```

---

## CLI Reference

### Local Testing

```bash
# Dry run
node scripts/scrape-daraz.js --category "Phone Cases" --dry-run

# With page range
node scripts/scrape-daraz.js -c "Phone Cases" -s 1 -e 10 --with-reviews

# Without reviews (faster)
node scripts/scrape-daraz.js -c "Phone Cases" --no-reviews

# CI mode (no prompts)
CI=true node scripts/scrape-daraz.js -c "Phone Cases"
```

### Full Options

```
--category, -c <name>     Category name
--start-page, -s <num>    Starting page (default: 1)
--end-page, -e <num>      Ending page (default: unlimited)
--max-pages, -p <num>     Max pages (alternative to end-page)
--max-products, -m <num>  Max products
--with-reviews, -w        Enable reviews (default)
--no-reviews              Disable reviews
--max-review-pages <num>  Max review pages per product
--dry-run, -d             Preview mode
--resume, -r              Resume from progress file
--ci                      CI mode
--help, -h                Show help
```

---

## Weekly Schedule

The orchestrator workflow runs automatically:

- **When:** Sundays at 2:00 AM UTC
- **What:** All categories with reviews
- **Duration:** ~40+ hours total (jobs run sequentially)

To modify schedule, edit `scrape-daraz-all.yml`:

```yaml
schedule:
  - cron: '0 2 * * 0' # Sunday 2 AM UTC
```

---

## Best Practices

1. **Start Small**: Test with `--max-pages 2` first
2. **Monitor First Job**: Watch the first batch before running all
3. **Use Dedicated Workflows**: For large categories, use dedicated workflows
4. **Check Artifacts**: Always review failed job artifacts
5. **Stagger Runs**: Don't run multiple large scrapes simultaneously
6. **Respect Rate Limits**: Keep default delays between requests

---

## File Reference

```
.github/workflows/
├── scrape-daraz-category.yml    # Reusable workflow (core)
├── scrape-daraz-all.yml         # Main orchestrator
├── scrape-daraz-phone-cases.yml # Phone Cases (50k products)
├── scrape-daraz-cables.yml      # Cables & Converters (40k products)
├── scrape-daraz-small.yml       # Small categories
└── seed-database.yml            # Database seeding

scripts/
└── scrape-daraz.js              # Main scraper script

src/scrapers/daraz/
├── daraz-scraper.js             # Scraper class
├── daraz-categories.json        # Category configuration
└── selectors.js                 # DOM selectors
```

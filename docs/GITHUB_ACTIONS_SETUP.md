# GitHub Actions Setup for PriceOye Scraper

This guide explains how to set up and run the PriceOye scraper using GitHub Actions.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setting Up Secrets](#setting-up-secrets)
3. [Workflow Files](#workflow-files)
4. [Running the Scraper](#running-the-scraper)
5. [Scheduling](#scheduling)
6. [Monitoring & Logs](#monitoring--logs)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up GitHub Actions, ensure:

1. ✅ Your code is pushed to a GitHub repository
2. ✅ MongoDB Atlas or a cloud-accessible MongoDB instance is set up
3. ✅ The `scripts/scrape-priceoye.js` and configuration files exist

## Setting Up Secrets

### Required Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/shopwise?retryWrites=true&w=majority` |

### Optional Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for notifications | `https://hooks.slack.com/services/xxx/yyy/zzz` |
| `PROXY_URL` | Proxy server (if needed) | `http://proxy:8080` |

### How to Add Secrets

1. Go to your repository on GitHub
2. Click **Settings** (tab)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the name and value
6. Click **Add secret**

![GitHub Secrets](https://docs.github.com/assets/cb-28266/images/help/repository/actions-secrets.png)

---

## Workflow Files

### 1. Main Scraper (`scrape-priceoye.yml`)

**Location:** `.github/workflows/scrape-priceoye.yml`

**Features:**
- Manual trigger with options (category, brand, dry-run, resume)
- Scheduled full scrape (Sundays at 2 AM UTC)
- Progress caching for resume functionality
- Log and screenshot artifacts
- Slack notifications (optional)

### 2. Category Scrapers (`scrape-categories.yml`)

**Location:** `.github/workflows/scrape-categories.yml`

**Features:**
- Daily category rotation
- Manual category selection
- Optimized for specific categories

---

## Running the Scraper

### Manual Trigger

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **PriceOye Scraper** workflow
4. Click **Run workflow**
5. Fill in options:
   - **Category:** Leave empty for all, or enter category name
   - **Brand:** Leave empty for all, or enter brand name
   - **Dry run:** Check for preview mode
   - **Resume:** Check to continue from last failure

![Run Workflow](https://docs.github.com/assets/cb-33284/images/help/repository/actions-manually-run-workflow.png)

### Command Line (GitHub CLI)

```bash
# Install GitHub CLI first: https://cli.github.com/

# Run full scrape
gh workflow run scrape-priceoye.yml

# Run specific category
gh workflow run scrape-priceoye.yml -f category="Mobiles"

# Run specific brand
gh workflow run scrape-priceoye.yml -f brand="samsung"

# Dry run
gh workflow run scrape-priceoye.yml -f dry_run=true

# Resume failed scrape
gh workflow run scrape-priceoye.yml -f resume=true
```

### API Trigger

```bash
# Using curl
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/scrape-priceoye.yml/dispatches \
  -d '{"ref":"main","inputs":{"category":"Mobiles"}}'
```

---

## Scheduling

### Current Schedule

| Workflow | Schedule | Description |
|----------|----------|-------------|
| Full Scrape | `0 2 * * 0` | Every Sunday at 2 AM UTC |
| Category Rotation | `0 2 * * *` | Daily at 2 AM UTC |

### Modifying Schedule

Edit the `cron` expression in the workflow file:

```yaml
on:
  schedule:
    # ┌───────────── minute (0 - 59)
    # │ ┌───────────── hour (0 - 23)
    # │ │ ┌───────────── day of the month (1 - 31)
    # │ │ │ ┌───────────── month (1 - 12)
    # │ │ │ │ ┌───────────── day of the week (0 - 6, Sunday=0)
    # │ │ │ │ │
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM UTC
```

### Common Cron Expressions

| Expression | Description |
|------------|-------------|
| `0 2 * * *` | Every day at 2 AM |
| `0 2 * * 0` | Every Sunday at 2 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 2 * * 1-5` | Weekdays at 2 AM |
| `0 2 1 * *` | First day of month at 2 AM |

---

## Monitoring & Logs

### Viewing Run Status

1. Go to **Actions** tab in your repository
2. Click on a workflow run to see details
3. Click on a job to see step-by-step logs

### Downloading Artifacts

Artifacts (logs, screenshots) are available for 7 days:

1. Go to **Actions** → Select a run
2. Scroll to **Artifacts** section
3. Click to download

### Log Files

| File | Description |
|------|-------------|
| `combined-*.log` | All scraper logs |
| `error-*.log` | Error logs only |
| `scrape-progress.json` | Progress tracking (for resume) |

---

## Troubleshooting

### Common Issues

#### 1. Timeout Errors

**Problem:** Workflow times out before completing

**Solutions:**
- Increase `timeout-minutes` in workflow
- Scrape fewer categories at once
- Use `--category` flag for specific categories

```yaml
jobs:
  scrape:
    timeout-minutes: 480  # 8 hours
```

#### 2. MongoDB Connection Failed

**Problem:** Cannot connect to MongoDB

**Solutions:**
- Verify `MONGODB_URI` secret is correct
- Ensure MongoDB Atlas allows connections from anywhere (IP whitelist: `0.0.0.0/0`)
- Check if cluster is running

#### 3. Browser/Playwright Errors

**Problem:** Chromium fails to launch

**Solutions:**
- Ensure `npx playwright install chromium --with-deps` runs
- Check if there's enough memory (upgrade runner if needed)

#### 4. Rate Limiting

**Problem:** Getting blocked by PriceOye

**Solutions:**
- Increase delays in `priceoye-categories.json`
- Add proxy support
- Reduce concurrent scraping

### Debug Mode

Add more verbose logging:

```yaml
- name: 🕷️ Run Scraper (Debug)
  env:
    DEBUG: 'true'
    LOG_LEVEL: 'debug'
  run: node scripts/scrape-priceoye.js
```

### Self-Hosted Runners

For more control, use self-hosted runners:

```yaml
jobs:
  scrape:
    runs-on: self-hosted  # Instead of ubuntu-latest
```

---

## Cost Considerations

### GitHub Actions Free Tier

| Plan | Minutes/Month | Storage |
|------|---------------|---------|
| Free | 2,000 | 500 MB |
| Team | 3,000 | 2 GB |
| Enterprise | 50,000 | 50 GB |

### Optimization Tips

1. **Use caching** - npm packages are cached
2. **Parallel jobs** - Split into category-specific jobs
3. **Selective scraping** - Don't scrape everything daily
4. **Self-hosted runners** - Free unlimited minutes

---

## Quick Reference

### Repository Structure

When you push `shopwise-scraping` to GitHub, the structure will be:

```
shopwise-scraping/          # ← This is the GitHub repo root
├── .github/
│   └── workflows/
│       ├── scrape-priceoye.yml      # Main scraper workflow
│       └── scrape-categories.yml    # Category-specific workflow
├── scripts/
│   └── scrape-priceoye.js           # Main scraper script
├── src/
│   └── scrapers/priceoye/
│       ├── priceoye-scraper.js      # Scraper implementation
│       └── priceoye-categories.json # Categories configuration
├── data/                            # Created at runtime
├── logs/                            # Created at runtime
└── package.json
```

### NPM Scripts

```bash
npm run scrape:priceoye           # Run full scrape
npm run scrape:priceoye:dry       # Dry run
npm run scrape:priceoye:resume    # Resume from failure
```

### Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cron Expression Generator](https://crontab.guru/)
- [GitHub CLI](https://cli.github.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

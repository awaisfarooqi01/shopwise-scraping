/**
 * Debug Daraz Connection Issues
 * Tests basic connectivity and identifies anti-bot measures
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { chromium } = require('playwright');

const TEST_URL =
  'https://www.daraz.pk/products/samsung-galaxy-a07-4gb64gb-pta-approved-i924758885-s3981951158.html';

async function debugConnection() {
  let browser = null;

  try {
    console.log('='.repeat(60));
    console.log('🔍 DARAZ CONNECTION DEBUG');
    console.log('='.repeat(60));

    // Test 1: Launch browser with visible UI
    console.log('\n📌 Test 1: Launching browser (visible mode)...');
    browser = await chromium.launch({
      headless: false, // Show the browser to see what's happening
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-PK',
      timezoneId: 'Asia/Karachi',
    });

    // Add anti-detection scripts
    await context.addInitScript(() => {
      // Hide webdriver flag
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'ur-PK'],
      });
    });

    const page = await context.newPage();

    // Test 2: Navigate to Daraz homepage first
    console.log('\n📌 Test 2: Navigating to Daraz homepage...');
    const startTime = Date.now();

    try {
      await page.goto('https://www.daraz.pk', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      console.log(`✅ Homepage loaded in ${Date.now() - startTime}ms`);

      // Check for CAPTCHA or challenge page
      const pageContent = await page.content();
      if (pageContent.includes('captcha') || pageContent.includes('challenge')) {
        console.log('⚠️  CAPTCHA or challenge detected on homepage!');
      }

      // Get page title
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
    } catch (error) {
      console.log(`❌ Homepage failed: ${error.message}`);
    }

    // Test 3: Navigate to product page
    console.log('\n📌 Test 3: Navigating to product page...');
    const productStartTime = Date.now();

    try {
      await page.goto(TEST_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      console.log(`✅ Product page loaded in ${Date.now() - productStartTime}ms`);

      // Check for blocked/challenge page
      const productContent = await page.content();

      if (productContent.includes('captcha') || productContent.includes('challenge')) {
        console.log('⚠️  CAPTCHA or challenge detected!');
      }

      if (productContent.includes('Access Denied') || productContent.includes('blocked')) {
        console.log('❌ Access Denied - IP might be blocked!');
      }

      if (productContent.includes('pdp-mod-product-badge-title')) {
        console.log('✅ Product page content detected - scraping should work!');
      }

      // Get product title if available
      const productTitle = await page
        .$eval('.pdp-mod-product-badge-title', el => el.textContent)
        .catch(() => null);
      if (productTitle) {
        console.log(`📦 Product: ${productTitle.trim()}`);
      }

      // Check response headers
      const response = await page.goto(TEST_URL, { waitUntil: 'commit', timeout: 30000 });
      console.log(`\n📊 Response status: ${response?.status()}`);

      const headers = response?.headers() || {};
      if (headers['cf-ray']) {
        console.log('☁️  Cloudflare detected (cf-ray header present)');
      }
    } catch (error) {
      console.log(`❌ Product page failed: ${error.message}`);

      // Take screenshot
      await page.screenshot({ path: 'logs/debug-daraz-error.png', fullPage: true });
      console.log('📸 Screenshot saved to logs/debug-daraz-error.png');
    }

    // Test 4: Check network conditions
    console.log('\n📌 Test 4: Network check...');
    try {
      const googleResponse = await page.goto('https://www.google.com', { timeout: 10000 });
      console.log(`✅ Google responded with status: ${googleResponse?.status()}`);
    } catch (error) {
      console.log(`❌ Network issue - can't reach Google: ${error.message}`);
    }

    // Wait for user to see the browser
    console.log('\n⏳ Keeping browser open for 30 seconds for inspection...');
    console.log('   (Check if there are any CAPTCHAs or challenges)');
    await page.waitForTimeout(30000);
  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 Browser closed');
    }
    console.log('='.repeat(60));
  }
}

debugConnection();

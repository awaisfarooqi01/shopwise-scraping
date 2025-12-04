// Simple network test
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { chromium } = require('playwright');

async function test() {
  process.stdout.write('Starting test...\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    process.stdout.write('Browser launched\n');

    const page = await browser.newPage();
    process.stdout.write('Page created\n');

    // Test Google
    process.stdout.write('Testing Google... ');
    try {
      await page.goto('https://www.google.com', { timeout: 10000, waitUntil: 'commit' });
      process.stdout.write('OK\n');
    } catch (e) {
      process.stdout.write(`FAIL: ${e.message}\n`);
    }

    // Test PriceOye
    process.stdout.write('Testing PriceOye... ');
    try {
      await page.goto('https://www.priceoye.pk', { timeout: 15000, waitUntil: 'commit' });
      process.stdout.write('OK\n');
    } catch (e) {
      process.stdout.write(`FAIL: ${e.message}\n`);
    }

    // Test Daraz
    process.stdout.write('Testing Daraz... ');
    try {
      await page.goto('https://www.daraz.pk', { timeout: 30000, waitUntil: 'commit' });
      process.stdout.write('OK\n');
    } catch (e) {
      process.stdout.write(`FAIL: ${e.message}\n`);
    }
  } catch (e) {
    process.stdout.write(`Error: ${e.message}\n`);
  } finally {
    if (browser) await browser.close();
    process.stdout.write('Done\n');
    process.exit(0);
  }
}

test();

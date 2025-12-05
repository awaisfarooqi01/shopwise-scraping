/**
 * Debug Daraz Connection Issues
 * Tests basic connectivity and identifies anti-bot measures
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { chromium } = require('playwright');

const TEST_URL = 'https://www.daraz.pk/products/samsung-galaxy-a07-4gb64gb-pta-approved-i924758885-s3981951158.html';

async function debugConnection() {
  let browser = null;

  try {
    console.log('='.repeat(60));
    console.log('🔍 DARAZ CONNECTION DEBUG');
    console.log('='.repeat(60));

    // Test 1: Launch browser in headless mode
    console.log('\n📌 Test 1: Launching browser (headless mode)...');
    browser = await chromium.launch({
      headless: true, // Run headless for automation
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });
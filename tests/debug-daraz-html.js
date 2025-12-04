// Debug script to save HTML and check price selectors
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { DarazScraper } = require('../src/scrapers/daraz');
const cheerio = require('cheerio');

const TEST_URL =
  'https://www.daraz.pk/products/samsung-galaxy-a07-4gb64gb-pta-approved-i924758885-s3981951158.html';

async function debug() {
  let scraper = null;

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Initializing scraper...');
    scraper = new DarazScraper();
    await scraper.initialize();

    console.log('Navigating to page...');
    await scraper.page.goto(TEST_URL, { waitUntil: 'commit', timeout: 30000 });

    // Wait for content
    console.log('Waiting for content...');
    await scraper.page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
    await scraper.page.waitForTimeout(5000);

    // Get HTML
    const html = await scraper.page.content();

    // Save HTML for inspection
    const htmlPath = path.join(__dirname, '..', 'data', 'screenshots', 'daraz-debug.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`HTML saved to: ${htmlPath}`);

    // Parse with cheerio
    const $ = cheerio.load(html);

    console.log('\n=== PRICE SELECTORS DEBUG ===');

    const selectors = [
      '.pdp-price.pdp-price_type_normal',
      '.pdp-price_type_normal',
      '.pdp-price_color_orange',
      '.pdp-price',
      '[data-spm="price"]',
      '.pdp-product-price span',
      '.pdp-product-price',
    ];

    for (const sel of selectors) {
      const text = $(sel).first().text().trim().substring(0, 50);
      const count = $(sel).length;
      console.log(`${sel}: "${text}" (${count} matches)`);
    }

    console.log('\n=== CATEGORY SELECTORS DEBUG ===');
    const breadcrumb = $('.breadcrumb, .pdp-breadcrumb');
    console.log(`Breadcrumb found: ${breadcrumb.length} elements`);
    breadcrumb.find('a').each((i, el) => {
      console.log(`  [${i}] ${$(el).text().trim()}`);
    });

    console.log('\n=== TITLE DEBUG ===');
    console.log(`h1: ${$('h1').first().text().trim().substring(0, 50)}`);
    console.log(
      `h1.pdp-mod-product-badge-title: ${$('h1.pdp-mod-product-badge-title').text().trim().substring(0, 50)}`
    );

    console.log('\n=== JSON-LD DEBUG ===');
    const jsonLd = $('script[type="application/ld+json"]').first().text();
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd);
        console.log(`JSON-LD price: ${data.offers?.price || 'N/A'}`);
        console.log(`JSON-LD name: ${data.name?.substring(0, 50) || 'N/A'}`);
      } catch (e) {
        console.log('JSON-LD parse error:', e.message);
      }
    } else {
      console.log('No JSON-LD found');
    }

    console.log('\n=== META TAGS DEBUG ===');
    console.log(
      `og:title: ${$('meta[property="og:title"]').attr('content')?.substring(0, 50) || 'N/A'}`
    );
    console.log(
      `product:price:amount: ${$('meta[property="product:price:amount"]').attr('content') || 'N/A'}`
    );
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (scraper) await scraper.close();
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  }
}

debug();

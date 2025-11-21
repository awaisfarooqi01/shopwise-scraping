console.log('Test 1: Script started');

const playwright = require('playwright');
console.log('Test 2: Playwright imported');

async function test() {
  console.log('Test 3: Function started');
  const browser = await playwright.chromium.launch({ headless: true });
  console.log('Test 4: Browser launched');
  await browser.close();
  console.log('Test 5: Browser closed');
}

test().then(() => {
  console.log('Test 6: Complete');
  process.exit(0);
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});

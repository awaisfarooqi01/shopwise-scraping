/**
 * Test scraping discontinued products with anonymous reviews
 * Tests: https://priceoye.pk/mobiles/apple/apple-iphone-8-plus
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PriceOyeScraper = require('../src/scrapers/priceoye/priceoye-scraper');
const Product = require('../src/models/Product');
const Review = require('../src/models/Review');

async function testDiscontinuedProduct() {
  console.log('🧪 Testing Discontinued Product Scraping\n');
  console.log('========================================\n');
  
  let scraper;
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Initialize scraper
    console.log('🚀 Initializing PriceOye scraper...');
    scraper = new PriceOyeScraper();
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');
    
    // Test URL for discontinued iPhone 8 Plus
    const testUrl = 'https://priceoye.pk/mobiles/apple/apple-iphone-8-plus';
    console.log(`📱 Testing discontinued product: ${testUrl}\n`);
    
    // Scrape the product
    console.log('🔍 Scraping product...');
    const result = await scraper.scrapeProduct(testUrl);
    
    if (!result.success) {
      console.error('❌ Scraping failed:', result.error);
      return;
    }
    
    console.log('\n✅ Scraping successful!\n');
    console.log('📊 Product Information:');
    console.log('========================');
    console.log(`Name: ${result.data.name}`);
    console.log(`Brand: ${result.data.brand}`);
    console.log(`Price: ${result.data.price}`);
    console.log(`Currency: ${result.data.currency}`);
    console.log(`Availability: ${result.data.availability}`);
    console.log(`Positive %: ${result.data.positive_percent}`);
    console.log(`Platform ID: ${result.data.platform_product_id}`);
    
    // Check discontinued status
    if (result.data.platform_metadata && result.data.platform_metadata.discontinued) {
      console.log(`⚠️ Discontinued: ${result.data.platform_metadata.discontinued}`);
    }
    
    // Query saved product from DB
    console.log('\n🔍 Querying saved product from database...');
    const savedProduct = await Product.findOne({ 
      platform_product_id: result.data.platform_product_id 
    });
    
    if (savedProduct) {
      console.log('✅ Product found in database');
      console.log(`   Positive %: ${savedProduct.positive_percent}`);
      console.log(`   Availability: ${savedProduct.availability}`);
    }
    
    // Query reviews for this product
    console.log('\n📝 Querying reviews from database...');
    const reviews = await Review.find({ 
      platform_product_id: result.data.platform_product_id 
    }).sort({ review_date: -1 });
    
    console.log(`\n📊 Reviews Found: ${reviews.length}`);
    console.log('========================');
    
    if (reviews.length > 0) {
      // Count anonymous reviews
      const anonymousCount = reviews.filter(r => r.reviewer_name === 'Anonymous').length;
      const namedCount = reviews.length - anonymousCount;
      
      console.log(`👤 Named Reviews: ${namedCount}`);
      console.log(`👻 Anonymous Reviews: ${anonymousCount}`);
      
      // Show sample reviews
      console.log('\n📋 Sample Reviews:');
      reviews.slice(0, 5).forEach((review, idx) => {
        console.log(`\n${idx + 1}. ${review.reviewer_name} - ${review.rating}⭐`);
        console.log(`   Date: ${review.review_date}`);
        console.log(`   Verified: ${review.verified_purchase}`);
        console.log(`   Text: ${review.text.substring(0, 100)}...`);
        console.log(`   Needs Analysis: ${review.sentiment_analysis?.needs_analysis}`);
        if (review.images && review.images.length > 0) {
          console.log(`   Images: ${review.images.length}`);
        }
      });
      
      // Check sentiment analysis flags
      const needsAnalysis = reviews.filter(r => r.sentiment_analysis?.needs_analysis).length;
      console.log(`\n🧠 Reviews needing sentiment analysis: ${needsAnalysis}/${reviews.length}`);
    } else {
      console.log('⚠️ No reviews found for this product');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (scraper) {
      console.log('\n🧹 Closing scraper...');
      await scraper.close();
    }
    
    console.log('🔌 Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('✅ Test completed');
  }
}

// Run the test
testDiscontinuedProduct();

/**
 * Check Reviews in Database
 * Helper script to see how many reviews exist for a product
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkReviews() {
  try {
    console.log('\n📊 Checking Reviews in Database...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const Review = mongoose.model('Review');
    const Product = mongoose.model('Product');
    
    // Find Samsung S23 Ultra product
    const product = await Product.findOne({ 
      name: /Samsung Galaxy S23 Ultra/i 
    }).sort({ createdAt: -1 });
    
    if (!product) {
      console.log('❌ Samsung Galaxy S23 Ultra not found in database');
      process.exit(0);
    }
    
    console.log(`📦 Product: ${product.name}`);
    console.log(`   ID: ${product._id}`);
    console.log(`   Category: ${product.category_name} (${product.category_id})`);
    console.log(`   Subcategory: ${product.subcategory_name} (${product.subcategory_id})`);
    console.log(`   Brand: ${product.brand} (${product.brand_id})`);
    console.log(`   Review Count (metadata): ${product.review_count}\n`);
    
    // Get all reviews for this product
    const reviews = await Review.find({ product_id: product._id }).sort({ createdAt: -1 });
    
    console.log(`💬 Reviews in Database: ${reviews.length}\n`);
    
    if (reviews.length > 0) {
      console.log('📝 Review List:\n');
      
      // Group by reviewer name to detect duplicates
      const reviewsByName = {};
      
      reviews.forEach((review, index) => {
        const key = `${review.reviewer_name}_${review.rating}_${review.review_date?.toDateString()}`;
        
        if (!reviewsByName[key]) {
          reviewsByName[key] = [];
        }
        reviewsByName[key].push(review);
        
        console.log(`   ${index + 1}. ${review.reviewer_name} - ${review.rating}⭐`);
        console.log(`      Date: ${review.review_date?.toLocaleDateString() || 'N/A'}`);
        console.log(`      Text: ${review.text?.substring(0, 60)}...`);
        console.log(`      ID: ${review._id}`);
        console.log(`      Created: ${review.createdAt?.toLocaleString()}\n`);
      });
      
      // Check for duplicates
      const duplicateGroups = Object.entries(reviewsByName).filter(([_, reviews]) => reviews.length > 1);
      
      if (duplicateGroups.length > 0) {
        console.log('⚠️  DUPLICATES DETECTED:\n');
        duplicateGroups.forEach(([key, dupes]) => {
          console.log(`   🔴 ${key}`);
          console.log(`      Count: ${dupes.length} duplicates`);
          dupes.forEach(dup => {
            console.log(`      - ${dup._id} (created: ${dup.createdAt?.toLocaleString()})`);
          });
          console.log('');
        });
      } else {
        console.log('✅ No duplicates detected!\n');
      }
    } else {
      console.log('ℹ️  No reviews found for this product\n');
    }
    
    await mongoose.disconnect();
    console.log('✅ Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkReviews();

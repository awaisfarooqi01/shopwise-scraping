/**
 * Debug Reviews - Check why duplicates are being created
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function debugReviews() {
  try {
    console.log('\n🔍 Debugging Review Duplicates...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Review = mongoose.model('Review');
    const Product = mongoose.model('Product');
    
    // Find Samsung S23 Ultra
    const product = await Product.findOne({ 
      name: /Samsung Galaxy S23 Ultra/i 
    }).sort({ createdAt: -1 });
    
    if (!product) {
      console.log('❌ Product not found');
      process.exit(0);
    }
    
    console.log(`📦 Product: ${product.name}`);
    console.log(`   Product ID: ${product._id}\n`);
    
    // Get all reviews
    const reviews = await Review.find({ product_id: product._id }).sort({ createdAt: 1 });
    
    console.log(`💬 Total Reviews: ${reviews.length}\n`);
    
    if (reviews.length > 0) {
      // Group by key fields to find duplicates
      const reviewGroups = {};
      
      reviews.forEach((review, index) => {
        const key = `${review.reviewer_name}|${review.rating}|${review.review_date?.toISOString()}`;
        
        if (!reviewGroups[key]) {
          reviewGroups[key] = [];
        }
        
        reviewGroups[key].push({
          id: review._id.toString(),
          reviewer: review.reviewer_name,
          rating: review.rating,
          date: review.review_date?.toISOString(),
          text: review.text?.substring(0, 50),
          product_id: review.product_id?.toString(),
          platform_id: review.platform_id?.toString(),
          createdAt: review.createdAt?.toISOString(),
        });
      });
      
      // Show all review groups
      console.log('📊 REVIEW GROUPS (grouped by name+rating+date):\n');
      
      let duplicateCount = 0;
      
      Object.entries(reviewGroups).forEach(([key, group]) => {
        const [name, rating, date] = key.split('|');
        
        if (group.length > 1) {
          console.log(`🔴 DUPLICATE GROUP (${group.length} copies):`);
          duplicateCount += group.length - 1;
        } else {
          console.log(`✅ UNIQUE:`);
        }
        
        console.log(`   Reviewer: ${name}`);
        console.log(`   Rating: ${rating}⭐`);
        console.log(`   Date: ${new Date(date).toLocaleString()}`);
        console.log(`   Text: ${group[0].text}...`);
        
        group.forEach((rev, idx) => {
          console.log(`   \n   Copy ${idx + 1}:`);
          console.log(`      Review ID: ${rev.id}`);
          console.log(`      Product ID: ${rev.product_id}`);
          console.log(`      Platform ID: ${rev.platform_id}`);
          console.log(`      Created At: ${new Date(rev.createdAt).toLocaleString()}`);
        });
        
        console.log('\n' + '-'.repeat(80) + '\n');
      });
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`   Total Reviews: ${reviews.length}`);
      console.log(`   Unique Reviews: ${Object.keys(reviewGroups).length}`);
      console.log(`   Duplicate Count: ${duplicateCount}`);
      
      if (duplicateCount > 0) {
        console.log(`\n⚠️  ${duplicateCount} DUPLICATES FOUND!\n`);
        console.log('🔍 Checking why duplicates exist...\n');
        
        // Analyze the duplicate detection logic
        const duplicateGroups = Object.entries(reviewGroups).filter(([_, g]) => g.length > 1);
        
        for (const [key, group] of duplicateGroups) {
          console.log(`Analyzing duplicate: ${group[0].reviewer}\n`);
          
          // Check if they would match the query
          const first = group[0];
          const second = group[1];
          
          console.log('   Comparison:');
          console.log(`   Product ID match: ${first.product_id === second.product_id}`);
          console.log(`   Platform ID match: ${first.platform_id === second.platform_id}`);
          console.log(`   Reviewer name match: ${first.reviewer === second.reviewer}`);
          console.log(`   Date match: ${first.date === second.date}`);
          console.log(`   Text match: ${first.text === second.text}`);
          
          // Test the actual query
          console.log('\n   Testing duplicate detection query...');
          
          const testQuery = {
            product_id: mongoose.Types.ObjectId(first.product_id),
            platform_id: mongoose.Types.ObjectId(first.platform_id),
            reviewer_name: first.reviewer,
            $or: [
              { review_date: new Date(first.date) },
              { text: reviews.find(r => r._id.toString() === first.id).text }
            ]
          };
          
          console.log('   Query:', JSON.stringify(testQuery, null, 2));
          
          const matches = await Review.find(testQuery);
          console.log(`   Query found ${matches.length} matches (should be ${group.length})\n`);
        }
      } else {
        console.log(`\n✅ NO DUPLICATES - Deduplication working correctly!\n`);
      }
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugReviews();

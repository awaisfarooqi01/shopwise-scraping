/**
 * Delete all reviews for Samsung S23 Ultra
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function deleteReviews() {
  try {
    console.log('\n🗑️  Deleting reviews for Samsung S23 Ultra...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Review = mongoose.model('Review');
    const Product = mongoose.model('Product');
    
    // Find product
    const product = await Product.findOne({ 
      name: /Samsung Galaxy S23 Ultra/i 
    }).sort({ createdAt: -1 });
    
    if (!product) {
      console.log('❌ Product not found');
      process.exit(0);
    }
    
    console.log(`📦 Product: ${product.name}`);
    console.log(`   ID: ${product._id}\n`);
    
    // Delete all reviews for this product
    const result = await Review.deleteMany({ product_id: product._id });
    
    console.log(`✅ Deleted ${result.deletedCount} reviews\n`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteReviews();

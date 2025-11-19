/**
 * UPDATED REVIEW SCRAPING METHOD
 * 
 * Replace the existing `scrapeProductReviews` method in priceoye-scraper.js
 * with this implementation that handles "Show More" button pagination
 */

  /**
   * Scrape all reviews for a product from its reviews page (with pagination via "Show More")
   * @param {string} productId - MongoDB product ID
   * @param {string} productUrl - Product URL
   * @returns {Array} Array of review objects
   */
  async scrapeProductReviews(productId, productUrl) {
    try {
      logger.info(`\n💬 Scraping reviews for product...`);
      
      // Navigate to dedicated reviews page
      const reviewsUrl = productUrl.endsWith('/') 
        ? `${productUrl}reviews` 
        : `${productUrl}/reviews`;
      
      logger.info(`   📍 Navigating to: ${reviewsUrl}`);
      await this.goto(reviewsUrl);
      
      // Wait for reviews container to load
      logger.info('   ⏳ Waiting for reviews container...');
      try {
        await this.page.waitForSelector('.user-reviews, .section-body, .review-box', { 
          timeout: 10000 
        });
        await this.page.waitForTimeout(2000); // Additional wait for dynamic content
      } catch (e) {
        logger.warn('   ⚠️  Review elements not found, trying to extract anyway...');
      }
      
      // Collect all reviews across multiple "Show More" clicks
      const allReviews = [];
      let clickCount = 0;
      const maxClicks = 20; // Safeguard (20 clicks × 20 reviews = 400 reviews max)
      
      while (clickCount < maxClicks) {
        // Extract reviews from current page state
        const currentReviews = await this.extractReviewsFromCurrentPage(productId);
        
        // Add new reviews that aren't duplicates
        const newReviews = currentReviews.filter(review => 
          !allReviews.some(existing => 
            existing.reviewer_name === review.reviewer_name && 
            existing.review_date.getTime() === review.review_date.getTime()
          )
        );
        
        allReviews.push(...newReviews);
        
        logger.info(`   📦 Batch ${clickCount + 1}: Found ${currentReviews.length} reviews (${newReviews.length} new, ${allReviews.length} total)`);
        
        // Check if "Show More" button exists and is clickable
        const hasMoreReviews = await this.page.evaluate(() => {
          const showMoreBtn = document.querySelector('.show-more-btn button');
          return showMoreBtn && !showMoreBtn.disabled && showMoreBtn.offsetParent !== null;
        });
        
        if (!hasMoreReviews) {
          logger.info('   ✅ No more reviews to load');
          break;
        }
        
        // Click "Show More" button
        try {
          logger.info('   🔄 Clicking "Show More" button...');
          await this.page.click('.show-more-btn button');
          
          // Wait for new reviews to load (wait for DOM changes)
          await this.page.waitForTimeout(2000);
          
          // Wait for new review boxes to appear
          await this.page.waitForFunction(
            (previousCount) => {
              const currentCount = document.querySelectorAll('.review-box').length;
              return currentCount > previousCount;
            },
            { timeout: 5000 },
            currentReviews.length
          );
          
          clickCount++;
          
        } catch (error) {
          logger.info(`   ⚠️  Could not click "Show More" or load new reviews: ${error.message}`);
          break;
        }
      }
      
      if (allReviews.length > 0) {
        logger.info(`   ✅ Total reviews scraped: ${allReviews.length}`);
        
        // Save reviews to database
        await this.saveReviews(allReviews);
      } else {
        logger.info('   ℹ️  No reviews found');
        
        // Take screenshot for debugging
        if (this.config.page.screenshotOnError) {
          await this.takeScreenshot(`no-reviews-${Date.now()}`);
        }
      }
      
      return allReviews;
      
    } catch (error) {
      logger.error('   ❌ Failed to scrape reviews:', error.message);
      return [];
    }
  }

  /**
   * Extract reviews from currently loaded page (handles dynamic content)
   * Uses actual PriceOye HTML structure
   * @param {string} productId - MongoDB product ID
   * @returns {Array} Array of review objects
   */
  async extractReviewsFromCurrentPage(productId) {
    try {
      logger.info('   🔍 Extracting reviews from current page...');
      
      const reviews = await this.page.evaluate((productIdStr, platformId, platformName) => {
        const reviewElements = [];
        
        // PriceOye specific selectors (from actual HTML)
        const reviewBoxes = document.querySelectorAll('.review-box');
        
        if (reviewBoxes.length === 0) {
          console.log('No review boxes found');
          return [];
        }
        
        console.log(`Found ${reviewBoxes.length} review boxes`);
        
        reviewBoxes.forEach(box => {
          try {
            // Extract reviewer name (note the typo "reivew" in PriceOye HTML)
            const nameEl = box.querySelector('.user-reivew-name h5');
            const reviewerName = nameEl ? nameEl.textContent.trim() : 'Anonymous';
            
            // Extract rating - count filled stars (contains "stars.svg")
            const starElements = box.querySelectorAll('.rating-star img');
            let rating = 0;
            starElements.forEach(star => {
              const src = star.getAttribute('src') || '';
              if (src.includes('stars.svg')) {
                rating++;
              }
            });
            
            // Extract review text
            const textEl = box.querySelector('.user-reivew-description');
            const text = textEl ? textEl.textContent.trim() : '';
            
            // Extract date
            const dateEl = box.querySelector('.review-date');
            let reviewDate = new Date().toISOString();
            if (dateEl) {
              const dateStr = dateEl.textContent.trim();
              const parsed = new Date(dateStr);
              if (!isNaN(parsed.getTime())) {
                reviewDate = parsed.toISOString();
              }
            }
            
            // Check for verified purchase
            const verifiedEl = box.querySelector('.verified-user');
            const verifiedPurchase = verifiedEl !== null;
            
            // Extract review images
            const images = [];
            const imgElements = box.querySelectorAll('.review-images img');
            imgElements.forEach(img => {
              const src = img.getAttribute('src') || img.getAttribute('data-src');
              if (src) {
                const fullUrl = src.startsWith('http') ? src : `https://images.priceoye.pk${src}`;
                images.push(fullUrl);
              }
            });
            
            // Only add if we have a valid rating
            if (rating >= 1 && rating <= 5 && reviewerName) {
              reviewElements.push({
                product_id: productIdStr,
                platform_id: platformId,
                platform_name: platformName,
                reviewer_name: reviewerName,
                rating: rating,
                text: text,
                review_date: reviewDate,
                helpful_votes: 0, // PriceOye doesn't show helpful votes
                verified_purchase: verifiedPurchase,
                images: images,
                sentiment_analysis: {
                  needs_analysis: true
                },
                is_active: true
              });
            }
          } catch (err) {
            console.error('Error parsing review box:', err.message);
          }
        });
        
        return reviewElements;
      }, productId, this.platform._id.toString(), this.platform.name);
      
      if (reviews.length > 0) {
        logger.info(`   ✅ Extracted ${reviews.length} reviews from HTML`);
        
        // Convert review_date strings back to Date objects
        return reviews.map(r => ({
          ...r,
          review_date: new Date(r.review_date),
          platform_id: this.platform._id // Restore ObjectId
        }));
      }
      
      logger.info('   ℹ️  No reviews found in HTML');
      return [];
      
    } catch (error) {
      logger.error('   ⚠️  Failed to extract reviews:', error.message);
      return [];
    }
  }

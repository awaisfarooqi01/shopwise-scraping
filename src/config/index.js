/**
 * Global configuration for scraping service and batch scripts.
 */

require('dotenv').config();

const mongodb = {
  // Prefer MONGODB_URI (used in GitHub Actions workflow)
  uri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shopwise',
  options: {
    autoIndex: true,
  },
};

module.exports = {
  mongodb,
};

/**
 * Brand Seeder for Production
 * Seeds popular brands for Pakistani e-commerce platforms
 * Focused on brands available on PriceOye and similar platforms
 */

const Brand = require('../../models/Brand');
const { logger } = require('../../utils/logger');

const brands = [
  // ============================================
  // MOBILE PHONE BRANDS
  // ============================================
  {
    name: 'Samsung',
    normalized_name: 'samsung',
    aliases: ['SAMSUNG', 'Samsung Official', 'Samsung Electronics', 'Samsung Galaxy'],
    country: 'South Korea',
    is_verified: true,
    popularity_score: 95,
  },
  {
    name: 'Apple',
    normalized_name: 'apple',
    aliases: ['APPLE', 'Apple Inc', 'Apple Official', 'iPhone', 'iPad'],
    country: 'USA',
    is_verified: true,
    popularity_score: 98,
  },
  {
    name: 'Xiaomi',
    normalized_name: 'xiaomi',
    aliases: ['XIAOMI', 'Xiaomi Official', 'MI', 'Redmi', 'POCO', 'Poco'],
    country: 'China',
    is_verified: true,
    popularity_score: 90,
  },
  {
    name: 'Vivo',
    normalized_name: 'vivo',
    aliases: ['VIVO', 'Vivo Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 75,
  },
  {
    name: 'Oppo',
    normalized_name: 'oppo',
    aliases: ['OPPO', 'Oppo Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 78,
  },
  {
    name: 'Realme',
    normalized_name: 'realme',
    aliases: ['REALME', 'Realme Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 72,
  },
  {
    name: 'Infinix',
    normalized_name: 'infinix',
    aliases: ['INFINIX', 'Infinix Official'],
    country: 'Hong Kong',
    is_verified: true,
    popularity_score: 70,
  },
  {
    name: 'Tecno',
    normalized_name: 'tecno',
    aliases: ['TECNO', 'Tecno Official', 'Tecno Mobile'],
    country: 'Hong Kong',
    is_verified: true,
    popularity_score: 68,
  },
  {
    name: 'Nokia',
    normalized_name: 'nokia',
    aliases: ['NOKIA', 'Nokia Official', 'HMD Global', 'HMD'],
    country: 'Finland',
    is_verified: true,
    popularity_score: 65,
  },
  {
    name: 'Huawei',
    normalized_name: 'huawei',
    aliases: ['HUAWEI', 'Huawei Official', 'Honor'],
    country: 'China',
    is_verified: true,
    popularity_score: 60,
  },
  {
    name: 'itel',
    normalized_name: 'itel',
    aliases: ['ITEL', 'Itel Official', 'iTel'],
    country: 'Hong Kong',
    is_verified: true,
    popularity_score: 55,
  },
  {
    name: 'QMobile',
    normalized_name: 'qmobile',
    aliases: ['QMOBILE', 'Q-Mobile', 'QMobile Official'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 50,
  },
  {
    name: 'ZTE',
    normalized_name: 'zte',
    aliases: ['ZTE Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 45,
  },
  {
    name: 'Nothing',
    normalized_name: 'nothing',
    aliases: ['NOTHING', 'Nothing Official', 'Nothing Phone'],
    country: 'UK',
    is_verified: true,
    popularity_score: 60,
  },
  {
    name: 'Google',
    normalized_name: 'google',
    aliases: ['GOOGLE', 'Google Official', 'Pixel', 'Google Pixel'],
    country: 'USA',
    is_verified: true,
    popularity_score: 75,
  },
  {
    name: 'OnePlus',
    normalized_name: 'oneplus',
    aliases: ['ONEPLUS', 'OnePlus Official', 'One Plus', '1+'],
    country: 'China',
    is_verified: true,
    popularity_score: 70,
  },
  {
    name: 'XMobile',
    normalized_name: 'xmobile',
    aliases: ['XMOBILE', 'X-Mobile'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 35,
  },

  // ============================================
  // LAPTOP BRANDS
  // ============================================
  {
    name: 'HP',
    normalized_name: 'hp',
    aliases: ['HP Official', 'Hewlett-Packard', 'Hewlett Packard'],
    country: 'USA',
    is_verified: true,
    popularity_score: 88,
  },
  {
    name: 'Dell',
    normalized_name: 'dell',
    aliases: ['DELL', 'Dell Official', 'Dell Technologies'],
    country: 'USA',
    is_verified: true,
    popularity_score: 90,
  },
  {
    name: 'Lenovo',
    normalized_name: 'lenovo',
    aliases: ['LENOVO', 'Lenovo Official', 'ThinkPad', 'IdeaPad'],
    country: 'China',
    is_verified: true,
    popularity_score: 87,
  },
  {
    name: 'Asus',
    normalized_name: 'asus',
    aliases: ['ASUS', 'Asus Official', 'ROG', 'Republic of Gamers'],
    country: 'Taiwan',
    is_verified: true,
    popularity_score: 82,
  },
  {
    name: 'Acer',
    normalized_name: 'acer',
    aliases: ['ACER', 'Acer Official', 'Predator', 'Nitro'],
    country: 'Taiwan',
    is_verified: true,
    popularity_score: 75,
  },

  // ============================================
  // SMARTWATCH & WEARABLE BRANDS
  // ============================================
  {
    name: 'Zero',
    normalized_name: 'zero',
    aliases: ['ZERO', 'Zero Lifestyle'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 55,
  },
  {
    name: 'Yolo',
    normalized_name: 'yolo',
    aliases: ['YOLO', 'Yolo Official'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 50,
  },
  {
    name: 'Dany',
    normalized_name: 'dany',
    aliases: ['DANY', 'Dany Official'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 45,
  },
  {
    name: 'Faster',
    normalized_name: 'faster',
    aliases: ['FASTER', 'Faster Official'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 50,
  },
  {
    name: 'Ronin',
    normalized_name: 'ronin',
    aliases: ['RONIN', 'Ronin Official'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 48,
  },

  // ============================================
  // AUDIO BRANDS
  // ============================================
  {
    name: 'JBL',
    normalized_name: 'jbl',
    aliases: ['JBL Official'],
    country: 'USA',
    is_verified: true,
    popularity_score: 85,
  },
  {
    name: 'SoundPeats',
    normalized_name: 'soundpeats',
    aliases: ['SOUNDPEATS', 'Sound Peats'],
    country: 'China',
    is_verified: true,
    popularity_score: 60,
  },
  {
    name: 'Audionic',
    normalized_name: 'audionic',
    aliases: ['AUDIONIC', 'Audionic Official'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 55,
  },
  {
    name: 'Airox',
    normalized_name: 'airox',
    aliases: ['AIROX', 'Airox Official'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 45,
  },

  // ============================================
  // POWER BANK & ACCESSORY BRANDS
  // ============================================
  {
    name: 'Baseus',
    normalized_name: 'baseus',
    aliases: ['BASEUS', 'Baseus Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 70,
  },
  {
    name: 'Joyroom',
    normalized_name: 'joyroom',
    aliases: ['JOYROOM', 'Joyroom Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 60,
  },
  {
    name: 'Anker',
    normalized_name: 'anker',
    aliases: ['ANKER', 'Anker Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 80,
  },

  // ============================================
  // TV BRANDS
  // ============================================
  {
    name: 'TCL',
    normalized_name: 'tcl',
    aliases: ['TCL Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 75,
  },
  {
    name: 'Sony',
    normalized_name: 'sony',
    aliases: ['SONY', 'Sony Official'],
    country: 'Japan',
    is_verified: true,
    popularity_score: 90,
  },
  {
    name: 'LG',
    normalized_name: 'lg',
    aliases: ['LG Official', 'LG Electronics'],
    country: 'South Korea',
    is_verified: true,
    popularity_score: 85,
  },
  {
    name: 'EcoStar',
    normalized_name: 'ecostar',
    aliases: ['ECOSTAR', 'Eco Star'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 55,
  },

  // ============================================
  // HOME APPLIANCE BRANDS
  // ============================================
  {
    name: 'Gree',
    normalized_name: 'gree',
    aliases: ['GREE', 'Gree Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 75,
  },
  {
    name: 'Kenwood',
    normalized_name: 'kenwood',
    aliases: ['KENWOOD', 'Kenwood Official'],
    country: 'Japan',
    is_verified: true,
    popularity_score: 70,
  },
  {
    name: 'Haier',
    normalized_name: 'haier',
    aliases: ['HAIER', 'Haier Official'],
    country: 'China',
    is_verified: true,
    popularity_score: 80,
  },
  {
    name: 'Dawlance',
    normalized_name: 'dawlance',
    aliases: ['DAWLANCE', 'Dawlance Official'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 85,
  },
  {
    name: 'PEL',
    normalized_name: 'pel',
    aliases: ['PEL Official', 'Pak Elektron'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 80,
  },
  {
    name: 'Orient',
    normalized_name: 'orient',
    aliases: ['ORIENT', 'Orient Official', 'Orient Electronics'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 75,
  },
  {
    name: 'Beurer',
    normalized_name: 'beurer',
    aliases: ['BEURER', 'Beurer Official'],
    country: 'Germany',
    is_verified: true,
    popularity_score: 60,
  },

  // ============================================
  // MOTORCYCLE BRANDS
  // ============================================
  {
    name: 'Honda',
    normalized_name: 'honda',
    aliases: ['HONDA', 'Honda Official', 'Atlas Honda'],
    country: 'Japan',
    is_verified: true,
    popularity_score: 95,
  },
  {
    name: 'Yamaha',
    normalized_name: 'yamaha',
    aliases: ['YAMAHA', 'Yamaha Official'],
    country: 'Japan',
    is_verified: true,
    popularity_score: 90,
  },
  {
    name: 'Suzuki',
    normalized_name: 'suzuki',
    aliases: ['SUZUKI', 'Suzuki Official', 'Pak Suzuki'],
    country: 'Japan',
    is_verified: true,
    popularity_score: 85,
  },
  {
    name: 'United',
    normalized_name: 'united',
    aliases: ['UNITED', 'United Motorcycles', 'United Auto'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 70,
  },
  {
    name: 'Road Prince',
    normalized_name: 'road-prince',
    aliases: ['ROAD PRINCE', 'RoadPrince'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 65,
  },
  {
    name: 'Super Power',
    normalized_name: 'super-power',
    aliases: ['SUPER POWER', 'SuperPower', 'SP'],
    country: 'Pakistan',
    is_verified: true,
    popularity_score: 60,
  },

  // ============================================
  // TABLET BRANDS
  // ============================================
  {
    name: 'G-Tide',
    normalized_name: 'g-tide',
    aliases: ['G-TIDE', 'GTide', 'G Tide'],
    country: 'China',
    is_verified: true,
    popularity_score: 45,
  },

  // ============================================
  // GENERIC / MISC
  // ============================================
  {
    name: 'Assorted',
    normalized_name: 'assorted',
    aliases: ['ASSORTED', 'Various', 'Mixed', 'Generic'],
    country: 'Various',
    is_verified: false,
    popularity_score: 20,
  },
  {
    name: 'Zentality',
    normalized_name: 'zentality',
    aliases: ['ZENTALITY'],
    country: 'Unknown',
    is_verified: false,
    popularity_score: 30,
  },
];

const seedBrands = async () => {
  try {
    logger.info('🌱 Seeding brands...');

    const results = [];
    
    for (const brandData of brands) {
      // Use upsert based on normalized_name to avoid duplicates
      const brand = await Brand.findOneAndUpdate(
        { normalized_name: brandData.normalized_name },
        brandData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(brand);
    }

    logger.info(`✅ Successfully seeded ${results.length} brands`);
    return results;
  } catch (error) {
    logger.error('Error seeding brands:', error);
    throw error;
  }
};

module.exports = { seedBrands, brands };

/**
 * Sentiment Analyzer Service
 *
 * Uses Groq API with Llama-3.1-8b-instant to analyze product reviews
 * for sentiment classification and fake review detection.
 *
 * Follows Groq official docs: https://console.groq.com/docs/quickstart
 *
 * @module services/sentiment-analyzer
 */

const Groq = require('groq-sdk');
const { logger } = require('../utils/logger');

// ---------- Configuration ----------

const GROQ_API_KEYS = (process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const MAX_RETRIES = parseInt(process.env.SENTIMENT_MAX_RETRIES || '3', 10);
const DELAY_MS = parseInt(process.env.SENTIMENT_DELAY_MS || '2200', 10);

// ---------- Groq Client & Rotation ----------

let currentKeyIndex = 0;
let groqClients = {};

function getGroqClient() {
  if (GROQ_API_KEYS.length === 0) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  
  if (!groqClients[currentKeyIndex]) {
    const key = GROQ_API_KEYS[currentKeyIndex];
    // Mask key for logs (show only first 8 and last 4 chars)
    const maskedKey = key.length > 12 ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : '[masked]';
    
    groqClients[currentKeyIndex] = new Groq({ apiKey: key });
    logger.info(`Groq client initialized for key index ${currentKeyIndex} (${maskedKey})`, { model: GROQ_MODEL });
  }
  return groqClients[currentKeyIndex];
}

function rotateKey() {
  if (GROQ_API_KEYS.length <= 1) {
    return false;
  }
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
  logger.warn(`Rotating to Groq API Key at index ${currentKeyIndex} (Total keys: ${GROQ_API_KEYS.length})...`);
  return true;
}

// ---------- System Prompt ----------

const SYSTEM_PROMPT = `You are an expert computational linguist and e-commerce integrity investigator specializing in opinion spam and fake review detection for ShopWise. Your task is to analyze user reviews and output structured JSON.

Evaluate reviews based on the following scientific dimensions of fraud detection:
1. **Linguistic Density & Specificity**: Genuine reviews describe tangible product properties (e.g., performance, camera, battery, build). Generic praise ("good", "great product") without specifics is low-density but common. If a review is completely devoid of product reference AND has extreme ratings without context, flag as suspicious.
2. **Sentiment-Rating Congruence**: Flag if the text sentiment strongly contradicts the numerical rating (e.g., text describes a broken item but rating is 5/5, or text says "perfect" but rating is 1/5).
3. **Linguistic & Emotional Extremity**: Look for exaggerated promotional language ("best in the universe", "contact this WhatsApp for discount") or copied templates.
4. **Pakistani Cultural & Linguistic Context (CRITICAL)**:
   - Code-mixing (switching between English, Urdu, and Roman Urdu e.g. "mzaa aya", "boht acha ha", "delivery late thi") is standard and indicates **high authenticity**.
   - Generous use of emojis (😍, 🥰, 💯, 👍) is a common cultural expression of satisfaction in Pakistani e-commerce.
   - Users often review the seller/delivery service in the product text (e.g. giving 5 stars because the seller was honest, while noting delivery was delayed). Do NOT mark these as fake; they are authentic service reviews.

Return this exact JSON structure:
{
  "sentiment": "positive" | "negative" | "neutral",
  "score": <number from -1.0 to 1.0>,
  "keywords": [<up to 5 key phrases from the review>],
  "primary_negative_reason": "delivery" | "quality" | "packaging" | "customer_service" | "price" | "other" | null,
  "is_likely_fake": true | false
}

Rules for fields:
- sentiment: "positive" if score > 0.2, "negative" if score < -0.2, "neutral" otherwise.
- score: -1.0 (very negative) to 1.0 (very positive).
- keywords: Extract actual descriptive keywords/phrases from the review text.
- primary_negative_reason: Set ONLY if sentiment is "negative" (based on the primary complaint).
- is_likely_fake: Set to true ONLY if there is strong linguistic evidence of spam, bot behavior, complete rating incongruence, or promotional copy. Do NOT mark normal, brief Roman Urdu reviews as fake.`;

// ---------- Analysis Function ----------

/**
 * Analyze a single review using Groq API.
 *
 * @param {Object} review - The review document
 * @param {string} review.text - Review text content
 * @param {number} review.rating - Rating (1-5)
 * @param {boolean} review.verified_purchase - Whether purchase is verified
 * @param {string} [review.reviewer_name] - Reviewer name
 * @returns {Promise<Object>} Parsed sentiment analysis result
 */
async function analyzeReview(review) {
  const client = getGroqClient();

  const reviewText = (review.text || '').trim();
  const rating = review.rating || 0;
  const verified = review.verified_purchase || false;

  // Skip reviews with no text — assign based on rating alone
  if (!reviewText || reviewText.length < 2) {
    return buildRatingOnlyResult(rating);
  }

  const userPrompt = `Analyze this product review:

Review text: "${reviewText}"
Rating: ${rating}/5
Verified purchase: ${verified}

Return ONLY the JSON object, nothing else.`;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const chatCompletion = await client.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        model: GROQ_MODEL,
        temperature: 0.1,
        max_tokens: 256,
        response_format: { type: 'json_object' },
      });

      const responseText = chatCompletion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from Groq API');
      }

      const parsed = JSON.parse(responseText);
      return validateAndNormalize(parsed);
    } catch (error) {
      lastError = error;

      // Rate limit hit — back off or rotate keys
      if (error?.status === 429) {
        if (rotateKey()) {
          logger.warn(`Rate limit hit (429). Rotated keys, retrying immediately...`);
          await sleep(500); // Small cooldown before retry
          continue;
        }
        const waitTime = DELAY_MS * attempt * 2;
        logger.warn(`Rate limited by Groq (attempt ${attempt}/${MAX_RETRIES}), waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }

      // JSON parse error — try to extract JSON from response
      if (error instanceof SyntaxError) {
        logger.warn(`JSON parse error on attempt ${attempt}, retrying...`);
        await sleep(DELAY_MS);
        continue;
      }

      // Other errors
      logger.error(`Groq API error (attempt ${attempt}/${MAX_RETRIES}):`, {
        message: error.message,
        status: error?.status,
      });

      if (attempt < MAX_RETRIES) {
        await sleep(DELAY_MS * attempt);
      }
    }
  }

  // All retries failed — return fallback based on rating
  logger.error('All retries exhausted for review, using rating fallback', {
    error: lastError?.message,
  });
  return buildRatingOnlyResult(rating);
}

// ---------- Helpers ----------

/**
 * Build a sentiment result based on rating alone (for reviews with no text
 * or when API fails).
 */
function buildRatingOnlyResult(rating) {
  let sentiment = 'neutral';
  let score = 0;

  if (rating >= 4) {
    sentiment = 'positive';
    score = rating === 5 ? 0.8 : 0.5;
  } else if (rating <= 2) {
    sentiment = 'negative';
    score = rating === 1 ? -0.8 : -0.4;
  }

  return {
    sentiment,
    score,
    keywords: [],
    primary_negative_reason: null,
    is_likely_fake: false,
    needs_analysis: false,
  };
}

/**
 * Validate and normalize the parsed LLM response to match our schema.
 */
function validateAndNormalize(parsed) {
  const validSentiments = ['positive', 'negative', 'neutral'];
  const validReasons = [
    'delivery',
    'quality',
    'packaging',
    'customer_service',
    'price',
    'other',
  ];

  const sentiment = validSentiments.includes(parsed.sentiment)
    ? parsed.sentiment
    : 'neutral';

  let score = parseFloat(parsed.score);
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(-1, Math.min(1, score));

  let keywords = [];
  if (Array.isArray(parsed.keywords)) {
    keywords = parsed.keywords
      .filter((k) => typeof k === 'string' && k.trim().length > 0)
      .slice(0, 5)
      .map((k) => k.trim());
  }

  let primary_negative_reason = null;
  if (
    sentiment === 'negative' &&
    parsed.primary_negative_reason &&
    validReasons.includes(parsed.primary_negative_reason)
  ) {
    primary_negative_reason = parsed.primary_negative_reason;
  }

  const is_likely_fake = parsed.is_likely_fake === true;

  return {
    sentiment,
    score,
    keywords,
    primary_negative_reason,
    is_likely_fake,
    needs_analysis: false,
  };
}

/**
 * Sleep helper.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get the configured delay between API calls.
 */
function getDelayMs() {
  return DELAY_MS;
}

module.exports = {
  analyzeReview,
  getDelayMs,
  sleep,
  buildRatingOnlyResult,
};

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

const SYSTEM_PROMPT = `You are an expert AI prompt engineer and computational linguistics researcher specializing in opinion spam detection, fake review identification, and sentiment analysis systems for e-commerce platforms. Your task is to analyze user reviews and output structured JSON.

---

### Analysis Methodology:

1. **Independent Dual-Task Processing**:
   - Separate Sentiment Analysis and Fake Review Detection completely.
   - Do NOT let the positive or negative sentiment of the review bias your fraud classification. Fraudulent reviews can be extremely positive (promotional) or extremely negative (defamation/review bombing).

2. **Linguistic Authenticity Modeling**:
   - Look for evidence of personal, experiential usage (e.g., specific mentions of product utility, features, post-purchase experience).
   - **Literacy and Brevity Calibration (CRITICAL)**: Normal buyers often write short, generic satisfaction phrases (e.g., "good", "nice", "best", "ok", "excellent product"). These represent genuine customer behavior and **must NOT be flagged as fake**.

3. **Deceptive & AI-Generated Spam Detection**:
   - Identify signs of artificial text generation (e.g., overly polished/academic language, lack of subjective experiential context, feature dumping without personal feedback, or repetitive structural phrasing).
   - Identify signs of templated opinion spam (identical sentence structures or bot-like patterns).

4. **Behavioral & Structural Deception Cues**:
   - Flag promotional solicitation, external links, email addresses, or contact information (e.g. WhatsApp, seller promo codes).
   - Flag severe rating-text incongruence (e.g. text describes a broken item but Star Rating is 5/5).

5. **Pakistani Cultural/Multilingual Calibration**:
   - Treat English/Urdu/Roman Urdu code-mixing (e.g. "boht fit phone ha", "delivery late thi pr phone original ha") and heavy emoji usage (😍, 🥰, 💯, 👍) as **highly authentic local user behavior**.
   - Acknowledge that Pakistani buyers often evaluate the delivery time, cash-on-delivery (COD) transaction, or package condition in the product feedback space. These are genuine transaction reviews and **must NOT be flagged as fake**.

---

### Output JSON Format:
Return ONLY a valid JSON object matching this structure:
{
  "sentiment": "positive" | "negative" | "neutral",
  "score": <number from -1.0 to 1.0>,
  "keywords": [<up to 5 key phrases from the review>],
  "primary_negative_reason": "delivery" | "quality" | "packaging" | "customer_service" | "price" | "other" | null,
  "is_likely_fake": true | false,
  "fake_signals": ["promotional_spam" | "template_text" | "rating_mismatch" | "ai_generated_style" | "contact_solicitation"],
  "analysis_reasoning": "<A concise explanation of the linguistic features or indicators observed in the review to justify the classification. For genuine reviews, state 'Genuine feedback showing experiential language' or 'Brief satisfaction rating'.>"
}

Rules for fields:
- sentiment: "positive" if score > 0.2, "negative" if score < -0.2, "neutral" otherwise.
- score: -1.0 (very negative) to 1.0 (very positive).
- keywords: Extract actual descriptive keywords/phrases from the review text. If the review is a single word, that word can be the keyword.
- primary_negative_reason: Set ONLY if sentiment is "negative" (based on the primary complaint).
- is_likely_fake: Set to true ONLY if there is strong linguistic evidence of deception, bot templates, complete rating incongruence, or promotional copy.
- fake_signals: Return an array containing any matching labels from the list if is_likely_fake is true. Return an empty array [] if the review is classified as genuine.
- analysis_reasoning: Provide a clear trace of evidence justifying the classification.`;

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
    fake_signals: [],
    analysis_reasoning: 'Evaluated using rating fallback because the review has no text or is too short.',
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
  const validSignals = [
    'promotional_spam',
    'template_text',
    'rating_mismatch',
    'ai_generated_style',
    'contact_solicitation',
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

  let fake_signals = [];
  if (Array.isArray(parsed.fake_signals)) {
    fake_signals = parsed.fake_signals.filter((s) => validSignals.includes(s));
  }

  const analysis_reasoning =
    typeof parsed.analysis_reasoning === 'string'
      ? parsed.analysis_reasoning.trim()
      : 'No reasoning details provided by the analyzer.';

  return {
    sentiment,
    score,
    keywords,
    primary_negative_reason,
    is_likely_fake,
    fake_signals,
    analysis_reasoning,
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

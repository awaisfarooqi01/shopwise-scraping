# ShopWise Sentiment Analysis & Fake Review Detection Pipeline

This document explains the technical architecture, database schemas, and execution flow of the Sentiment Analysis and Fake Review Detection engine built for ShopWise.

---

## 1. System Overview

ShopWise compares products and aggregates user reviews from various Pakistani e-commerce platforms. To provide trust indicators (fake review warnings) and detailed insights (positive percentage, common complaints, top keywords), the platform runs a sentiment analysis pipeline powered by the **Groq API** with the **Llama-3.1-8b-instant** model.

The pipeline processes reviews incrementally, saves analysis results to individual reviews, and aggregates the results up to the parent products. These aggregated stats then feed the **MCDM (TOPSIS/CRITIC)** ranking engine to prioritize high-quality, trusted products.

---

## 2. Database Schema Design

The schemas in both the **Scraping** and **Backend** repositories are aligned and additive. They do not delete or modify existing fields, ensuring zero data loss on the cloud MongoDB database.

### Review Schema (`reviews` collection)
The `sentiment_analysis` sub-document holds the status and results for each review:
```javascript
sentiment_analysis: {
  sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
  score: { type: Number, min: -1, max: 1 },
  keywords: [String],
  primary_negative_reason: { type: String, enum: ['delivery', 'quality', 'packaging', 'customer_service', 'price', 'other'] },
  is_likely_fake: { type: Boolean, default: false },
  fake_signals: [String], // Taxonomy: promotional_spam, template_text, etc.
  analysis_reasoning: String, // Traceability / explainable reasoning log
  needs_analysis: { type: Boolean, default: true } // Processing flag (Indexed)
}
```

### Product Schema (`products` collection)
The `sentiment_summary` holds pre-aggregated metrics to keep queries fast:
```javascript
sentiment_summary: {
  total_analyzed: { type: Number, default: 0 },
  positive_count: { type: Number, default: 0 },
  negative_count: { type: Number, default: 0 },
  neutral_count: { type: Number, default: 0 },
  fake_count: { type: Number, default: 0 },
  average_sentiment_score: { type: Number, default: 0 },
  top_keywords: [String],
  top_complaints: [String],
  last_analyzed_at: { type: Date }
},
positive_percent: { type: Number, default: 0 } // Direct input for MCDM
```

---

## 3. Script Execution Flow

The batch script ([run-sentiment-analysis.js](file:///e:/University%20Work/FYP/code/shopwise-scraping/scripts/run-sentiment-analysis.js)) operates in two distinct phases: **Review Analysis** and **Product Aggregation**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: REVIEW ANALYSIS                        │
│                                                                        │
│  [Query Pending] ──> [Batch Loop] ──> [API Request] ──> [Update DB]     │
│  needs_analysis:     Process 50       Groq LLM          needs_analysis: │
│  true/missing        at a time        Llama-3.1-8b      false           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: PRODUCT AGGREGATION                      │
│                                                                        │
│  [Gather Products] ───> [Aggregate Reviews] ───> [Update Products]      │
│  Collect IDs of         Calculate positive%,     Write to               │
│  affected products      fake count, keywords     sentiment_summary      │
└────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Review Analysis (Review-wise)
1.  **Filter Selection**: The script queries reviews that require processing. By default, it queries reviews matching:
    ```javascript
    {
      $or: [
        { 'sentiment_analysis.needs_analysis': true },
        { 'sentiment_analysis.needs_analysis': { $exists: false } },
        { sentiment_analysis: { $exists: false } },
        { sentiment_analysis: null }
      ]
    }
    ```
    This ensures that already analyzed reviews (`needs_analysis: false`) are skipped, minimizing API usage and processing time.
2.  **Pagination Cursor**: The script retrieves reviews using cursor-based pagination (`_id > lastId`) in batches of 50. This handles millions of reviews without memory leaks.
3.  **LLM Inference**:
    *   If a review has no text or is too short (e.g., `< 2` characters), it immediately bypasses the API and assigns a **rating-only fallback** (e.g., 5★ $\rightarrow$ positive, 1★ $\rightarrow$ negative).
    *   Otherwise, it issues an API call to Groq with the review text, rating, reviewer name, and verified status.
    *   **Rate-limiting & Retries**: A mandatory delay of `2200ms` between calls ensures we stay within the **30 RPM** Groq free tier limit. If a rate-limit error (`429`) is encountered, the script backs off exponentially and retries.
4.  **Save Review**: The script writes the analysis results to the review document, setting `sentiment_analysis.needs_analysis` to `false` and recording the time. It adds the parent `product_id` to a tracking Set.

### Phase 2: Product Aggregation (Product-wise)
Once the review analysis batch completes, the script updates the parent products:
1.  **Identify Affected Products**: Retrieves the Set of unique `product_id`s that had at least one review updated during the run.
2.  **MongoDB Aggregation Pipeline**: For each affected product, it runs an aggregation query:
    *   Filters all processed reviews (`needs_analysis: false`) for that specific product.
    *   Groups them to compute `positive_count`, `negative_count`, `neutral_count`, `fake_count`, `average_sentiment_score`, `average_rating`, and total count.
    *   Flattens and counts occurrences of all keywords and complaints, sorting them to extract the **Top 10 keywords** and **Top 5 complaints**.
3.  **Update Product Document**: Updates the product's `sentiment_summary` and `positive_percent`.
    *   `positive_percent` is recalculated as:
        $$\text{positive\_percent} = \left( \frac{\text{positive\_count}}{\text{total\_analyzed}} \right) \times 100$$
    *   This field is saved to `positive_percent`, which is directly read by the MCDM ranking engine (`computeProductScores.js`) to score products.

---

## 4. Fake Review Detection Methodology & Parameters

To scientifically identify opinion spam (fake reviews) on e-commerce sites, the LLM utilizes an advanced computational linguistics framework. The system operates on the following research-grounded principles:

### A. Independent Dual-Task Processing (Bias Elimination)
*   **Methodology**: The pipeline decouples Sentiment Analysis (emotional polarity) from Fraud Classification (deceptive reviews). 
*   **Justification**: A review's polarity must not bias its authenticity check. Fraudulent reviews can express extreme positive sentiment (promotional astroturfing) or extreme negative sentiment (malicious competitor defamation/review bombing). Analyzing them independently prevents the model from ignoring spam simply because it has a positive tone.

### B. Linguistic Authenticity & Specificity Modeling
*   **Methodology**: Genuine reviews are modeled using signals of real-world personal experience, such as specific feature feedback (e.g., speed, camera, battery) and contextual grounding.
*   **Digital/Language Literacy Calibration**: Brief positive reviews (e.g., *"nice"*, *"best"*, *"good"*, *"ok"*, *"excellent"*) are protected. They are flagged as **authentic satisfaction feedback** representing consumers with varying digital or writing literacy.
*   **Justification**: Avoids high false-positive rates on brief customer feedback, ensuring that typing brevity is not conflated with deceptive intent.

### C. AI-Generated & Templated Spam Detection
*   **Methodology**: The model flags reviews showing signs of artificial generation or automated text syndication.
*   **Key Indicators**: Overly academic/polished language, feature-dumping without contextual personal use, lack of subjective experiential language, and repetitive syntactic structures across entries.
*   **Justification**: Detects modern opinion spam generated by generative AI models (ChatGPT/Llama) or automated posting bots.

### D. Structural & Behavioral Fraud Indicators
*   **Methodology**: Scans for structural indicators of deception:
    *   **Promotional Solicitation**: External links, URLs, email addresses, or discount referral codes.
    *   **Contact Solicitation**: Requests for external communication (e.g. WhatsApp contact).
    *   **Rating-Text Incongruence**: Star ratings that completely clash with the text (e.g., Star Rating is 5/5 but text states *"item arrived broken, waste of money"*).
*   **Justification**: Categorizes direct structural attempts to advertise or malicious bot entry errors.

### E. Cultural & Local E-Commerce Calibration
*   **Code-Mixing (Roman Urdu)**: Mixing English and Urdu (e.g., *"mzaa aya"*, *"sab ok ha"*, *"delivery late thi"*) is normal and treated as an **authenticity signal**.
*   **Emoji Density**: Heavy emoji usage (😍, 🥰, 💯, 👍) is a standard local expression of satisfaction and is not flagged as spam.
*   **Service vs Product Comments**: Pakistani buyers commonly rate transaction quality (honesty, package condition, COD delivery speed) in the product text field. These are treated as genuine transaction reviews and are preserved.

### F. Structured Fraud Taxonomy
If a review is flagged as suspicious (`is_likely_fake: true`), the system classifies the evidence into one or more categories in the database:
*   `promotional_spam`: Contains external links, coupon codes, or marketing pitches.
*   `template_text`: Follows rigid, repetitive, or machine-like structures.
*   `rating_mismatch`: Shows absolute incongruence between star rating and review text.
*   `ai_generated_style`: Displays academic, non-experiential, overly polished, or bot-like styles.
*   `contact_solicitation`: Contains phone numbers or invitations to off-platform channels (WhatsApp).

### G. Explainability & Traceability
To ensure all decisions are audit-ready for your FYP defense:
*   The model writes a concise natural language trace explaining the exact linguistic features observed directly into the database field: `sentiment_analysis.analysis_reasoning`.

---

## 5. GitHub Actions Workflow Execution

To process reviews on a regular basis, a scheduled GitHub Actions workflow is created:

### Rate Limit & Scaling Strategy
The Groq Free Tier has constraints per key:
- **30 RPM** (Requests Per Minute)
- **6,000 TPM** (Tokens Per Minute)
- **14,400 RPD** (Requests Per Day)

To scale and analyze all **2.4 lakh (240,000) reviews** before the project deadline, we implemented three concurrent optimization strategies:

1.  **API Key Rotation (Horizontal Scaling)**: 
    *   The engine supports passing a comma-separated list of keys in the `.env` configuration (e.g., `GROQ_API_KEY=key1,key2,key3`).
    *   If any key encounters a Rate Limit (`429`) or runs out of daily quota, the engine catches the exception, automatically rotates to the next available API key, and retries the request instantly.
    *   Using **3 keys** increases the daily limit to **43,200 reviews/day**, meaning all 240,000 reviews can be processed in **~5.5 days**.
2.  **Parallel Sharding (Distributed Processing)**:
    *   The GitHub Actions workflow uses a build matrix to run **3 concurrent worker jobs** in parallel.
    *   We partition the database using an ObjectId suffix sharding algorithm: Shard 0 queries ObjectIds ending in hex `[0-5]`, Shard 1 queries `[6-b]`, and Shard 2 queries `[c-f]`.
    *   This sharding completely separates reviews among runners, preventing duplication and race conditions.
    *   MCDM re-ranking score recalculation is run as a single downstream step *only after* all shards complete, preventing database write conflicts.
3.  **Rate Limit Delay & Pacing**:
    *   Enforces a delay of `2200ms` between calls per runner to stay within the 30 RPM limit.
    *   Allows configurable batch sizes (e.g., `--max 1000` per shard). A 1000-review execution takes approximately 40 minutes under normal network conditions but is strictly capped to guarantee it fits safely within GitHub Actions' maximum 6-hour job timeout window.
    *   By scheduling runs **every 2 hours** (12 times a day) and processing up to **3,000 reviews per run** (1,000 per shard), the pipeline processes up to **36,000 reviews per day**. This stays safely within the 43,200 RPD daily limit of your 3 rotating API keys, finishing all 2.4 lakh reviews in **~6.6 days** (well within your 8-day deadline).
    *   If a runner encounters a transient issue, already processed reviews are saved with `needs_analysis: false`. The remaining reviews will simply be processed in the next run.

### Data Safety
All updates are additive:
*   **MongoDB `updateOne` with `$set`**: We do not overwrite entire documents, only specific sub-paths (`sentiment_analysis` in reviews, `sentiment_summary` and `positive_percent` in products).
*   No database drop or truncate calls are executed.
*   Existing reviews, product names, prices, descriptions, and platform fields remain completely untouched.

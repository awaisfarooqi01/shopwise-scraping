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

To scientifically identify opinion spam (fake reviews) on e-commerce sites, the LLM analyzes review content and metadata across four primary dimensions established in academic literature:

### A. Linguistic Density and Specificity (Information Content)
*   **Definition**: Genuine customer reviews typically exhibit high information density, describing specific features of the product (e.g., *"the battery lasted 2 days"*, *"screen has nice colors but cameras are average"*).
*   **Suspicion Indicator**: Very low information density reviews that rely solely on generic praise or extreme polarity (e.g., *"amazing product"*, *"best ever!!!"*, *"super shop"*) with a 5-star rating and no specific mentions of product utility.
*   **Justification**: Fake reviews are often written by promotional bots or paid writers who do not actually possess or use the product, resulting in generic vocabulary and lack of concrete details.

### B. Rating-Sentiment Congruence (Semantic Consistency)
*   **Definition**: In a genuine review, the emotional polarity of the text corresponds with the numerical rating given.
*   **Suspicion Indicator**: Extreme incongruence. For example, a 5/5 star rating containing highly critical text (e.g., *"product arrived broken, do not buy"*), or a 1/5 star rating containing pure praise (*"loved it, perfect phone"*).
*   **Justification**: Rating inconsistencies often highlight automated bot posting errors, malicious review bombs, or users misusing the interface.

### C. Stylistic & Structural Extremity
*   **Definition**: Genuine reviews express subjective personal experiences. Fake reviews often display abnormal stylistic features.
*   **Suspicion Indicator**: Excessively loud promotional text containing commercial patterns, spam links, URLs, WhatsApp numbers, or boilerplates. Additionally, copied/pasted templates repeated across multiple reviews are flagged.
*   **Justification**: Deceptive reviews often attempt to advertise third-party services or use automated text generation templates.

### D. Cultural & Linguistic Code-Mixing Calibration (False-Positive Reduction)
*   **Linguistic Context**: In the Pakistani e-commerce landscape, code-mixing between English, Urdu, and Roman Urdu (e.g., *"mzaa aya"*, *"delivery late thi"*, *"sab kuch thik chal rha ha"*) is the standard format for authentic customer feedback.
*   **Emoji Usage**: The heavy use of standard emojis (😍, 🥰, 💯, 👍) is culturally normal for expressing customer satisfaction.
*   **Service vs Product Incongruence**: Pakistani buyers frequently comment on shipping delays, cash-on-delivery (COD) experience, or shop packing quality in the product feedback text while still leaving a 5-star rating for the product itself.
*   **Calibration**: The pipeline explicitly instructs the model **not** to flag code-mixed Roman Urdu, emoji-rich, or delivery-related satisfaction comments as fake, drastically lowering false-positive rates compared to generic Western-trained lexicon classifiers.

---

## 5. GitHub Actions Workflow Execution

To process reviews on a regular basis, a scheduled GitHub Actions workflow is created:

### Rate Limit & Scaling Strategy
The Groq Free Tier has constraints per key:
- **30 RPM** (Requests Per Minute)
- **6,000 TPM** (Tokens Per Minute)
- **14,400 RPD** (Requests Per Day)

To scale and analyze all **2.4 lakh (240,000) reviews** before the project deadline, we implemented two concurrent optimization strategies:

1.  **API Key Rotation (Horizontal Scaling)**: 
    *   The engine supports passing a comma-separated list of keys in the `.env` configuration (e.g., `GROQ_API_KEY=key1,key2,key3`).
    *   If any key encounters a Rate Limit (`429`) or runs out of daily quota, the engine catches the exception, automatically rotates to the next available API key, and retries the request instantly.
    *   Using **3 keys** increases the daily limit to **43,200 reviews/day**, meaning all 240,000 reviews can be processed in **~5.5 days**.
2.  **Rate Limit Delay & Pacing**:
2.  Allows a configurable limit on the maximum number of reviews to process in a single run (e.g. default **500 reviews**).
3.  Calculates execution pacing: 500 reviews * 2.2 seconds = ~18.3 minutes run time. This processes up to 14,400 reviews per day without hitting TPM or RPM limits.
4.  If the script encounters a transient API drop or limit, it logs the failure and continues, saving what has been processed. The remaining reviews will simply be picked up by the next run because their `needs_analysis` remains `true`.

### Data Safety
All updates are additive:
*   **MongoDB `updateOne` with `$set`**: We do not overwrite entire documents, only specific sub-paths (`sentiment_analysis` in reviews, `sentiment_summary` and `positive_percent` in products).
*   No database drop or truncate calls are executed.
*   Existing reviews, product names, prices, descriptions, and platform fields remain completely untouched.

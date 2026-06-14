/**
 * Test API Keys Diagnostic Script
 * 
 * Verifies that all configured Groq API keys are parsed correctly and can authenticate with the API.
 * Usage:
 *   node scripts/test-api-keys.js
 */

require('dotenv').config();
const Groq = require('groq-sdk');

const GROQ_API_KEYS = (process.env.GROQ_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

async function main() {
  console.log('=== Groq API Keys Diagnostic Tool ===');
  console.log(`Loaded ${GROQ_API_KEYS.length} keys from environment.\n`);

  if (GROQ_API_KEYS.length === 0) {
    console.error('ERROR: No keys found in GROQ_API_KEY env variable!');
    process.exit(1);
  }

  for (let i = 0; i < GROQ_API_KEYS.length; i++) {
    const key = GROQ_API_KEYS[i];
    const maskedKey = key.length > 12 
      ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` 
      : '[too short/invalid]';

    console.log(`[Key ${i + 1}/${GROQ_API_KEYS.length}] testing key: ${maskedKey}`);

    try {
      const groq = new Groq({ apiKey: key });
      const startTime = Date.now();
      
      const response = await groq.chat.completions.create({
        messages: [
          { role: 'user', content: 'Say "active"' }
        ],
        model: model,
        max_tokens: 5,
        temperature: 0.1
      });

      const elapsed = Date.now() - startTime;
      const text = response.choices[0]?.message?.content?.trim();
      console.log(`  ✅ SUCCESS! Response: "${text}" | Latency: ${elapsed}ms\n`);

    } catch (err) {
      console.error(`  ❌ FAILED! Error: ${err.message}`);
      if (err.status) {
        console.error(`  HTTP Status Code: ${err.status}`);
      }
      console.log();
    }
  }

  console.log('Diagnostic Complete.');
}

main().catch(console.error);

// backend/utils/geminiClient.js — Shared Gemini client with retry + model fallback
// Handles 429 rate limits by waiting the suggested retryDelay, then retrying.
// Falls back through model list if one is exhausted.

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Model priority order — all free tier, separate quotas
const MODEL_CHAIN = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.0-pro',
];

function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set in .env');
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Parse retryDelay seconds from a 429 error message
function parseRetryDelay(err) {
  try {
    const match = err.message?.match(/retryDelay['":\s]+(\d+)/);
    if (match) return Math.min(parseInt(match[1], 10) * 1000 + 500, 60000);
  } catch {}
  return 5000; // default 5s
}

function is429(err) {
  return err.message?.includes('429') || err.message?.includes('Too Many Requests') || err.message?.includes('RESOURCE_EXHAUSTED');
}

// Get a model, trying each in MODEL_CHAIN until one works
async function getWorkingModel(genAI, config = {}) {
  return genAI.getGenerativeModel({ model: MODEL_CHAIN[0], ...config });
}

// Wrap any Gemini call with retry + model fallback
// fn(model) should return a promise
async function withRetry(fn, config = {}, maxRetries = 2) {
  const genAI   = getClient();
  let   lastErr = null;

  for (const modelName of MODEL_CHAIN) {
    const model = genAI.getGenerativeModel({ model: modelName, ...config });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(model, genAI);
      } catch (err) {
        lastErr = err;
        if (is429(err)) {
          if (attempt < maxRetries) {
            const delay = parseRetryDelay(err);
            console.warn(`[Gemini] 429 on ${modelName}, waiting ${delay}ms then retry ${attempt + 1}/${maxRetries}...`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            console.warn(`[Gemini] ${modelName} quota exhausted, trying next model...`);
            break; // try next model
          }
        } else {
          throw err; // non-rate-limit error, don't retry
        }
      }
    }
  }

  throw new Error(`All Gemini models quota exhausted. ${lastErr?.message || ''}\n\nWait a few minutes and try again, or add billing at aistudio.google.com`);
}

module.exports = { getClient, withRetry, MODEL_CHAIN };

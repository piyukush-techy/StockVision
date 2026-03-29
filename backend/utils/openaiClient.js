// backend/utils/openaiClient.js — Shared OpenAI client
// GPT-4o-mini: ~$0.15/1M input tokens. A full conversation costs fractions of a paisa.
// No daily quotas. No rate limit hell. Just works.

const OpenAI = require('openai');

let _client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set. Get one at platform.openai.com/api-keys');
  }
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// Default model — gpt-4o-mini is cheap and smart enough for all our use cases
const DEFAULT_MODEL = 'gpt-4o-mini';

module.exports = { getClient, DEFAULT_MODEL };

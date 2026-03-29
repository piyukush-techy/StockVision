// backend/routes/agent.js — AI Analyst Agent (DISABLED — no API key)
// Plug in GEMINI_API_KEY or OPENAI_API_KEY later to activate
const express = require('express');
const router  = express.Router();
const { rateLimit } = require('../utils/rateLimiter');

const COMING_SOON = {
  disabled: true,
  message: 'AI Analyst Agent is coming soon! The full code is ready — just needs an API key.',
  setup: {
    gemini: 'GEMINI_API_KEY — aistudio.google.com (paid plan needed for production)',
    openai: 'OPENAI_API_KEY — platform.openai.com (~$0.0001/request, no quotas)',
  }
};

router.get('/suggestions', (req, res) => {
  res.json({ suggestions: [
    'Show me my watchlist with current prices',
    'Run a scanner on RELIANCE.NS — can it hit 15% in 60 days?',
    'What is the current Nifty regime?',
    'What stocks are trending right now?',
    'मुझे TCS के बारे में बताओ',
  ]});
});

router.post('/chat', rateLimit.heavy, (req, res) => {
  res.status(503).json(COMING_SOON);
});

router.get('/providers', (req, res) => {
  res.json({ available: { gemini: false, openai: false }, anyConfigured: false, ...COMING_SOON });
});

module.exports = router;

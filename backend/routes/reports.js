// backend/routes/reports.js — AI Stock Reports (DISABLED — no API key)
const express = require('express');
const router  = express.Router();
const { rateLimit } = require('../utils/rateLimiter');

router.get('/:symbol', rateLimit.heavy, (req, res) => {
  res.status(503).json({
    disabled: true,
    message: 'AI Stock Reports coming soon! Needs an AI API key to activate.',
  });
});

module.exports = router;

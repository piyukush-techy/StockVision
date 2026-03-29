// routes/integrations.js — Phase 5 Month 25: Integrations
// Zerodha Kite, Telegram bot webhooks, Google Sheets token exchange
//
// Endpoints:
//   POST /api/integrations/zerodha/auth           — Start Kite OAuth flow
//   POST /api/integrations/zerodha/callback        — Handle Kite callback
//   GET  /api/integrations/zerodha/holdings        — Get user holdings (needs token)
//   GET  /api/integrations/zerodha/positions        — Get open positions
//   GET  /api/integrations/zerodha/portfolio-sync   — Sync holdings → StockVision watchlist
//   POST /api/integrations/telegram/register        — Register Telegram chat ID
//   POST /api/integrations/telegram/test            — Send test message
//   GET  /api/integrations/telegram/status          — Check bot status
//   POST /api/integrations/telegram/alert-settings  — Configure alert types
//   POST /api/integrations/sheets/token             — Store Google Sheets OAuth token
//   GET  /api/integrations/sheets/export/:sessionId — Export watchlist → Sheets format
//   GET  /api/integrations/status                   — All integration statuses for user

const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { cache, TTL } = require('../utils/cacheLayer');
const { rateLimit }  = require('../utils/rateLimiter');

// ─── In-memory store for demo (prod: use MongoDB) ─────────────────────────────
// In production these would be persisted in a UserIntegrations model
const integrationStore = new Map(); // key: sessionId → { zerodha, telegram, sheets }

function getIntegration(sessionId) {
  return integrationStore.get(sessionId) || { zerodha: null, telegram: null, sheets: null };
}
function setIntegration(sessionId, type, data) {
  const current = getIntegration(sessionId);
  current[type]  = { ...current[type], ...data, updatedAt: new Date() };
  integrationStore.set(sessionId, current);
  return current;
}

// ─── ═══════════════════════════════════════════════════════════════════════════
//     ZERODHA KITE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/integrations/zerodha/auth
 * Body: { apiKey, sessionId }
 * Returns the Kite login URL to redirect the user to.
 *
 * REAL SETUP (for production):
 *   1. Register at https://developers.kite.trade/
 *   2. Get your api_key and api_secret
 *   3. Set ZERODHA_API_KEY and ZERODHA_API_SECRET in .env
 *   4. Set redirect URL to: https://yourdomain.com/api/integrations/zerodha/callback
 */
router.post('/zerodha/auth', rateLimit.standard, (req, res) => {
  const { apiKey, sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  // Use provided apiKey or fall back to env
  const kiteApiKey = apiKey || process.env.ZERODHA_API_KEY;
  if (!kiteApiKey) {
    return res.status(400).json({
      error: 'Zerodha API key not configured',
      hint:  'Add ZERODHA_API_KEY to .env or provide apiKey in request body',
      docs:  'https://developers.kite.trade/',
    });
  }

  // Store the apiKey for this session (so callback can use it)
  setIntegration(sessionId, 'zerodha', { apiKey: kiteApiKey, status: 'pending' });

  const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${kiteApiKey}`;

  res.json({
    success:  true,
    loginUrl,
    message:  'Redirect user to loginUrl to complete Kite OAuth',
    nextStep: `POST /api/integrations/zerodha/callback with { sessionId, requestToken }`,
  });
});

/**
 * POST /api/integrations/zerodha/callback
 * Body: { sessionId, requestToken, apiKey?, apiSecret? }
 * Exchanges request_token for access_token using Kite API.
 */
router.post('/zerodha/callback', rateLimit.standard, async (req, res) => {
  const { sessionId, requestToken, apiKey, apiSecret } = req.body;
  if (!sessionId || !requestToken) {
    return res.status(400).json({ error: 'sessionId and requestToken required' });
  }

  const kiteApiKey    = apiKey    || process.env.ZERODHA_API_KEY;
  const kiteApiSecret = apiSecret || process.env.ZERODHA_API_SECRET;

  if (!kiteApiKey || !kiteApiSecret) {
    return res.status(400).json({
      error: 'Zerodha API credentials not configured',
      hint:  'Set ZERODHA_API_KEY and ZERODHA_API_SECRET in .env',
    });
  }

  try {
    // Generate checksum: sha256(api_key + request_token + api_secret)
    const crypto   = require('crypto');
    const checksum = crypto
      .createHash('sha256')
      .update(kiteApiKey + requestToken + kiteApiSecret)
      .digest('hex');

    const resp = await axios.post(
      'https://api.kite.trade/session/token',
      new URLSearchParams({ api_key: kiteApiKey, request_token: requestToken, checksum }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Kite-Version': '3' } }
    );

    const { access_token, user_name, user_id, email } = resp.data?.data || {};

    setIntegration(sessionId, 'zerodha', {
      apiKey: kiteApiKey,
      accessToken: access_token,
      userId:      user_id,
      userName:    user_name,
      email,
      status:      'connected',
      connectedAt: new Date(),
    });

    res.json({
      success:  true,
      message:  `Connected to Zerodha as ${user_name}`,
      userName: user_name,
      userId:   user_id,
    });
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.error('[integrations] Kite callback error:', errMsg);
    res.status(500).json({ error: 'Kite token exchange failed', detail: errMsg });
  }
});

/**
 * GET /api/integrations/zerodha/holdings?sessionId=
 * Returns Kite holdings with StockVision enrichment (live prices)
 */
router.get('/zerodha/holdings', rateLimit.standard, async (req, res) => {
  const { sessionId } = req.query;
  const intg = getIntegration(sessionId)?.zerodha;
  if (!intg?.accessToken) {
    return res.status(401).json({ error: 'Zerodha not connected', hint: 'POST /zerodha/auth first' });
  }

  try {
    const cached = await cache.get(`kite:holdings:${sessionId}`);
    if (cached) return res.json({ success: true, fromCache: true, data: cached });

    const resp = await axios.get('https://api.kite.trade/portfolio/holdings', {
      headers: { 'Authorization': `token ${intg.apiKey}:${intg.accessToken}`, 'X-Kite-Version': '3' },
    });

    const holdings = (resp.data?.data || []).map(h => ({
      tradingsymbol: h.tradingsymbol,
      exchange:      h.exchange,
      quantity:      h.quantity,
      avgPrice:      h.average_price,
      lastPrice:     h.last_price,
      pnl:           h.pnl,
      pnlPercent:    h.average_price > 0 ? ((h.last_price - h.average_price) / h.average_price * 100).toFixed(2) : 0,
      dayChange:     h.day_change,
      dayChangePct:  h.day_change_percentage,
      value:         h.last_price * h.quantity,
      nseSymbol:     h.exchange === 'NSE' ? `${h.tradingsymbol}.NS` : null,
    }));

    await cache.set(`kite:holdings:${sessionId}`, holdings, TTL.SHORT);
    res.json({ success: true, count: holdings.length, data: holdings });
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    res.status(500).json({ error: 'Failed to fetch holdings', detail });
  }
});

/**
 * GET /api/integrations/zerodha/positions?sessionId=
 */
router.get('/zerodha/positions', rateLimit.standard, async (req, res) => {
  const { sessionId } = req.query;
  const intg = getIntegration(sessionId)?.zerodha;
  if (!intg?.accessToken) {
    return res.status(401).json({ error: 'Zerodha not connected' });
  }

  try {
    const resp = await axios.get('https://api.kite.trade/portfolio/positions', {
      headers: { 'Authorization': `token ${intg.apiKey}:${intg.accessToken}`, 'X-Kite-Version': '3' },
    });
    const { net = [], day = [] } = resp.data?.data || {};
    res.json({ success: true, positions: { net, day } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch positions', detail: err.message });
  }
});

/**
 * GET /api/integrations/zerodha/portfolio-sync?sessionId=&watchlistId=
 * Syncs Kite holdings → StockVision watchlist (adds symbols)
 */
router.get('/zerodha/portfolio-sync', rateLimit.standard, async (req, res) => {
  const { sessionId } = req.query;
  const intg = getIntegration(sessionId)?.zerodha;
  if (!intg?.accessToken) {
    return res.status(401).json({ error: 'Zerodha not connected' });
  }

  try {
    const resp = await axios.get('https://api.kite.trade/portfolio/holdings', {
      headers: { 'Authorization': `token ${intg.apiKey}:${intg.accessToken}`, 'X-Kite-Version': '3' },
    });

    const holdings = resp.data?.data || [];
    const nseSymbols = holdings
      .filter(h => h.exchange === 'NSE')
      .map(h => ({ symbol: `${h.tradingsymbol}.NS`, name: h.tradingsymbol, quantity: h.quantity, avgPrice: h.average_price }));

    res.json({
      success:    true,
      message:    `Found ${nseSymbols.length} NSE holdings ready to sync`,
      symbols:    nseSymbols,
      hint:       'Use POST /api/watchlists/:id/stocks to add each symbol to a watchlist',
    });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed', detail: err.message });
  }
});

// ─── ═══════════════════════════════════════════════════════════════════════════
//     TELEGRAM BOT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/integrations/telegram/register
 * Body: { sessionId, chatId, botToken? }
 *
 * REAL SETUP:
 *   1. Talk to @BotFather on Telegram → create bot → get token
 *   2. Set TELEGRAM_BOT_TOKEN in .env
 *   3. User gets their chat ID by messaging @userinfobot
 */
router.post('/telegram/register', rateLimit.standard, async (req, res) => {
  const { sessionId, chatId, botToken } = req.body;
  if (!sessionId || !chatId) return res.status(400).json({ error: 'sessionId and chatId required' });

  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(400).json({
      error: 'Telegram bot token not configured',
      hint:  'Set TELEGRAM_BOT_TOKEN in .env (get from @BotFather)',
      setup: [
        '1. Open Telegram → search @BotFather',
        '2. Send /newbot → follow steps → copy the token',
        '3. Add TELEGRAM_BOT_TOKEN=your_token to .env',
        '4. User gets their Chat ID from @userinfobot',
      ],
    });
  }

  // Verify the chat ID works by sending a welcome message
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id:    chatId,
      parse_mode: 'HTML',
      text: `🚀 <b>StockVision Alerts Connected!</b>\n\nYou'll now receive:\n✅ Price alerts\n📊 Market open/close summaries\n🔔 Custom stock notifications\n\n<i>Powered by StockVision 🇮🇳</i>`,
    });

    setIntegration(sessionId, 'telegram', {
      chatId,
      botToken:    token,
      status:      'connected',
      connectedAt: new Date(),
      alertSettings: { priceAlerts: true, marketSummary: true, regimeChange: false },
    });

    res.json({ success: true, message: 'Telegram connected! Check your Telegram for confirmation.' });
  } catch (err) {
    const detail = err.response?.data?.description || err.message;
    res.status(500).json({ error: 'Failed to connect Telegram', detail, hint: 'Double-check your chat ID and bot token' });
  }
});

/**
 * POST /api/integrations/telegram/test
 * Sends a test alert to verify connection
 */
router.post('/telegram/test', rateLimit.standard, async (req, res) => {
  const { sessionId } = req.body;
  const intg = getIntegration(sessionId)?.telegram;
  if (!intg?.chatId) return res.status(400).json({ error: 'Telegram not connected' });

  try {
    await sendTelegramMessage(intg.chatId, intg.botToken || process.env.TELEGRAM_BOT_TOKEN,
      `🔔 <b>Test Alert from StockVision</b>\n\n` +
      `📈 RELIANCE.NS: ₹2,847.50 (+1.23%)\n` +
      `⚡ This is a test notification.\n\n` +
      `<i>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</i>`
    );
    res.json({ success: true, message: 'Test message sent to Telegram!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send test', detail: err.message });
  }
});

/**
 * GET /api/integrations/telegram/status?sessionId=
 */
router.get('/telegram/status', rateLimit.light, (req, res) => {
  const { sessionId } = req.query;
  const intg = getIntegration(sessionId)?.telegram;
  const tokenConfigured = !!(process.env.TELEGRAM_BOT_TOKEN);
  res.json({
    success:          true,
    tokenConfigured,
    connected:        !!intg?.chatId,
    chatId:           intg?.chatId ? '****' + String(intg.chatId).slice(-4) : null,
    connectedAt:      intg?.connectedAt,
    alertSettings:    intg?.alertSettings || null,
  });
});

/**
 * POST /api/integrations/telegram/alert-settings
 */
router.post('/telegram/alert-settings', rateLimit.standard, (req, res) => {
  const { sessionId, priceAlerts, marketSummary, regimeChange, scannerHits } = req.body;
  const intg = getIntegration(sessionId)?.telegram;
  if (!intg?.chatId) return res.status(400).json({ error: 'Telegram not connected' });

  setIntegration(sessionId, 'telegram', {
    alertSettings: {
      priceAlerts:   priceAlerts  ?? intg.alertSettings?.priceAlerts  ?? true,
      marketSummary: marketSummary ?? intg.alertSettings?.marketSummary ?? true,
      regimeChange:  regimeChange  ?? intg.alertSettings?.regimeChange  ?? false,
      scannerHits:   scannerHits   ?? intg.alertSettings?.scannerHits   ?? false,
    },
  });

  res.json({ success: true, alertSettings: getIntegration(sessionId).telegram.alertSettings });
});

// Helper: send Telegram message
async function sendTelegramMessage(chatId, botToken, text) {
  return axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id:    chatId,
    parse_mode: 'HTML',
    text,
  });
}

// Export helper for alertChecker to use
module.exports.sendTelegramMessage = sendTelegramMessage;
module.exports.integrationStore    = integrationStore;

// ─── ═══════════════════════════════════════════════════════════════════════════
//     GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/integrations/sheets/token
 * Stores Google OAuth access token for Sheets access
 *
 * REAL SETUP:
 *   1. Create project at console.cloud.google.com
 *   2. Enable Google Sheets API
 *   3. Create OAuth 2.0 credentials
 *   4. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env
 */
router.post('/sheets/token', rateLimit.standard, (req, res) => {
  const { sessionId, accessToken, refreshToken } = req.body;
  if (!sessionId || !accessToken) {
    return res.status(400).json({ error: 'sessionId and accessToken required' });
  }

  setIntegration(sessionId, 'sheets', {
    accessToken,
    refreshToken: refreshToken || null,
    status:      'connected',
    connectedAt: new Date(),
  });

  res.json({ success: true, message: 'Google Sheets connected!' });
});

/**
 * GET /api/integrations/sheets/export/:sessionId?format=json|sheets
 * Returns watchlist data formatted for Google Sheets import
 */
router.get('/sheets/export/:sessionId', rateLimit.standard, async (req, res) => {
  const { sessionId } = req.params;
  const format = req.query.format || 'json';

  try {
    // Get the user's watchlists + live prices
    const Watchlist = require('../models/Watchlist');
    const Stock     = require('../models/Stock');

    const watchlists = await Watchlist.find({ sessionId }).lean();
    if (!watchlists.length) {
      return res.json({ success: true, message: 'No watchlists found', rows: [] });
    }

    // Gather all symbols
    const allSymbols = [...new Set(watchlists.flatMap(w => w.stocks.map(s => s.symbol)))];
    const stocks     = await Stock.find({ symbol: { $in: allSymbols } }).lean();
    const stockMap   = Object.fromEntries(stocks.map(s => [s.symbol, s]));

    // Build rows
    const headers = ['Watchlist', 'Symbol', 'Name', 'Price (₹)', 'Change (%)', 'Open', 'High', 'Low', 'Volume', '52W High', '52W Low', 'Last Updated'];
    const rows    = [];

    for (const wl of watchlists) {
      for (const item of wl.stocks) {
        const s = stockMap[item.symbol];
        rows.push([
          wl.name,
          item.symbol,
          s?.name || item.name || '',
          s?.currentPrice || '',
          s?.changePercent?.toFixed(2) || '',
          s?.open || '',
          s?.high || '',
          s?.low  || '',
          s?.volume || '',
          s?.high52w || '',
          s?.low52w  || '',
          s?.lastUpdated ? new Date(s.lastUpdated).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        ]);
      }
    }

    if (format === 'csv') {
      const csvLines = [
        headers.join(','),
        ...rows.map(r => r.map(v => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(','))
      ];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="stockvision-watchlist-${Date.now()}.csv"`);
      return res.send(csvLines.join('\n'));
    }

    res.json({
      success: true,
      sheetName: 'StockVision Watchlist',
      exportedAt: new Date().toISOString(),
      headers,
      rows,
      rowCount: rows.length,
      hint: 'Use Google Sheets importData() or paste rows manually',
    });
  } catch (err) {
    res.status(500).json({ error: 'Export failed', detail: err.message });
  }
});

// ─── ═══════════════════════════════════════════════════════════════════════════
//     ALL INTEGRATIONS STATUS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/status', rateLimit.light, (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const intg = getIntegration(sessionId);

  res.json({
    success: true,
    integrations: {
      zerodha: {
        connected:   !!intg.zerodha?.accessToken,
        status:      intg.zerodha?.status || 'not_connected',
        userName:    intg.zerodha?.userName || null,
        connectedAt: intg.zerodha?.connectedAt || null,
      },
      telegram: {
        connected:      !!intg.telegram?.chatId,
        status:         intg.telegram?.status || 'not_connected',
        alertSettings:  intg.telegram?.alertSettings || null,
        connectedAt:    intg.telegram?.connectedAt || null,
      },
      sheets: {
        connected:   !!intg.sheets?.accessToken,
        status:      intg.sheets?.status || 'not_connected',
        connectedAt: intg.sheets?.connectedAt || null,
      },
      chrome_extension: {
        status:      'available',
        installUrl:  '/chrome-extension/stockvision-extension.zip',
        version:     '1.0.0',
      },
      google_sheets_addon: {
        status:    'available',
        installUrl: 'https://workspace.google.com/marketplace (coming soon)',
        version:   '1.0.0',
      },
    },
    env: {
      zerodhaConfigured:  !!process.env.ZERODHA_API_KEY,
      telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
      googleConfigured:   !!process.env.GOOGLE_CLIENT_ID,
    },
  });
});

module.exports = router;

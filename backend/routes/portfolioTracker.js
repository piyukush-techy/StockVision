// routes/portfolioTracker.js — Advanced Portfolio Tracker API
// Phase 6 Month 32 — Features 17–23
// JAI SHREE GANESH 🙏

const express  = require('express');
const router   = express.Router();
const PortfolioTracker = require('../models/PortfolioTracker');

// ─── Yahoo Finance helper ──────────────────────────────────────────────────
let yf;
try { yf = require('yahoo-finance2').default; } catch { yf = null; }

async function fetchCurrentPrice(symbol) {
  if (!yf) return null;
  try {
    const s = symbol.includes('.') ? symbol : symbol + '.NS';
    const q = await yf.quote(s, { fields: ['regularMarketPrice', 'regularMarketPreviousClose', 'shortName', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow'] });
    return {
      price:    q.regularMarketPrice,
      prevClose: q.regularMarketPreviousClose,
      name:     q.shortName || symbol,
      high52w:  q.fiftyTwoWeekHigh,
      low52w:   q.fiftyTwoWeekLow,
    };
  } catch { return null; }
}

async function fetchHistoricalClose(symbol, fromDate) {
  if (!yf) return [];
  try {
    const s = symbol.includes('.') ? symbol : symbol + '.NS';
    const period1 = fromDate instanceof Date ? fromDate : new Date(fromDate);
    const hist = await yf.historical(s, { period1, period2: new Date(), interval: '1d' });
    return hist.map(d => ({ date: d.date, close: d.close }));
  } catch { return []; }
}

// ─── XIRR calculator (Newton-Raphson) ─────────────────────────────────────
function xirr(cashflows) {
  // cashflows: [{amount, date}] — investments are negative, current value positive
  if (cashflows.length < 2) return null;
  const dates = cashflows.map(c => new Date(c.date).getTime());
  const t0    = dates[0];
  const years = dates.map(d => (d - t0) / (365.25 * 24 * 3600 * 1000));

  function npv(r) {
    return cashflows.reduce((s, c, i) => s + c.amount / Math.pow(1 + r, years[i]), 0);
  }
  function dnpv(r) {
    return cashflows.reduce((s, c, i) => s - years[i] * c.amount / Math.pow(1 + r, years[i] + 1), 0);
  }

  let r = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    const f  = npv(r);
    const df = dnpv(r);
    if (Math.abs(df) < 1e-10) break;
    const rNew = r - f / df;
    if (Math.abs(rNew - r) < 1e-8) { r = rNew; break; }
    r = rNew;
    if (r < -0.999) { r = -0.999; break; }
  }
  return Math.round(r * 10000) / 100; // return as %
}

// ─── Tax classification (India) ───────────────────────────────────────────
function taxClass(buyDate) {
  const holdDays = (Date.now() - new Date(buyDate).getTime()) / (24 * 3600 * 1000);
  return holdDays >= 365 ? 'LTCG' : 'STCG';
}

// ─── Helper: aggregate holdings from trades ───────────────────────────────
function aggregateHoldings(trades) {
  const map = {};
  for (const t of trades) {
    if (!map[t.symbol]) map[t.symbol] = { symbol: t.symbol, name: t.name, totalQty: 0, totalCost: 0, trades: [] };
    map[t.symbol].totalQty  += t.quantity;
    map[t.symbol].totalCost += t.quantity * t.buyPrice;
    map[t.symbol].trades.push(t);
  }
  for (const sym of Object.keys(map)) {
    map[sym].avgCost = map[sym].totalCost / map[sym].totalQty;
  }
  return Object.values(map);
}

// ─── GET /api/portfolio-tracker/:sessionId — get portfolio ────────────────
router.get('/:sessionId', async (req, res) => {
  try {
    let portfolio = await PortfolioTracker.findOne({ sessionId: req.params.sessionId });
    if (!portfolio) portfolio = { sessionId: req.params.sessionId, name: 'My Portfolio', trades: [] };
    res.json({ success: true, portfolio });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/portfolio-tracker/:sessionId/trade — add trade ─────────────
router.post('/:sessionId/trade', async (req, res) => {
  try {
    const { symbol, name, quantity, buyPrice, buyDate, notes } = req.body;
    if (!symbol || !quantity || !buyPrice || !buyDate)
      return res.status(400).json({ error: 'symbol, quantity, buyPrice, buyDate required' });

    let portfolio = await PortfolioTracker.findOne({ sessionId: req.params.sessionId });
    if (!portfolio) {
      portfolio = new PortfolioTracker({ sessionId: req.params.sessionId, trades: [] });
    }
    portfolio.trades.push({ symbol: symbol.toUpperCase().replace('.NS',''), name: name || symbol, quantity: Number(quantity), buyPrice: Number(buyPrice), buyDate: new Date(buyDate), notes: notes || '' });
    await portfolio.save();
    res.json({ success: true, trade: portfolio.trades[portfolio.trades.length - 1] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/portfolio-tracker/:sessionId/trade/:tradeId ──────────────
router.delete('/:sessionId/trade/:tradeId', async (req, res) => {
  try {
    const portfolio = await PortfolioTracker.findOne({ sessionId: req.params.sessionId });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    portfolio.trades = portfolio.trades.filter(t => t._id.toString() !== req.params.tradeId);
    await portfolio.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/portfolio-tracker/:sessionId/pnl — live P&L dashboard ───────
router.get('/:sessionId/pnl', async (req, res) => {
  try {
    const portfolio = await PortfolioTracker.findOne({ sessionId: req.params.sessionId });
    if (!portfolio || !portfolio.trades.length)
      return res.json({ success: true, holdings: [], summary: { totalInvested: 0, currentValue: 0, totalPnL: 0, totalPnLPct: 0, dayPnL: 0, xirr: null } });

    const holdings = aggregateHoldings(portfolio.trades);
    let totalInvested  = 0;
    let currentValue   = 0;
    let dayPnL         = 0;
    const xirrFlows    = [];
    const enriched     = [];

    for (const h of holdings) {
      const quote = await fetchCurrentPrice(h.symbol);
      const price = quote ? quote.price : h.avgCost;
      const prev  = quote ? quote.prevClose : price;

      const investedAmt = h.totalCost;
      const currentAmt  = h.totalQty * price;
      const pnl         = currentAmt - investedAmt;
      const pnlPct      = investedAmt > 0 ? (pnl / investedAmt) * 100 : 0;
      const dayChange   = h.totalQty * (price - prev);

      totalInvested += investedAmt;
      currentValue  += currentAmt;
      dayPnL        += dayChange;

      // XIRR cash flows: negative on buy dates, positive (current) at today
      for (const t of h.trades) {
        xirrFlows.push({ amount: -(t.quantity * t.buyPrice), date: t.buyDate });
      }

      // Tax classification
      const taxBreakdown = h.trades.map(t => ({
        tradeId:  t._id,
        buyDate:  t.buyDate,
        qty:      t.quantity,
        buyPrice: t.buyPrice,
        taxType:  taxClass(t.buyDate),
      }));

      enriched.push({
        symbol:       h.symbol,
        name:         quote ? quote.name : h.name,
        totalQty:     h.totalQty,
        avgCost:      Math.round(h.avgCost * 100) / 100,
        currentPrice: price,
        invested:     Math.round(investedAmt * 100) / 100,
        currentValue: Math.round(currentAmt * 100) / 100,
        pnl:          Math.round(pnl * 100) / 100,
        pnlPct:       Math.round(pnlPct * 100) / 100,
        dayChange:    Math.round(dayChange * 100) / 100,
        weight:       0, // computed after total
        high52w:      quote ? quote.high52w : null,
        low52w:       quote ? quote.low52w  : null,
        taxBreakdown,
        trades:       h.trades,
        tradeCount:   h.trades.length,
      });
    }

    // Weights
    enriched.forEach(h => { h.weight = currentValue > 0 ? Math.round((h.currentValue / currentValue) * 10000) / 100 : 0; });

    // Today's XIRR flow
    xirrFlows.push({ amount: currentValue, date: new Date() });
    const xirrVal = xirr(xirrFlows);

    const totalPnL    = currentValue - totalInvested;
    const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    res.json({
      success: true,
      holdings: enriched,
      summary: {
        totalInvested:  Math.round(totalInvested  * 100) / 100,
        currentValue:   Math.round(currentValue   * 100) / 100,
        totalPnL:       Math.round(totalPnL       * 100) / 100,
        totalPnLPct:    Math.round(totalPnLPct    * 100) / 100,
        dayPnL:         Math.round(dayPnL         * 100) / 100,
        xirr:           xirrVal,
        holdingCount:   enriched.length,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/portfolio-tracker/:sessionId/calendar — P&L calendar ─────────
router.get('/:sessionId/calendar', async (req, res) => {
  try {
    const portfolio = await PortfolioTracker.findOne({ sessionId: req.params.sessionId });
    if (!portfolio || !portfolio.trades.length)
      return res.json({ success: true, calendar: [], stats: {} });

    const holdings = aggregateHoldings(portfolio.trades);
    const symbols  = [...new Set(holdings.map(h => h.symbol))];
    const oldest   = portfolio.trades.reduce((min, t) => t.buyDate < min ? t.buyDate : min, new Date());

    // Fetch historical for each symbol
    const histMap = {};
    for (const sym of symbols) {
      histMap[sym] = await fetchHistoricalClose(sym, oldest);
    }

    // Build daily portfolio value
    const dayMap = {};
    for (const h of holdings) {
      const hist = histMap[h.symbol] || [];
      for (const d of hist) {
        const dk = d.date.toISOString().slice(0, 10);
        if (!dayMap[dk]) dayMap[dk] = { value: 0, prevValue: 0 };
        dayMap[dk].value += h.totalQty * d.close;
      }
    }

    // Compute daily returns
    const sortedDays = Object.keys(dayMap).sort();
    const calendar   = [];
    for (let i = 1; i < sortedDays.length; i++) {
      const today = sortedDays[i];
      const prev  = sortedDays[i - 1];
      const pnl   = dayMap[today].value - dayMap[prev].value;
      const pct   = dayMap[prev].value > 0 ? (pnl / dayMap[prev].value) * 100 : 0;
      calendar.push({ date: today, pnl: Math.round(pnl * 100) / 100, pct: Math.round(pct * 100) / 100 });
    }

    // Stats
    const gains  = calendar.filter(d => d.pnl > 0);
    const losses = calendar.filter(d => d.pnl < 0);
    const bestDay    = calendar.reduce((a, b) => b.pnl > a.pnl ? b : a, calendar[0] || {});
    const worstDay   = calendar.reduce((a, b) => b.pnl < a.pnl ? b : a, calendar[0] || {});

    res.json({
      success: true,
      calendar,
      stats: {
        totalDays:  calendar.length,
        greenDays:  gains.length,
        redDays:    losses.length,
        winRate:    calendar.length > 0 ? Math.round((gains.length / calendar.length) * 100) : 0,
        bestDay,
        worstDay,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/portfolio-tracker/:sessionId/vs-nifty — vs Nifty comparison ─
router.get('/:sessionId/vs-nifty', async (req, res) => {
  try {
    const portfolio = await PortfolioTracker.findOne({ sessionId: req.params.sessionId });
    if (!portfolio || !portfolio.trades.length)
      return res.json({ success: true, comparison: [] });

    const holdings = aggregateHoldings(portfolio.trades);
    const oldest   = portfolio.trades.reduce((min, t) => t.buyDate < min ? t.buyDate : min, new Date());

    // Fetch Nifty50 historical
    const niftyHist = await fetchHistoricalClose('^NSEI', oldest).catch(() => []);
    const niftyMap  = {};
    niftyHist.forEach(d => { niftyMap[d.date.toISOString().slice(0, 10)] = d.close; });

    const comparison = [];
    for (const h of holdings) {
      const firstTrade = h.trades.reduce((a, b) => a.buyDate < b.buyDate ? a : b);
      const buyDateStr = firstTrade.buyDate.toISOString().slice(0, 10);
      const hist       = await fetchHistoricalClose(h.symbol, firstTrade.buyDate);

      if (!hist.length) continue;
      const startPrice = hist[0].close;
      const endPrice   = hist[hist.length - 1].close;
      const stockReturn = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

      // Nifty return over same period
      const niftyKeys  = Object.keys(niftyMap).filter(k => k >= buyDateStr).sort();
      const niftyStart = niftyMap[niftyKeys[0]] || 0;
      const niftyEnd   = niftyMap[niftyKeys[niftyKeys.length - 1]] || niftyStart;
      const niftyReturn = niftyStart > 0 ? ((niftyEnd - niftyStart) / niftyStart) * 100 : 0;

      const alpha = stockReturn - niftyReturn;

      comparison.push({
        symbol:      h.symbol,
        name:        h.name,
        buyDate:     buyDateStr,
        stockReturn: Math.round(stockReturn * 100) / 100,
        niftyReturn: Math.round(niftyReturn * 100) / 100,
        alpha:       Math.round(alpha       * 100) / 100,
        outperforming: alpha > 0,
      });
    }

    res.json({ success: true, comparison });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/portfolio-tracker/:sessionId/tax — tax harvesting ────────────
router.get('/:sessionId/tax', async (req, res) => {
  try {
    const portfolio = await PortfolioTracker.findOne({ sessionId: req.params.sessionId });
    if (!portfolio || !portfolio.trades.length)
      return res.json({ success: true, suggestions: [], summary: { ltcgLoss: 0, stcgLoss: 0, estimatedSaving: 0 } });

    const holdings = aggregateHoldings(portfolio.trades);
    const suggestions = [];
    let totalLtcgLoss = 0, totalStcgLoss = 0;

    for (const h of holdings) {
      const quote = await fetchCurrentPrice(h.symbol);
      if (!quote) continue;
      const currentPrice = quote.price;

      for (const t of h.trades) {
        const pnl  = (currentPrice - t.buyPrice) * t.quantity;
        const type = taxClass(t.buyDate);
        const holdDays = Math.floor((Date.now() - new Date(t.buyDate).getTime()) / (24 * 3600 * 1000));

        if (pnl < 0) {
          const taxSaving = type === 'LTCG' ? Math.abs(pnl) * 0.10 : Math.abs(pnl) * 0.15;
          if (type === 'LTCG') totalLtcgLoss += Math.abs(pnl);
          else                  totalStcgLoss += Math.abs(pnl);

          suggestions.push({
            symbol:     h.symbol,
            name:       h.name,
            tradeId:    t._id,
            quantity:   t.quantity,
            buyPrice:   t.buyPrice,
            buyDate:    t.buyDate,
            currentPrice,
            pnl:        Math.round(pnl * 100) / 100,
            taxType:    type,
            holdDays,
            daysToLTCG: type === 'STCG' ? Math.max(0, 365 - holdDays) : 0,
            estimatedTaxSaving: Math.round(taxSaving * 100) / 100,
          });
        }
      }
    }

    // Sort by estimated saving desc
    suggestions.sort((a, b) => b.estimatedTaxSaving - a.estimatedTaxSaving);

    res.json({
      success: true,
      suggestions,
      summary: {
        ltcgLoss: Math.round(totalLtcgLoss * 100) / 100,
        stcgLoss: Math.round(totalStcgLoss * 100) / 100,
        estimatedSaving: Math.round((totalLtcgLoss * 0.10 + totalStcgLoss * 0.15) * 100) / 100,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

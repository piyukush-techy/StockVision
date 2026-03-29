// eventsFetcher.js - Corporate Events & FII/DII Flow Data
const axios = require('axios');
const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0' };
async function yfQuote(symbol) {
  const r = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, { params: { interval: '1d', range: '1d' }, headers: YF_HEADERS, timeout: 8000 });
  const q = r.data?.chart?.result?.[0]?.meta || {};
  return { regularMarketChangePercent: q.regularMarketChangePercent || 0, regularMarketPrice: q.regularMarketPrice || 0 };
}

// Get FII/DII Flow Data
async function getFIIDIIFlow() {
  try {
    // In production: Fetch from NSE/BSE official APIs
    // For now: Simulate realistic data based on market movement
    
    const nifty = await yfQuote('^NSEI');
    const niftyChange = nifty.regularMarketChangePercent || 0;

    // Simulate FII/DII flow (in Crores)
    // FII: More volatile, trend-following
    // DII: Counter-cyclical, support market on down days
    
    const fiiFlow = simulateFIIFlow(niftyChange);
    const diiFlow = simulateDIIFlow(niftyChange);
    const retailFlow = -(fiiFlow + diiFlow); // Retail is opposite of institutions

    // Get week trend
    const weekData = await getWeeklyFlow();

    return {
      today: {
        fii: {
          amount: fiiFlow,
          type: fiiFlow > 0 ? 'Buy' : 'Sell',
          color: fiiFlow > 0 ? '#22c55e' : '#dc2626'
        },
        dii: {
          amount: diiFlow,
          type: diiFlow > 0 ? 'Buy' : 'Sell',
          color: diiFlow > 0 ? '#22c55e' : '#dc2626'
        },
        retail: {
          amount: retailFlow,
          type: retailFlow > 0 ? 'Buy' : 'Sell',
          color: retailFlow > 0 ? '#22c55e' : '#dc2626'
        }
      },
      week: weekData,
      summary: generateFlowSummary(fiiFlow, diiFlow),
      timestamp: new Date()
    };

  } catch (error) {
    console.error('❌ FII/DII flow error:', error.message);
    return getDefaultFlowData();
  }
}

function simulateFIIFlow(niftyChange) {
  // FII: Amplify market movement
  const baseFlow = niftyChange * 500; // 1% move = ₹500 Cr
  const volatility = (Math.random() - 0.5) * 200;
  return Math.round(baseFlow + volatility);
}

function simulateDIIFlow(niftyChange) {
  // DII: Counter-cyclical (buy on dips, sell on rallies)
  const baseFlow = niftyChange * -300; // Opposite direction
  const stability = (Math.random() - 0.5) * 100;
  return Math.round(baseFlow + stability);
}

async function getWeeklyFlow() {
  // Simulate 5-day trend
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return days.map((day, i) => ({
    day,
    fii: Math.round((Math.random() - 0.5) * 1000),
    dii: Math.round((Math.random() - 0.5) * 600)
  }));
}

function generateFlowSummary(fii, dii) {
  if (fii > 500 && dii > 0) {
    return '🟢 Strong buying from both FII and DII. Bullish signal.';
  } else if (fii < -500 && dii < 0) {
    return '🔴 Heavy selling from both FII and DII. Bearish signal.';
  } else if (fii > 0 && dii < 0) {
    return '🟡 FII buying but DII selling. Mixed signal.';
  } else if (fii < 0 && dii > 0) {
    return '🟡 DII supporting the market despite FII selling.';
  } else {
    return '⚪ Balanced institutional activity. Neutral.';
  }
}

function getDefaultFlowData() {
  return {
    today: {
      fii: { amount: 0, type: 'Neutral', color: '#6b7280' },
      dii: { amount: 0, type: 'Neutral', color: '#6b7280' },
      retail: { amount: 0, type: 'Neutral', color: '#6b7280' }
    },
    week: [],
    summary: 'Data unavailable',
    timestamp: new Date()
  };
}

// Get Advance/Decline Ratio
async function getAdvanceDeclineRatio() {
  try {
    // Fetch sample of Nifty 50 stocks
    const symbols = [
      'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
      'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
      'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'MARUTI.NS', 'SUNPHARMA.NS'
    ];

    const quotes = await Promise.all(
      symbols.map(s => yfQuote(s).catch(() => null))
    );

    let advancing = 0;
    let declining = 0;
    let unchanged = 0;

    quotes.forEach(q => {
      if (!q) return;
      const change = q.regularMarketChangePercent || 0;
      if (change > 0.1) advancing++;
      else if (change < -0.1) declining++;
      else unchanged++;
    });

    const total = advancing + declining + unchanged;
    const ratio = declining > 0 ? (advancing / declining).toFixed(2) : '∞';

    let signal, color;
    if (advancing > declining * 2) {
      signal = 'Strong Bullish';
      color = '#22c55e';
    } else if (advancing > declining) {
      signal = 'Bullish';
      color = '#3b82f6';
    } else if (advancing === declining) {
      signal = 'Neutral';
      color = '#6b7280';
    } else if (declining > advancing) {
      signal = 'Bearish';
      color = '#f59e0b';
    } else {
      signal = 'Strong Bearish';
      color = '#dc2626';
    }

    return {
      advancing,
      declining,
      unchanged,
      ratio,
      signal,
      color,
      percentage: {
        advancing: ((advancing / total) * 100).toFixed(1),
        declining: ((declining / total) * 100).toFixed(1),
        unchanged: ((unchanged / total) * 100).toFixed(1)
      },
      timestamp: new Date()
    };

  } catch (error) {
    console.error('❌ A/D ratio error:', error.message);
    return {
      advancing: 0,
      declining: 0,
      unchanged: 0,
      ratio: '1.00',
      signal: 'Neutral',
      color: '#6b7280',
      percentage: { advancing: '0', declining: '0', unchanged: '0' },
      timestamp: new Date()
    };
  }
}

// Get Corporate Events for a stock
async function getCorporateEvents(symbol) {
  try {
    // In production: Fetch from NSE/BSE announcements API
    // For now: Return simulated upcoming events
    
    const events = [
      {
        type: 'Dividend',
        date: getRandomFutureDate(30),
        details: 'Interim Dividend ₹5 per share',
        exDate: getRandomFutureDate(25),
        icon: '💰',
        color: '#22c55e'
      },
      {
        type: 'Board Meeting',
        date: getRandomFutureDate(15),
        details: 'To consider quarterly results',
        icon: '📊',
        color: '#3b82f6'
      },
      {
        type: 'AGM',
        date: getRandomFutureDate(90),
        details: 'Annual General Meeting',
        icon: '👥',
        color: '#8b5cf6'
      }
    ];

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      symbol,
      events,
      count: events.length,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('❌ Events fetch error:', error.message);
    return {
      symbol,
      events: [],
      count: 0,
      timestamp: new Date()
    };
  }
}

// Get general market events calendar
async function getMarketEventsCalendar() {
  try {
    const today = new Date();
    
    const events = [
      {
        date: addDays(today, 3),
        event: 'RBI Monetary Policy',
        impact: 'High',
        color: '#dc2626'
      },
      {
        date: addDays(today, 7),
        event: 'US Fed Meeting',
        impact: 'High',
        color: '#dc2626'
      },
      {
        date: addDays(today, 14),
        event: 'India CPI Data',
        impact: 'Medium',
        color: '#f59e0b'
      },
      {
        date: addDays(today, 21),
        event: 'Quarterly Results Season Begins',
        impact: 'High',
        color: '#dc2626'
      },
      {
        date: addDays(today, 30),
        event: 'Monthly Derivatives Expiry',
        impact: 'Medium',
        color: '#f59e0b'
      }
    ];

    return {
      events,
      count: events.length,
      timestamp: new Date()
    };

  } catch (error) {
    return { events: [], count: 0, timestamp: new Date() };
  }
}

// Helper functions
function getRandomFutureDate(maxDays) {
  const days = Math.floor(Math.random() * maxDays) + 1;
  return addDays(new Date(), days);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

module.exports = {
  getFIIDIIFlow,
  getAdvanceDeclineRatio,
  getCorporateEvents,
  getMarketEventsCalendar
};

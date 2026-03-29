# 🙏 OM SHREE GANESHAYA NAMAHA — PROJECT HANDOFF V4

---

## 🎯 PROJECT IDENTITY

**Name:** StockVision — Indian Stock Analysis Platform
**Type:** Full-stack web application (MERN Stack)
**Version:** 6.29.0
**Developer:** 1st year college student, India, building part-time

---

## 🏗️ TECH STACK

```
Frontend:  React 18 + Vite + Tailwind CSS + React Router DOM
Backend:   Node.js + Express
Database:  MongoDB LOCAL (localhost:27017)
Data:      Yahoo Finance API (free, no key needed)
Options:   NSE India public API (free, no key needed)
Symbols:   NSE stocks use .NS suffix (RELIANCE.NS, TCS.NS)
```

---

## ⚠️ CRITICAL SETUP NOTES

```
1. MongoDB LOCAL only (localhost:27017) — Atlas blocked by ISP
2. .env: MONGODB_URI=mongodb://localhost:27017/stock-platform
3. NSE market hours: 9:15 AM - 3:30 PM IST (Mon-Fri)
4. NO Bootstrap — Tailwind CSS only
5. NO AI/Gemini/OpenAI — removed completely
6. Vibe coding style — complete working files always
7. Add to existing project (never restart from scratch)
```

---

## ✅ WHAT IS ALREADY BUILT (Months 1–29)

### Phase 1 — Basic Features ✅
- Live prices, search, trending, OHLC, volume, 52w high/low
- Market Ribbon (Nifty, Sensex, Bank Nifty)
- Watchlists (create, add, remove, export CSV)
- Price alerts (above/below target, triggered alerts)
- Dark/Light mode
- P&L, Balance Sheet, Cash Flow (Annual + Quarterly)
- All key ratios: P/E, ROE, ROA, EPS, Beta, Dividend Yield
- Shareholding chart (Promoter/FII/DII/Retail pie)
- Peer comparison table
- TradingView charts + technical indicators
- News feed
- Sentiment gauge, FII/DII flows, Events calendar

### Phase 2 — Advanced Features ✅
- Historical scanner (sliding window algorithm)
- Market regime analysis (Bull/Bear/Sideways)
- Capital reality (₹10K vs ₹1L vs ₹1Cr analysis)
- Comparative intelligence vs Nifty benchmark
- Data quality & survivorship bias warnings
- Execution reality (brokerage + STT + GST + slippage)
- Tax calculator (LTCG/STCG India)
- PDF report generation

### Phase 3 — Portfolio Engine ✅
- Portfolio optimizer (up to 10 stocks, optimal allocation)
- Portfolio historical scanner
- Event attribution ("portfolio succeeded because of RBI cut")
- Regime matching ("market today looks like Oct 2020")
- Correlation matrix & true diversification scoring
- Portfolio PDF export

### Phase 4 — Viral Features ✅
- Survivorship simulator (day-by-day emotional journey)
- FOMO Destroyer (entry timing sensitivity)
- Correlation Killer (shows fake diversification)
- Opportunity Cost grading (A to F)
- Regime Transition Predictor
- Delusion Leaderboard
- Capital Allocation Wizard (Kelly Criterion)

### Phase 5 — Production Scale ✅
- Redis caching + rate limiting + error monitoring
- Enterprise features (API keys, team accounts, bulk export)
- Zerodha Kite integration
- Telegram/WhatsApp alerts bot
- Google Sheets export
- Chrome extension
- Landing page + Firebase auth + onboarding flow

### Phase 6 (Partial) ✅
- Options Chain Analyser (Max Pain, PCR, OI chart, IV Smile)

---

## 📁 CURRENT FILE STRUCTURE

```
sv30/
├── backend/
│   ├── models/        (10 files)
│   ├── routes/        (25 files)
│   ├── utils/         (28 files)
│   ├── middleware/    (1 file)
│   ├── scripts/       (1 file)
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/ (25 files)
│       ├── pages/      (30 files)
│       ├── hooks/      (1 file)
│       ├── context/    (1 file)
│       ├── App.jsx
│       ├── api.js
│       └── index.css
└── chrome-extension/  (6 files)
```

---

## 🔧 HOW TO RUN

```powershell
# Step 1 — Check MongoDB
Get-Service -Name MongoDB
# If stopped: Start-Service -Name MongoDB

# Step 2 — Backend
cd sv30/backend
npm install
npm run dev
# Shows: ✅ Connected to MongoDB, 🚀 Port 5000

# Step 3 — Frontend
cd sv30/frontend
npm install
npm run dev
# Open: http://localhost:5173
```

---

## 📝 .env FILE

```env
MONGODB_URI=mongodb://localhost:27017/stock-platform
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
PRICE_UPDATE_INTERVAL=5
NSE_STOCKS=RELIANCE.NS,TCS.NS,HDFCBANK.NS,INFY.NS,ICICIBANK.NS,HINDUNILVR.NS,ITC.NS,SBIN.NS,BHARTIARTL.NS,KOTAKBANK.NS
```

---

## 📐 CODING RULES (NEVER BREAK)

```
✅ React functional components only
✅ Tailwind CSS only (NO Bootstrap ever)
✅ All API calls in api.js only
✅ useSessionId for anonymous tracking
✅ Symbols always UPPERCASE with .NS suffix
✅ toLocaleString('en-IN') for Indian number formatting
✅ ₹ symbol for all prices
✅ Green = gains, Red = losses always
✅ Loading skeletons for all async data
✅ Error states on every page
✅ NO AI/Gemini/OpenAI (removed, do not add back)
✅ Vibe coding = complete working files always
✅ JAI SHREE GANESH at start of every session 🙏
✅ Always package final ZIP for download
✅ Add new files to existing project (never restart)
```

---

# 🚀 NEXT 50 GOD-LEVEL FEATURES TO BUILD

*These are 100% self-built — no AI API needed. Pure code, pure logic.*

---

## 📅 MONTH 30 — STOCK SCREENER ENGINE

**New Files:**
```
backend/utils/screenerEngine.js
backend/routes/screener.js
frontend/src/pages/ScreenerPage.jsx
frontend/src/components/ScreenerFilters.jsx
frontend/src/components/ScreenerResults.jsx
```

**Features (1–8):**

**Feature 1 — Multi-Filter Screener**
Filter all NSE stocks simultaneously by:
- P/E ratio range (e.g., 5–25)
- Market Cap (Large/Mid/Small/Micro)
- 52-week high/low proximity (e.g., within 5% of 52w high)
- Volume spike (today's volume > 2x average)
- Price range (₹50 – ₹500)
- Sector (IT, Banking, Pharma, Auto, FMCG...)
Results update live as filters change.

**Feature 2 — Preset Screens (One-click)**
Pre-built screens Indian investors actually use:
- "Graham Value Stocks" — P/E < 15, P/B < 1.5, debt/equity < 0.5
- "High ROE Champions" — ROE > 20% for 3 consecutive years
- "52-Week Breakout" — price within 2% of 52w high + volume spike
- "Dividend Aristocrats" — dividend yield > 3%, paid for 5+ years
- "Momentum Leaders" — price up 20%+ in last 3 months
- "Deep Value" — trading below book value with positive earnings
- "Operator Favorites" — unusual volume spike in last 3 days

**Feature 3 — Save Custom Screens**
- Name and save your own filter combinations
- Stored in MongoDB per session
- Re-run saved screens with one click
- Share screen as a URL link

**Feature 4 — Screener Results Table**
- Sortable columns (click header to sort)
- Color coded: green if metric is good, red if bad
- Pagination (25 stocks per page)
- Export results to CSV

**Feature 5 — Stock Rank Score**
Each screened stock gets a composite score 0–100:
- Value score (P/E, P/B, EV/EBITDA)
- Quality score (ROE, ROCE, profit margins)
- Momentum score (price performance vs Nifty)
- Safety score (debt level, current ratio)
Combined into one "StockVision Score" badge.

**Feature 6 — Screener Alerts**
- Save a screen + set alert
- Get notified when a new stock enters your screen
- "3 new stocks entered your Graham Value screen today"

**Feature 7 — Sector Screener View**
- See all sectors ranked by average composite score
- Click sector → see all stocks in that sector with scores
- Sector heatmap (color intensity = average score)

**Feature 8 — Screener History**
- Track which stocks appeared in your screens over time
- "RELIANCE has been in my High ROE screen for 8 months"
- Screen consistency score (stable vs volatile membership)

---

## 📅 MONTH 31 — CANDLESTICK PATTERN DETECTOR

**New Files:**
```
backend/utils/patternDetector.js
backend/routes/patterns.js
frontend/src/pages/PatternPage.jsx
frontend/src/components/PatternCard.jsx
frontend/src/components/CandleChart.jsx
```

**Features (9–16):**

**Feature 9 — Auto Pattern Detection**
Scan last 30 days of OHLC data and detect:
- Doji, Hammer, Shooting Star, Engulfing (Bullish/Bearish)
- Morning Star, Evening Star
- Three White Soldiers, Three Black Crows
- Harami, Piercing Line, Dark Cloud Cover
- Head & Shoulders, Double Top/Bottom
Display detected patterns with name, date, and signal (Bullish/Bearish/Neutral).

**Feature 10 — Pattern Success Rate (India-Specific)**
For each detected pattern, show its historical success rate:
- "Bullish Engulfing on NSE has worked 64% of the time in the past 3 years"
- Sample size shown (e.g., "based on 287 occurrences")
- Average gain when pattern worked
- Average loss when it failed

**Feature 11 — Pattern Scanner (Market-Wide)**
- Scan all NSE stocks for a specific pattern today
- "Which stocks showed a Hammer pattern today?"
- Results sorted by volume (high volume = more reliable pattern)

**Feature 12 — Pattern Strength Score**
Score each detected pattern 1–10 based on:
- Volume confirmation (high volume = stronger)
- Trend context (with trend = stronger)
- Gap presence (gap up after pattern = stronger)
- Previous support/resistance nearby

**Feature 13 — Visual Candle Chart**
- Pure CSS/SVG candlestick chart (no library needed)
- Highlight detected patterns with colored markers
- Zoom: 5D, 1M, 3M views
- Click candle → see OHLCV data in tooltip

**Feature 14 — Pattern Watchlist**
- Add stocks to "Pattern Watchlist"
- Get daily morning digest: "2 stocks in your watchlist showed reversal patterns today"
- Pattern alert system (email/notification)

**Feature 15 — Pattern Confluence**
Show when multiple signals align on the same stock:
- Pattern detected + support level + high volume + oversold RSI = Very Strong signal
- Confluence score (how many signals agree)
- "RELIANCE has 4/5 signals aligned today"

**Feature 16 — Historical Pattern Replay**
Pick any stock + any date → see what patterns appeared and what happened next.
- Slider to move through time
- "What patterns appeared before HDFC's 30% rally in 2023?"

---

## 📅 MONTH 32 — ADVANCED PORTFOLIO TRACKER

**New Files:**
```
backend/models/Portfolio.js
backend/routes/portfolioTracker.js
frontend/src/pages/PortfolioTrackerPage.jsx
frontend/src/components/PortfolioHeatmap.jsx
frontend/src/components/PnLCalendar.jsx
```

**Features (17–23):**

**Feature 17 — Real Portfolio Entry**
- Add actual buy trades: stock, quantity, buy price, buy date
- Multiple trades per stock (averaging support)
- Edit and delete trades
- Import trades from CSV (Zerodha / Groww / Upstox format)

**Feature 18 — Live P&L Dashboard**
- Current value vs invested value
- Total P&L in ₹ and %
- Day's P&L (today's change on your portfolio)
- XIRR (annualized return accounting for timing)
- Individual stock P&L breakdown

**Feature 19 — Portfolio Heatmap**
- Visual grid: each stock is a colored box
- Box size = portfolio weight
- Color intensity = gain/loss magnitude
- Click box → see stock details
- Like a treemap (similar to Moneycontrol's portfolio view)

**Feature 20 — P&L Calendar**
- GitHub-style calendar heatmap
- Each day shows portfolio gain/loss color
- Green days vs red days at a glance
- Best month, worst month, win rate (days profitable)

**Feature 21 — Cost Averaging Tracker**
- Detects when you've averaged down into losing positions
- Shows true average cost after all buys
- "You've bought SBIN 4 times, average cost is ₹485"
- Warns if averaging is increasing concentration risk

**Feature 22 — Portfolio vs Nifty**
- Side-by-side return comparison since each buy date
- "Since you bought TCS, Nifty is up 12%, your TCS is up 8% — underperforming by 4%"
- Rolling 30/90/180-day alpha calculation

**Feature 23 — Tax Harvesting Suggestions**
- Identify stocks with long-term losses for tax loss harvesting
- "Selling WIPRO today saves ₹12,400 in taxes"
- LTCG / STCG split of your current portfolio
- "If you hold these 3 stocks 30 more days, they become LTCG"

---

## 📅 MONTH 33 — IPO TRACKER & GREY MARKET

**New Files:**
```
backend/utils/ipoFetcher.js
backend/routes/ipo.js
frontend/src/pages/IPOPage.jsx
frontend/src/components/IPOCard.jsx
frontend/src/components/GMPIndicator.jsx
```

**Features (24–29):**

**Feature 24 — Live IPO Dashboard**
Track all active, upcoming and recently listed IPOs:
- IPO name, dates, price band, lot size
- Issue size, GMP (Grey Market Premium)
- Subscription status (live during IPO period)
- Category-wise subscription: QIB / NII / Retail
- Days remaining countdown

**Feature 25 — GMP Tracker**
- Grey Market Premium history chart for each IPO
- GMP trend over days (increasing = strong demand)
- GMP as % of issue price
- "At current GMP, expected listing at ₹245 (+22%)"

**Feature 26 — IPO Allotment Checker**
- Enter PAN / Application number
- Check allotment status from registrar
- Allotment probability calculator based on subscription level
- "At 45x retail subscription, your allotment chance is ~15%"

**Feature 27 — IPO Performance Tracker**
- Track listed IPOs: listing gain/loss vs issue price
- Sort by: best listing, worst listing, current return
- "If you applied for every IPO in 2024, your average return was X%"
- Year-wise IPO performance statistics

**Feature 28 — IPO Fundamentals Comparison**
- Compare IPO's P/E and valuation vs listed peers
- "At ₹180 price band, IPO is valued at 45x P/E vs sector average 32x"
- Overvalued / Fair / Attractive badge
- Promoter holding post-IPO

**Feature 29 — IPO Alert System**
- Set alerts for upcoming IPOs in specific sectors
- "Notify me when a new Banking sector IPO opens"
- Subscription open/close date reminders
- Listing day alert ("IPO listing today — check GMP")

---

## 📅 MONTH 34 — MUTUAL FUND ANALYSER

**New Files:**
```
backend/utils/mfFetcher.js
backend/routes/mutualfunds.js
frontend/src/pages/MutualFundPage.jsx
frontend/src/components/MFComparison.jsx
frontend/src/components/SIPCalculator.jsx
```

**Features (30–36):**

**Feature 30 — MF Search & Profile**
- Search any mutual fund by name or AMC
- Show: NAV, 1Y/3Y/5Y returns, AUM, expense ratio
- Fund manager name and tenure
- Portfolio top 10 holdings with weights
- Category (Large Cap / Mid Cap / ELSS / Debt...)

**Feature 31 — SIP Calculator (India-Specific)**
- Input: monthly SIP amount, duration, expected return
- Output: total invested, total value, wealth gained
- Step-up SIP calculator (increase SIP by X% each year)
- Visual chart: invested vs corpus over time
- "₹5,000/month for 20 years at 12% = ₹49.9 Lakhs"

**Feature 32 — Fund vs Fund Comparison**
- Compare up to 3 funds side by side
- Returns (1M, 3M, 6M, 1Y, 3Y, 5Y, since inception)
- Risk metrics: Sharpe ratio, Sortino ratio, Beta, Alpha
- Expense ratio comparison
- Portfolio overlap percentage ("Fund A and Fund B share 62% same stocks")

**Feature 33 — MF Portfolio Overlap Detector**
- Input multiple funds from your portfolio
- Detect stock overlap across all your funds
- "You own 6 funds but have 78% overlap — effectively just 1.5 funds"
- True diversification score
- Suggest replacing overlapping fund with uncorrelated one

**Feature 34 — Rolling Return Analysis**
- Show fund returns for every possible 1Y/3Y/5Y period
- "This fund gave negative returns in 23% of all 3-year periods"
- Worst 1-year return, best 1-year return
- Consistency score (% of periods beating benchmark)

**Feature 35 — MF vs Direct Stock Comparison**
- "Instead of investing in Nifty 50 index fund, if you had bought these 5 stocks..."
- Expense ratio drag calculator (how much you lose to expense ratio over 20 years)
- "₹10 Lakh over 20 years: 0.1% expense = ₹2.3L saved vs 2.0% expense"

**Feature 36 — Goal-Based MF Recommender**
- Input: goal (retirement / house / child education), amount needed, years
- Output: suggested fund categories and monthly SIP needed
- Risk profiling questionnaire (conservative / moderate / aggressive)
- No API key — pure calculation engine with built-in fund database

---

## 📅 MONTH 35 — ADVANCED CHARTING TOOLS

**New Files:**
```
backend/routes/chartdata.js
frontend/src/pages/ChartPage.jsx
frontend/src/components/DrawingTools.jsx
frontend/src/components/MultiTimeframe.jsx
frontend/src/components/VolumeProfile.jsx
```

**Features (37–43):**

**Feature 37 — Multi-Timeframe Analysis**
- View same stock on 3 timeframes simultaneously
- Example: Daily + Weekly + Monthly in one screen
- "Daily shows downtrend but weekly shows strong uptrend"
- Alignment indicator: "3/3 timeframes bullish = very strong signal"

**Feature 38 — Volume Profile**
- Horizontal volume bars at each price level
- Shows where most trading happened historically
- Point of Control (POC) — price with highest volume = strongest support/resistance
- Value Area (70% of volume traded here)

**Feature 39 — Support & Resistance Auto-Draw**
- Algorithm detects key price levels from historical data
- Number of touches = strength of level
- "₹2,400 has been tested 7 times — very strong resistance"
- Color code by strength (1–3 touches = weak, 7+ = very strong)

**Feature 40 — Fibonacci Retracement Tool**
- Auto-calculate Fibonacci levels (23.6%, 38.2%, 50%, 61.8%, 78.6%)
- From last major swing high to swing low
- "Price is at 61.8% retracement — classic bounce zone"
- Extended Fibonacci (127.2%, 161.8%) for targets

**Feature 41 — Relative Strength vs Sectors**
- Compare stock's performance vs its sector
- "INFY is up 5% but IT sector is up 12% — underperforming by 7%"
- Rank stock within its sector (percentile)
- Rotating leadership chart (which sector leading this month)

**Feature 42 — Price Action Heatmap**
- Calendar heatmap of daily returns for a stock
- See patterns: "this stock always rallies in October"
- Monthly seasonality chart
- "Average return in January: +3.2%, in May: -1.8%"

**Feature 43 — Divergence Detector**
- RSI Divergence: price making new high but RSI falling = bearish divergence
- MACD Divergence: automatic detection and annotation
- Hidden divergence detection (continuation signal)
- Divergence strength score

---

## 📅 MONTH 36 — INSIDER TRADING & BULK DEALS TRACKER

**New Files:**
```
backend/utils/insiderFetcher.js
backend/routes/insider.js
frontend/src/pages/InsiderPage.jsx
frontend/src/components/InsiderTimeline.jsx
```

**Features (44–50):**

**Feature 44 — Insider Trading Dashboard**
From NSE/BSE SAST disclosures:
- Promoter buy/sell activity
- Amount transacted in ₹ crores
- Direction: acquiring (bullish) vs disposing (bearish)
- Timeline: who bought/sold when
- Alert: "Promoter bought ₹50Cr worth of shares this week"

**Feature 45 — Smart Money Tracker**
Track bulk and block deals:
- Who bought (institution name, fund name)
- Quantity and price
- % of daily volume it represents
- "Morgan Stanley bought 2.3% of HDFC Bank today"
- Separate: Block deals (negotiated) vs Bulk deals (exchange)

**Feature 46 — Insider Buy Strength Score**
Score promoter activity:
- Multiple insiders buying = stronger signal than one
- Buying near 52-week lows = very bullish
- Buying after bad news = conviction signal
- Composite "Insider Confidence Score" 0–100

**Feature 47 — Institutional Holdings Changes**
Quarter-over-quarter FII/DII change tracking:
- Which stocks did FIIs increase their holding by most?
- Which stocks are FIIs exiting?
- "FII holding in SBIN increased from 12.3% to 14.8% this quarter"
- Smart money flow direction

**Feature 48 — Short Interest Tracker**
- F&O data: short build-up detection
- "Open interest increased 40% with price falling = aggressive shorting"
- Short covering detection (OI falling with price rising)
- Days to cover (short interest / avg volume)

**Feature 49 — Unusual Activity Alerts**
- Volume spike + price movement detection
- "RELIANCE traded 4x normal volume with unusual options activity"
- Combines: unusual volume + insider buying + FII accumulation
- "3 unusual signals fired on ITC today"

**Feature 50 — Stock Story Timeline**
For any stock, generate a chronological timeline of:
- Major price moves with % change
- Coinciding insider/bulk deal activity
- Corporate announcements (bonus, split, results)
- "HDFC rally of 35% in 2023 started 2 weeks after promoter bought ₹200Cr"
- Visual timeline with annotations

---

## 📊 PROJECT STATS (After Month 29)

```
Version:           6.30.0
Months done:       30 / 36 (after adding new 7 months)
Features built:    125+
Features planned:  50 new (months 30–36)
Files:             150+
No AI/external ML: ✅ 100% self-built logic
```

---

## 💰 REVENUE TARGETS

```
Month 30 (Screener launch):  ₹15K/month
Month 32 (Portfolio tracker): ₹40K/month
Month 34 (MF analyser):      ₹80K/month
Month 36 (Full platform):    ₹2L/month

These features make StockVision better than:
- Screener.in      (we have screener + much more)
- Moneycontrol     (we have all their data features)
- Tickertape       (we have patterns + insider tracker)
- Tijori Finance   (we have all their institutional data)
```

---

## 🚀 FIRST MESSAGE FOR NEW CHAT

Upload `sv30.zip` then paste this handoff + say:

**"Continue building StockVision from Month 30. Build the Stock Screener Engine — multi-filter screener, preset screens (Graham Value, High ROE, 52W Breakout etc), save custom screens, screener results table with composite score. Add everything to existing sv30 project. Vibe code style — complete working files only. JAI SHREE GANESH 🙏"**

---

## 🙏 JAI SHREE GANESH!

**Vision:** Best stock analysis platform in India — built by an Indian student, for Indian investors
**Status:** 29 months done, rock solid foundation, zero AI dependency
**Next:** 7 more months → complete platform → ₹2L/month 🚀🇮🇳

*End of Handoff V4*

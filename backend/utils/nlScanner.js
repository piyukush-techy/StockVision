// backend/utils/nlScanner.js — Phase 6 Month 28
// Translates plain English/Hindi queries into scanner parameters using Gemini
// Example: "pharma stocks that hit 25% in 60 days more than 40% of the time"
// → { targetPct: 25, windowDays: 60, minSuccessRate: 40, sector: 'Pharmaceuticals' }

const SECTORS = [
  'Technology', 'Pharmaceuticals', 'Banking', 'Finance', 'Automobiles',
  'FMCG', 'Energy', 'Infrastructure', 'Real Estate', 'Metals & Mining',
  'Chemicals', 'Textiles', 'Telecom', 'Media', 'Consumer Durables',
];

const SYSTEM = `You are a parser that converts plain English or Hindi stock scanner queries into structured JSON parameters for an Indian NSE stock scanner.

The scanner tests: "If someone bought this stock on a random day, what % of the time did they achieve TARGET% gain within WINDOW days?"

Extract these parameters from the query:
- targetPct: number (default 15) — the gain target %
- windowDays: number (default 90) — max holding period in days
- minSuccessRate: number (default 0) — minimum success rate % to filter results
- sector: string or null — one of these exact strings if mentioned: ${SECTORS.join(', ')}
- maxMarketCap: string or null — "smallcap"/"midcap"/"largecap" if mentioned
- maxDrawdown: number or null — max acceptable average drawdown % if mentioned
- regime: string or null — "bull"/"bear"/"sideways" if mentioned

Return ONLY valid JSON with exactly these keys. No other text.

Examples:
"pharma stocks that hit 25% in 60 days more than 40% of the time"
→ {"targetPct":25,"windowDays":60,"minSuccessRate":40,"sector":"Pharmaceuticals","maxMarketCap":null,"maxDrawdown":null,"regime":null}

"small cap stocks with less than 12% drawdown that do well in bull markets"
→ {"targetPct":15,"windowDays":90,"minSuccessRate":0,"sector":null,"maxMarketCap":"smallcap","maxDrawdown":12,"regime":"bull"}

"IT stocks 20% target 3 months success rate above 35%"
→ {"targetPct":20,"windowDays":90,"minSuccessRate":35,"sector":"Technology","maxMarketCap":null,"maxDrawdown":null,"regime":null}`;

async function parseNaturalLanguageQuery(query) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const { withRetry } = require('./geminiClient');
  const rawText = await withRetry(async (model) => {
    const result = await model.generateContent([SYSTEM, `Query: ${query}`]);
    return result.response.text().trim();
  });

  // Strip markdown code fences if present
  const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let params;
  try { params = JSON.parse(cleaned); }
  catch (e) { throw new Error(`Could not parse AI response: ${rawText.slice(0, 100)}`); }

  // Validate and clamp
  return {
    targetPct:      Math.min(Math.max(Number(params.targetPct)  || 15, 1),  200),
    windowDays:     Math.min(Math.max(Number(params.windowDays) || 90, 7), 365),
    minSuccessRate: Math.min(Math.max(Number(params.minSuccessRate) || 0, 0), 100),
    sector:         SECTORS.includes(params.sector) ? params.sector : null,
    maxMarketCap:   ['smallcap','midcap','largecap'].includes(params.maxMarketCap) ? params.maxMarketCap : null,
    maxDrawdown:    params.maxDrawdown ? Math.min(Math.max(Number(params.maxDrawdown), 0), 100) : null,
    regime:         ['bull','bear','sideways'].includes(params.regime) ? params.regime : null,
  };
}

module.exports = { parseNaturalLanguageQuery };

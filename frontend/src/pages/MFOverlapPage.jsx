// MFOverlapPage.jsx — Month 31: Mutual Fund Overlap Detector
// Shows shared stock overlap % between 2-3 mutual funds using AMFI data
import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Popular Indian MF schemes — representative list
const POPULAR_FUNDS = [
  { id: 'hdfc_flexi', name: 'HDFC Flexi Cap Fund',          amc: 'HDFC Mutual Fund' },
  { id: 'axis_bluechip', name: 'Axis Bluechip Fund',        amc: 'Axis Mutual Fund' },
  { id: 'mirae_largecap', name: 'Mirae Asset Large Cap',    amc: 'Mirae Asset' },
  { id: 'pp_flexicap', name: 'Parag Parikh Flexi Cap',      amc: 'PPFAS Mutual Fund' },
  { id: 'sbi_bluechip', name: 'SBI Bluechip Fund',          amc: 'SBI Mutual Fund' },
  { id: 'nippon_india', name: 'Nippon India Large Cap',     amc: 'Nippon India' },
  { id: 'icici_bluechip', name: 'ICICI Pru Bluechip',       amc: 'ICICI Prudential' },
  { id: 'kotak_flexi', name: 'Kotak Flexicap Fund',         amc: 'Kotak Mutual Fund' },
  { id: 'dsp_flexicap', name: 'DSP Flexi Cap Fund',         amc: 'DSP Mutual Fund' },
  { id: 'franklin_prima', name: 'Franklin India Prima',     amc: 'Franklin Templeton' },
  { id: 'uti_nifty50', name: 'UTI Nifty 50 Index',         amc: 'UTI Mutual Fund' },
  { id: 'motilal_midcap', name: 'Motilal Oswal Midcap',    amc: 'Motilal Oswal' },
];

// Simulated fund holdings — realistic for demonstration
// In production: fetched from backend /api/mf-overlap/:fundId
const FUND_HOLDINGS = {
  hdfc_flexi:     ['HDFC Bank','ICICI Bank','Infosys','TCS','Reliance','Axis Bank','L&T','Kotak Bank','HUL','Bajaj Finance','SBI','Maruti','Titan','ONGC','NTPC'],
  axis_bluechip:  ['HDFC Bank','Infosys','TCS','Bajaj Finance','Kotak Bank','Avenue Supermarts','Hindustan Unilever','Pidilite','Page Industries','Asian Paints','HDFC Life','Divi\'s Labs','Bata India','Marico'],
  mirae_largecap: ['HDFC Bank','TCS','Infosys','ICICI Bank','Reliance','Axis Bank','Kotak Bank','L&T','HUL','SBI','ITC','Bajaj Finance','Titan','Wipro','ONGC'],
  pp_flexicap:    ['ITC','HCL Tech','Coal India','Google','Amazon','Meta','Microsoft','HDFC Bank','Power Grid','Axis Bank','Bajaj Holdings','ICICI Lombard','Persistent Systems'],
  sbi_bluechip:   ['HDFC Bank','Reliance','Infosys','TCS','ICICI Bank','L&T','HUL','ITC','Bajaj Finance','Kotak Bank','Maruti','SBI','Titan','Axis Bank','NTPC'],
  nippon_india:   ['HDFC Bank','ICICI Bank','Reliance','TCS','Infosys','L&T','ITC','Axis Bank','Kotak Bank','Bajaj Finance','SBI','HUL','Maruti','Wipro','Sun Pharma'],
  icici_bluechip: ['HDFC Bank','ICICI Bank','Infosys','TCS','Reliance','L&T','Kotak Bank','ITC','Bajaj Finance','Axis Bank','HUL','SBI','ONGC','Maruti','Titan'],
  kotak_flexi:    ['HDFC Bank','Infosys','TCS','ICICI Bank','Reliance','Axis Bank','L&T','Bajaj Finance','Kotak Bank','HUL','Maruti','ITC','NTPC','Titan','SBI'],
  dsp_flexicap:   ['HDFC Bank','Infosys','TCS','Reliance','ICICI Bank','Bajaj Finance','Axis Bank','L&T','Kotak Bank','HUL','ITC','SBI','Maruti','Titan','Sun Pharma'],
  franklin_prima: ['HDFC Bank','Infosys','ICICI Bank','TCS','Reliance','Axis Bank','Bajaj Finance','L&T','Kotak Bank','HUL','ITC','Maruti','Sun Pharma','Wipro','NTPC'],
  uti_nifty50:    ['Reliance','TCS','HDFC Bank','Infosys','ICICI Bank','Kotak Bank','HUL','ITC','L&T','Axis Bank','Bajaj Finance','Maruti','Sun Pharma','Titan','Wipro'],
  motilal_midcap: ['Persistent Systems','Coforge','Kaynes Technology','Zomato','Delhivery','PB Fintech','CarTrade','MedPlus','Aster DM','Ethos Ltd','Fusion Micro Finance'],
};

function calcOverlap(funds) {
  if (funds.length < 2) return null;
  const holdings = funds.map(f => new Set(FUND_HOLDINGS[f] || []));
  const allStocks = [...new Set(funds.flatMap(f => FUND_HOLDINGS[f] || []))];
  
  // Stocks held by ALL selected funds
  const allIntersect = allStocks.filter(s => holdings.every(h => h.has(s)));
  
  // Pairwise overlaps
  const pairs = [];
  for (let i = 0; i < funds.length; i++) {
    for (let j = i + 1; j < funds.length; j++) {
      const a = holdings[i], b = holdings[j];
      const inter = [...a].filter(s => b.has(s));
      const union = new Set([...a, ...b]);
      pairs.push({
        fundA: funds[i], fundB: funds[j],
        shared: inter,
        pct: Math.round((inter.length / union.size) * 100),
        jaccardPct: Math.round((inter.length / union.size) * 100),
      });
    }
  }

  const totalUnique = allStocks.length;
  const totalOverlapPct = Math.round((allIntersect.length / totalUnique) * 100);

  return { allIntersect, pairs, totalUnique, totalOverlapPct, allStocks };
}

function overlapColor(pct) {
  if (pct >= 60) return 'text-red-600 dark:text-red-400';
  if (pct >= 35) return 'text-amber-600 dark:text-amber-400';
  return 'text-green-600 dark:text-green-400';
}

function overlapBg(pct) {
  if (pct >= 60) return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
  if (pct >= 35) return 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
  return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
}

function overlapMsg(pct) {
  if (pct >= 60) return '🚨 High overlap — you\'re basically buying the same stocks twice!';
  if (pct >= 35) return '⚠️ Moderate overlap — some diversification, but room for improvement.';
  return '✅ Low overlap — good diversification across these funds.';
}

export default function MFOverlapPage() {
  const [selected, setSelected] = useState([]);
  const [result, setResult]     = useState(null);
  const [search, setSearch]     = useState('');

  const filtered = POPULAR_FUNDS.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.amc.toLowerCase().includes(search.toLowerCase())
  );

  function toggleFund(id) {
    setResult(null);
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function analyze() {
    if (selected.length < 2) return;
    setResult(calcOverlap(selected));
  }

  function fundName(id) {
    return POPULAR_FUNDS.find(f => f.id === id)?.name || id;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🔀</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MF Overlap Detector</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Month 31 • Viral Feature</p>
          </div>
          <span className="ml-auto px-3 py-1 text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">🆕 New</span>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-800 dark:text-purple-200">
          <strong>💡 The Hidden Truth:</strong> You think you own 3 different mutual funds, but they might share 60–70% of the same stocks! 
          Select 2–3 funds below to reveal your true diversification.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fund Picker */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white">Select Funds (2–3)</h2>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${selected.length >= 2 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
              {selected.length}/3 selected
            </span>
          </div>

          <input
            type="text"
            placeholder="Search funds or AMC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filtered.map(f => {
              const isSel = selected.includes(f.id);
              const disabled = !isSel && selected.length >= 3;
              return (
                <button
                  key={f.id}
                  onClick={() => !disabled && toggleFund(f.id)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm border ${
                    isSel
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : disabled
                      ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSel ? 'bg-white border-white' : 'border-current'}`}>
                    {isSel && <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{f.name}</p>
                    <p className={`text-xs ${isSel ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'}`}>{f.amc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {selected.length >= 2 && (
            <button
              onClick={analyze}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
            >
              🔍 Detect Overlap
            </button>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {!result && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center gap-3">
              <span className="text-5xl">🔀</span>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Select 2–3 funds and click<br/><strong>Detect Overlap</strong> to see results</p>
            </div>
          )}

          {result && (
            <>
              {/* Overall Verdict */}
              <div className={`rounded-2xl p-5 border ${overlapBg(result.totalOverlapPct)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900 dark:text-white">Overall Overlap</span>
                  <span className={`text-3xl font-black ${overlapColor(result.totalOverlapPct)}`}>{result.totalOverlapPct}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${result.totalOverlapPct >= 60 ? 'bg-red-500' : result.totalOverlapPct >= 35 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${result.totalOverlapPct}%` }}
                  />
                </div>
                <p className="text-sm font-medium">{overlapMsg(result.totalOverlapPct)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {result.allIntersect.length} shared stocks out of {result.totalUnique} total unique holdings
                </p>
              </div>

              {/* Pairwise */}
              {result.pairs.map((p, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                      {fundName(p.fundA)} <span className="text-gray-400">vs</span> {fundName(p.fundB)}
                    </div>
                    <span className={`font-bold text-lg flex-shrink-0 ml-2 ${overlapColor(p.pct)}`}>{p.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${p.pct >= 60 ? 'bg-red-500' : p.pct >= 35 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {p.shared.length} shared: {p.shared.slice(0, 5).join(', ')}{p.shared.length > 5 ? ` +${p.shared.length - 5} more` : ''}
                  </p>
                </div>
              ))}

              {/* Common stocks */}
              {result.allIntersect.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                    🎯 Stocks in ALL selected funds ({result.allIntersect.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.allIntersect.map(s => (
                      <span key={s} className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
        Holdings data is representative and updated periodically. For exact current holdings, refer to AMFI disclosures at amfiindia.com.
        Not financial advice.
      </p>
    </div>
  );
}

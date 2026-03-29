// LandingPage.jsx — Month 31 PREMIUM REDESIGN
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';

const TICKER_ITEMS = [
  { sym: 'RELIANCE',  val: '2,847.50',  up: true  }, { sym: 'TCS',       val: '3,921.00',  up: true  },
  { sym: 'HDFCBANK',  val: '1,612.30',  up: false }, { sym: 'INFY',      val: '1,456.80',  up: true  },
  { sym: 'ICICIBANK', val: '1,089.40',  up: true  }, { sym: 'WIPRO',     val: '452.20',    up: false },
  { sym: 'BAJFIN',    val: '6,734.00',  up: true  }, { sym: 'TITAN',     val: '3,218.60',  up: true  },
  { sym: 'MARUTI',    val: '11,432.00', up: true  }, { sym: 'SBIN',      val: '798.45',    up: true  },
  { sym: 'KOTAKBANK', val: '1,745.20',  up: false }, { sym: 'LTIM',      val: '4,892.30',  up: true  },
];

const FEATURES = [
  { icon: '🔬', title: 'Historical Scanner',    desc: 'Exact success rates across 10+ years of NSE data. Probabilities, not opinions.',      path: '/scanner',        badge: 'Most Popular', g1: '#7c3aed', g2: '#4f46e5' },
  { icon: '💼', title: 'Portfolio Optimizer',   desc: 'Regime-matched multi-stock engine with real return estimates and scalability tiers.', path: '/portfolio',       badge: null,           g1: '#0284c7', g2: '#0891b2' },
  { icon: '🔀', title: 'MF Overlap Detector',   desc: 'Reveal how 3 "different" mutual funds are secretly 68% the same stocks.',            path: '/mf-overlap',      badge: '🆕 New',       g1: '#9333ea', g2: '#db2777' },
  { icon: '📦', title: 'Delivery Volume',       desc: 'Spot institutional accumulation before price moves. NSE Bhavcopy signals.',           path: '/delivery-volume', badge: '🆕 New',       g1: '#059669', g2: '#0d9488' },
  { icon: '⚖️', title: 'Asset Comparator',      desc: 'Nifty vs Gold vs Real Estate vs FD — inflation-adjusted, after-tax truth.',          path: '/asset-compare',   badge: '🆕 New',       g1: '#d97706', g2: '#dc2626' },
  { icon: '🧨', title: 'Crisis Stress Test',    desc: 'Run your portfolio through 8 Indian market crashes. See if you survive.',             path: '/crisis-stress',   badge: null,           g1: '#dc2626', g2: '#9f1239' },
  { icon: '🧠', title: 'Psychological Tools',   desc: 'FOMO destroyer, survivorship simulator, opportunity cost calculator.',               path: '/psychology',      badge: null,           g1: '#4f46e5', g2: '#7c3aed' },
  { icon: '⚡', title: 'Execution Reality',     desc: 'True returns after STT, GST, slippage and all taxes. No illusions.',                  path: '/execution',       badge: null,           g1: '#b45309', g2: '#d97706' },
];

const COMPARE_SECTIONS = [
  { cat: 'Data & Prices', icon: '📊', rows: [
    ['Live NSE/BSE prices',              true,  true,  true,  true,  true ],
    ['Historical OHLC (10+ years)',      true,  true,  true,  false, true ],
    ['P&L / Balance Sheet / Cash Flow',  true,  true,  true,  false, true ],
    ['Shareholding patterns',            true,  true,  false, false, true ],
    ['NSE Delivery % (Bhavcopy)',        false, false, false, false, true ],
    ['Corporate events calendar',        false, true,  false, false, true ],
  ]},
  { cat: 'Analysis', icon: '🔬', rows: [
    ['Historical probability scanner',        false, false, false, false, true ],
    ['Regime detection (Bull/Bear/Sideways)', false, false, false, false, true ],
    ['Chart pattern recognition',             false, false, true,  false, true ],
    ['Technical indicators RSI/MACD/EMA',    false, false, true,  true,  true ],
    ['Fear & Greed index',                    false, false, false, false, true ],
    ['Sector rotation heatmap',               false, false, false, false, true ],
  ]},
  { cat: 'Portfolio', icon: '💼', rows: [
    ['Portfolio optimizer',                  false, false, true,  false, true ],
    ['Regime-matched optimization',          false, false, false, false, true ],
    ['Crisis stress test (8 scenarios)',     false, false, false, false, true ],
    ['XIRR portfolio tracker',               false, true,  false, true,  true ],
    ['MF overlap detector',                  false, false, false, false, true ],
    ['Diversification / correlation engine', false, false, false, false, true ],
  ]},
  { cat: 'Psychology', icon: '🧠', rows: [
    ['Psychological bias tools',         false, false, false, false, true ],
    ['Survivorship bias simulator',      false, false, false, false, true ],
    ['FOMO destroyer',                   false, false, false, false, true ],
    ['Opportunity cost calculator',      false, false, false, false, true ],
    ['Delusion leaderboard',             false, false, false, false, true ],
  ]},
  { cat: 'Cost Reality', icon: '💰', rows: [
    ['After-tax execution (STT+LTCG)',   false, false, false, false, true ],
    ['Slippage & friction model',        false, false, false, false, true ],
    ['Capital scalability tiers',        false, false, false, false, true ],
    ['Kelly Criterion wizard',           false, false, false, false, true ],
    ['Asset comparator (5 classes)',     false, false, false, false, true ],
  ]},
  { cat: 'Access', icon: '🆓', rows: [
    ['Free to use',              'p',   true,  'p',   'p',   true ],
    ['No login required',        false, true,  false, false, true ],
    ['Mobile PWA (offline)',     false, false, false, false, true ],
    ['Chrome extension',         false, false, false, false, true ],
    ['Telegram bot alerts',      false, false, false, false, true ],
  ]},
];

const SCORES = [
  { name: 'Screener.in',  score: 11 },
  { name: 'Moneycontrol', score: 14 },
  { name: 'Tickertape',   score: 10 },
  { name: 'Zerodha Kite', score: 7  },
  { name: 'StockVision',  score: 32, highlight: true },
];

function Counter({ target }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null); const done = useRef(false);
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const n = parseFloat(target.replace(/[^0-9.]/g, ''));
        let s = 0;
        const t = setInterval(() => { s++; setVal(Math.round(n*s/60)); if(s>=60) clearInterval(t); }, 20);
      }
    }, { threshold: 0.5 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, [target]);
  const pre = target.startsWith('₹') ? '₹' : '';
  const suf = target.includes('+') ? '+' : '';
  return <span ref={ref}>{pre}{val.toLocaleString('en-IN')}{suf}</span>;
}

function CheckIcon() {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full"
      style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}
function CrossIcon() {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full"
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <svg className="w-3 h-3 text-red-500" viewBox="0 0 12 12" fill="none">
        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </span>
  );
}
function PartialIcon() {
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold"
      style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', color:'#fbbf24' }}>~</span>
  );
}
function Cell({ v }) {
  if (v === true) return <CheckIcon />;
  if (v === 'p')  return <PartialIcon />;
  return <CrossIcon />;
}

export default function LandingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#060912' }}>

      {/* BG */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.03) 1px,transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-60 w-[600px] h-[600px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      </div>

      {/* TICKER */}
      <div className="relative z-10 overflow-hidden py-2.5" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', animation: 'ticker 35s linear infinite', whiteSpace: 'nowrap' }}>
          {[...TICKER_ITEMS,...TICKER_ITEMS,...TICKER_ITEMS].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2 mx-6 text-xs">
              <span className="font-mono font-bold" style={{ color: '#64748b' }}>{t.sym}</span>
              <span className="font-mono" style={{ color: t.up ? '#4ade80' : '#f87171' }}>
                {t.up ? '▲' : '▼'} ₹{t.val}
              </span>
              <span style={{ color: '#1e293b' }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-20 pb-24 min-h-[95vh]">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2.5 mb-10 px-5 py-2.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', letterSpacing: '0.1em', color: '#818cf8' }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          LIVE NSE & BSE &nbsp;·&nbsp; 158 FEATURES &nbsp;·&nbsp; FREE FOREVER
        </div>

        {/* Headline */}
        <h1 className="font-black leading-[0.88] tracking-[-0.03em] mb-8 max-w-5xl"
          style={{ fontSize: 'clamp(3rem, 9vw, 7rem)' }}>
          <span className="block" style={{ color: '#f1f5f9' }}>India's Sharpest</span>
          <span className="block" style={{
            background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 35%, #38bdf8 70%, #34d399 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Stock Analysis</span>
          <span className="block" style={{ color: '#f1f5f9' }}>Platform</span>
        </h1>

        <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ color: '#64748b' }}>
          Not just charts —{' '}
          <span style={{ color: '#e2e8f0' }}>real probability analysis</span>, execution costs,
          psychological tools, and regime-aware portfolio optimization.
          Built for Indian retail investors.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
          <Link to="/markets"
            className="relative px-9 py-4 rounded-2xl font-bold text-base text-white overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 40px rgba(99,102,241,0.3)' }}>
            {user ? 'Go to Dashboard →' : 'Start Free — No Signup →'}
          </Link>
          {!user && (
            <Link to="/login"
              className="px-9 py-4 rounded-2xl font-bold text-base transition-all hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>
              Sign In
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 justify-center mb-16">
          {['🔒 No login required','⚡ 5s live prices','🇮🇳 NSE · BSE · MCX','₹0 always free','📱 Mobile PWA'].map(t => (
            <span key={t} className="px-3.5 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}>
              {t}
            </span>
          ))}
        </div>

        {/* Mock dashboard */}
        <div className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(9,12,22,0.95)', backdropFilter: 'blur(24px)', boxShadow: '0 0 80px rgba(99,102,241,0.1), 0 40px 80px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
            </div>
            <span className="text-xs font-mono" style={{ color: '#334155' }}>StockVision — RELIANCE.NS · Historical Scanner</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono" style={{ color: '#22c55e' }}>LIVE</span>
            </div>
          </div>
          <div className="grid grid-cols-3 p-5 pb-3">
            {[
              { label: 'Success Rate', val: '73.4%', sub: '↑5% target · 180 backtests', c: '#4ade80' },
              { label: 'Avg Return',   val: '+8.2%', sub: '30 days post-signal',         c: '#818cf8' },
              { label: 'After Tax',    val: '+6.9%', sub: 'LTCG + STT + brokerage',      c: '#38bdf8' },
            ].map((c, i) => (
              <div key={c.label} className="px-4 py-3" style={{ borderRight: i<2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p className="text-xs mb-2" style={{ color: '#334155' }}>{c.label}</p>
                <p className="text-3xl font-black mb-1" style={{ color: c.c }}>{c.val}</p>
                <p className="text-xs" style={{ color: '#1e293b' }}>{c.sub}</p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5">
            <div className="h-14 flex items-end gap-0.5 mb-2">
              {[38,52,31,68,44,78,57,73,48,82,63,88,52,70,65,85,43,74,79,92,58,76,84,95,61,77,88,72].map((h,i) => (
                <div key={i} className="flex-1 rounded-sm" style={{
                  height: `${h}%`,
                  background: h>75 ? 'rgba(74,222,128,0.7)' : h>55 ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.2)',
                }} />
              ))}
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: '#1e293b' }}>Jan 2022</span>
              <span className="text-xs" style={{ color: '#334155' }}>Historical win rate by month</span>
              <span className="text-xs" style={{ color: '#1e293b' }}>Mar 2025</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="relative z-10 py-14" style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { val: '158+', label: 'Features Built',        color: '#818cf8' },
            { val: '5000+',label: 'NSE & BSE Stocks',      color: '#38bdf8' },
            { val: '10+',  label: 'Years Historical Data',  color: '#4ade80' },
            { val: '₹0',   label: 'Cost — Forever',         color: '#fb923c' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-4xl sm:text-5xl font-black mb-2" style={{ color: s.color }}>
                <Counter target={s.val} />
              </div>
              <div className="text-sm" style={{ color: '#334155' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 py-28">
        <div className="text-center mb-20">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-5" style={{ color: '#6366f1' }}>158 Features & Counting</p>
          <h2 className="font-black leading-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#f1f5f9' }}>
            Everything Screener.in<br />
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              wished it had built
            </span>
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: '#334155' }}>Built for Indian market conditions, taxes, and investor psychology.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map(f => (
            <Link key={f.path} to={f.path}
              className="group relative rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(135deg, ${f.g1}18, ${f.g2}0d)` }} />
              <div className="absolute top-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${f.g1}, transparent)` }} />
              <div className="relative z-10">
                {f.badge && (
                  <span className="absolute top-0 right-0 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${f.g1}30`, border: `1px solid ${f.g1}60`, color: f.g1 }}>
                    {f.badge}
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                  style={{ background: `linear-gradient(135deg, ${f.g1}25, ${f.g2}15)`, border: `1px solid ${f.g1}30` }}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-sm mb-2 text-white">{f.title}</h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: '#334155' }}>{f.desc}</p>
                <div className="flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0" style={{ color: f.g1 }}>
                  Open feature
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* MONTH 31 SPOTLIGHT */}
      <section className="relative z-10 py-24 overflow-hidden"
        style={{ background: 'linear-gradient(180deg,rgba(99,102,241,0.06) 0%,rgba(139,92,246,0.08) 100%)', borderTop: '1px solid rgba(99,102,241,0.12)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-14">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-bold tracking-widest uppercase rounded-full mb-3"
                style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa' }}>
                🚀 Just Launched — Month 31
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">3 Viral New Tools</h2>
            </div>
            <Link to="/markets" className="text-sm font-semibold flex items-center gap-2 hover:gap-3 transition-all" style={{ color: '#818cf8' }}>
              See all 158 features →
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon:'🔀', path:'/mf-overlap',     title:'MF Overlap Detector',     insight:'You think you own 3 different mutual funds. You actually own the same 9 stocks — three times.', stat:'68%', statLabel:'avg overlap found',         g1:'#7c3aed', g2:'#a855f7' },
              { icon:'📦', path:'/delivery-volume', title:'Delivery Volume Tracker', insight:'When institutions accumulate quietly, delivery % spikes before the price moves. Be early.',       stat:'78%', statLabel:'delivery = strong signal', g1:'#0284c7', g2:'#06b6d4' },
              { icon:'⚖️', path:'/asset-compare',   title:'Asset Comparator',        insight:'₹10L in Nifty in 2010 = ₹1.12 Cr today. The same money in a Delhi flat? ₹48L after inflation.', stat:'14×', statLabel:'Nifty vs FD real return',  g1:'#d97706', g2:'#ef4444' },
            ].map(c => (
              <Link key={c.path} to={c.path}
                className="group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden relative"
                style={{ background: `linear-gradient(135deg, ${c.g1}18, ${c.g2}0d)`, border: `1px solid ${c.g1}35` }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.g1}80, transparent)` }} />
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5"
                  style={{ background: `linear-gradient(135deg, ${c.g1}30, ${c.g2}20)`, border: `1px solid ${c.g1}40` }}>
                  {c.icon}
                </div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="font-black text-white text-lg leading-tight">{c.title}</h3>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-black" style={{ color: c.g1 }}>{c.stat}</div>
                    <div className="text-xs" style={{ color: '#334155' }}>{c.statLabel}</div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#475569' }}>{c.insight}</p>
                <div className="flex items-center gap-1.5 text-xs font-bold group-hover:gap-2.5 transition-all" style={{ color: c.g1 }}>
                  Try it free
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="relative z-10 py-28 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-5" style={{ color: '#6366f1' }}>Platform Comparison</p>
          <h2 className="font-black leading-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#f1f5f9' }}>
            Why serious investors<br />
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              choose StockVision
            </span>
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: '#334155' }}>
            Head-to-head vs every major Indian platform. 32 features tested. No fluff.
          </p>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {SCORES.map(p => (
            <div key={p.name} className="rounded-2xl p-4 text-center relative overflow-hidden"
              style={{
                background: p.highlight ? 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))' : 'rgba(255,255,255,0.03)',
                border: p.highlight ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: p.highlight ? '0 0 30px rgba(99,102,241,0.18)' : 'none',
              }}>
              {p.highlight && <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#818cf8,transparent)' }} />}
              <p className="text-xs mb-2 font-medium" style={{ color: p.highlight ? '#94a3b8' : '#374151' }}>{p.name}</p>
              <p className="text-3xl font-black mb-2" style={{ color: p.highlight ? '#818cf8' : '#1f2937' }}>
                {p.score}<span className="text-sm font-medium">/32</span>
              </p>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${(p.score/32)*100}%`,
                  background: p.highlight ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '#111827',
                }} />
              </div>
              {p.highlight && <p className="text-xs font-black mt-1.5" style={{ color: '#818cf8' }}>100% ✦</p>}
            </div>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-4 p-1 rounded-2xl w-fit"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {COMPARE_SECTIONS.map((s, i) => (
            <button key={s.cat} onClick={() => setTab(i)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: tab === i ? 'rgba(99,102,241,0.25)' : 'transparent',
                border: tab === i ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                color: tab === i ? '#818cf8' : '#374151',
              }}>
              {s.icon} {s.cat}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(9,12,22,0.85)' }}>
          {/* Header */}
          <div className="grid py-4 px-5" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1f2937' }}>Feature</div>
            {['Screener.in','MoneyCtrl','Tickertape','Zerodha'].map(n => (
              <div key={n} className="text-center text-xs font-bold" style={{ color: '#1f2937' }}>{n}</div>
            ))}
            <div className="text-center text-xs font-bold" style={{ color: '#818cf8' }}>StockVision ✦</div>
          </div>
          {COMPARE_SECTIONS[tab].rows.map(([feat, sc, mc, tt, zd, sv], i) => (
            <div key={i}
              className="grid py-3.5 px-5 transition-colors"
              style={{
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                borderBottom: i < COMPARE_SECTIONS[tab].rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div className="text-sm flex items-center" style={{ color: '#94a3b8' }}>{feat}</div>
              {[sc, mc, tt, zd].map((v, ci) => (
                <div key={ci} className="flex justify-center items-center"><Cell v={v} /></div>
              ))}
              <div className="flex justify-center items-center px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.05)' }}>
                <Cell v={sv} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3 text-center" style={{ color: '#111827' }}>
          Based on publicly accessible free tiers as of 2025. Some platforms may have additional paid features.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Up and running in 60 seconds</h2>
          <p style={{ color: '#334155' }}>No registration required to start exploring</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 relative">
          <div className="hidden sm:block absolute top-10 left-[20%] right-[20%] h-px"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />
          {[
            { n:'01', icon:'🔍', title:'Search Any NSE Stock',   desc:'Type RELIANCE, TCS, INFY — live prices and full analytics load in under 2 seconds.' },
            { n:'02', icon:'🔬', title:'Run Deep Analysis',      desc:'Pick from 158 tools — Historical Scanner, Portfolio Optimizer, Crisis Stress Test and more.' },
            { n:'03', icon:'🎯', title:'Invest With Confidence', desc:'Real probabilities, true after-tax costs, zero psychological blind spots.' },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 font-black text-lg"
                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', boxShadow: '0 0 20px rgba(99,102,241,0.1)' }}>
                {s.n}
              </div>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-28 text-center px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10"
            style={{ background: 'radial-gradient(circle,#6366f1,transparent)' }} />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-6" style={{ color: '#6366f1' }}>Get Started Today</p>
          <h2 className="font-black leading-tight mb-6" style={{ fontSize: 'clamp(2.5rem,6vw,4rem)', color: '#f1f5f9' }}>
            Analyse smarter.<br />
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Invest better.
            </span>
          </h2>
          <p className="text-lg mb-10" style={{ color: '#334155' }}>
            Join thousands of Indian investors who've moved beyond just charts.
          </p>
          <Link to="/markets"
            className="inline-block px-12 py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 50px rgba(99,102,241,0.35)' }}>
            Open Markets Dashboard →
          </Link>
          <p className="mt-5 text-sm" style={{ color: '#1f2937' }}>Free forever · No credit card · No hidden fees</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="font-black text-white">StockVision</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>Month 31</span>
          </div>
          <div className="flex gap-6 text-sm" style={{ color: '#1f2937' }}>
            {[['Markets','/markets'],['Scanner','/scanner'],['Portfolio','/portfolio'],['SIP Calc','/sip'],['Help','/help']].map(([l,p]) => (
              <Link key={p} to={p} className="hover:text-gray-400 transition-colors">{l}</Link>
            ))}
          </div>
          <p className="text-xs" style={{ color: '#111827' }}>Not SEBI registered · Not financial advice · Yahoo Finance data</p>
        </div>
      </footer>

      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
      `}</style>
    </div>
  );
}

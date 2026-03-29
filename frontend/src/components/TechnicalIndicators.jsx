/**
 * TechnicalIndicators.jsx - RSI, MACD, EMA, SMA, Bollinger Bands
 * Month 5 - Charts & News
 * Displays computed technical indicators from backend
 */

import { useState, useEffect } from 'react';
import { getTechnicals } from '../api';

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────

function RSIGauge({ rsi }) {
  if (!rsi) return null;
  const { value, signal } = rsi;

  // Arc-style gauge: 0-100 mapped to 0-180 degrees
  const angle = (value / 100) * 180;
  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 60, cy = 60, r = 45;
  const needleX = cx + r * 0.7 * Math.cos(rad);
  const needleY = cy + r * 0.7 * Math.sin(rad);

  const colorMap = {
    red: 'text-red-600',
    green: 'text-green-600',
    orange: 'text-orange-500',
    yellow: 'text-yellow-600',
    gray: 'text-gray-500',
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Background arc zones */}
        <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        {/* Oversold (green zone 0-30) */}
        <path d="M 15 60 A 45 45 0 0 1 42 24" fill="none" stroke="#86efac" strokeWidth="10" strokeLinecap="round"/>
        {/* Neutral (gray 30-70) */}
        <path d="M 42 24 A 45 45 0 0 1 78 24" fill="none" stroke="#d1d5db" strokeWidth="10"/>
        {/* Overbought (red 70-100) */}
        <path d="M 78 24 A 45 45 0 0 1 105 60" fill="none" stroke="#fca5a5" strokeWidth="10" strokeLinecap="round"/>
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needleX} y2={needleY}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-gray-700 dark:text-gray-300"
        />
        <circle cx={cx} cy={cy} r="4" fill="currentColor" className="text-gray-700 dark:text-gray-300"/>
        {/* Labels */}
        <text x="12" y="75" fontSize="8" fill="currentColor" className="text-gray-500" opacity="0.7">0</text>
        <text x="55" y="18" fontSize="8" fill="currentColor" className="text-gray-500" textAnchor="middle" opacity="0.7">50</text>
        <text x="103" y="75" fontSize="8" fill="currentColor" className="text-gray-500" textAnchor="end" opacity="0.7">100</text>
      </svg>
      <div className="text-center -mt-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        <span
          className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
            signal.color === 'green' ? 'bg-green-100 text-green-700' :
            signal.color === 'red'   ? 'bg-red-100 text-red-700' :
            signal.color === 'orange'? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {signal.label}
        </span>
        <p className="text-xs text-gray-500 mt-0.5">{signal.action}</p>
      </div>
    </div>
  );
}

function MACDCard({ macd }) {
  if (!macd) return (
    <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">Insufficient data</div>
  );
  const { macd: macdVal, signal: macdSignalInfo, histogram } = macd;
  const sigVal = null; // signal line numeric value not returned separately from backend
  const isPositive = histogram >= 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'MACD', value: macdVal, color: macdVal >= 0 ? 'green' : 'red' },
          { label: 'Signal', value: macdSignalInfo?.label || '—', color: 'gray', isLabel: true },
          { label: 'Histogram', value: histogram, color: isPositive ? 'green' : 'red' },
        ].map(item => (
          <div key={item.label} className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</div>
            <div className={`text-sm font-bold ${
              item.color === 'green' ? 'text-green-600' : item.color === 'red' ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'
            }`}>
              {item.isLabel ? item.value : (item.value >= 0 ? '+' : '') + item.value}
            </div>
          </div>
        ))}
      </div>
      {/* Visual histogram bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 h-full rounded-full transition-all ${
            isPositive ? 'bg-green-500 left-1/2' : 'bg-red-500 right-1/2'
          }`}
          style={{ width: `${Math.min(Math.abs(histogram) * 5, 50)}%` }}
        />
        <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gray-400" />
      </div>
      <div className={`text-center text-xs font-medium px-2 py-1 rounded-full ${
        macdSignalInfo.color === 'green' ? 'bg-green-100 text-green-700' :
        macdSignalInfo.color === 'red' ? 'bg-red-100 text-red-700' :
        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
      }`}>
        {macdSignalInfo.label} · {macdSignalInfo.action}
      </div>
    </div>
  );
}

function MARow({ label, value, currentPrice, tooltip }) {
  if (!value || !currentPrice) return null;
  const diff = ((currentPrice - value) / value * 100).toFixed(2);
  const above = currentPrice > value;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-900 dark:text-white font-mono">
          ₹{value.toLocaleString('en-IN')}
        </span>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
          above ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {above ? '↑' : '↓'} {Math.abs(diff)}%
        </span>
      </div>
    </div>
  );
}

function BollingerCard({ bb, currentPrice }) {
  if (!bb) return null;
  const { upper, middle, lower, bandwidth } = bb;
  const range = upper - lower;
  const position = range > 0 ? ((currentPrice - lower) / range) * 100 : 50;
  const clampedPos = Math.max(2, Math.min(98, position));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Upper', value: upper, color: 'red' },
          { label: 'Middle', value: middle, color: 'blue' },
          { label: 'Lower', value: lower, color: 'green' },
        ].map(item => (
          <div key={item.label} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
            <div className={`text-xs font-bold font-mono ${
              item.color === 'red' ? 'text-red-600' :
              item.color === 'blue' ? 'text-blue-600' : 'text-green-600'
            }`}>
              ₹{item.value.toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>

      {/* Price position within bands */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Lower Band</span>
          <span>Price Position</span>
          <span>Upper Band</span>
        </div>
        <div className="relative h-4 bg-gradient-to-r from-green-200 via-gray-200 to-red-200 rounded-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow border-2 border-white"
            style={{ left: `calc(${clampedPos}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
          <span>Oversold</span>
          <span className={`font-medium ${
            clampedPos > 80 ? 'text-red-500' : clampedPos < 20 ? 'text-green-500' : 'text-gray-600'
          }`}>
            {clampedPos > 80 ? 'Near Upper' : clampedPos < 20 ? 'Near Lower' : 'Mid Range'}
          </span>
          <span>Overbought</span>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        Band Width: <span className="font-semibold text-gray-700 dark:text-gray-300">{bandwidth}%</span>
      </div>
    </div>
  );
}

function SupportResistance({ levels, currentPrice }) {
  if (!levels) return null;
  const { support, resistance } = levels;
  const range = resistance - support;
  const distToResist = ((resistance - currentPrice) / currentPrice * 100).toFixed(1);
  const distToSupport = ((currentPrice - support) / currentPrice * 100).toFixed(1);
  const position = range > 0 ? ((currentPrice - support) / range) * 100 : 50;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">🛡️ Support</div>
          <div className="text-sm font-bold text-green-700 dark:text-green-300 font-mono mt-1">
            ₹{support.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-green-600 mt-0.5">{distToSupport}% below</div>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
          <div className="text-xs text-red-600 dark:text-red-400 font-medium">🎯 Resistance</div>
          <div className="text-sm font-bold text-red-700 dark:text-red-300 font-mono mt-1">
            ₹{resistance.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-red-600 mt-0.5">{distToResist}% above</div>
        </div>
      </div>

      {/* Visual range bar */}
      <div className="relative h-3 bg-gradient-to-r from-green-200 to-red-200 rounded-full">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"
          style={{ left: `calc(${Math.max(2, Math.min(98, position))}% - 6px)` }}
        />
      </div>
      <p className="text-xs text-center text-gray-500">Based on 30-day high/low levels</p>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────

export default function TechnicalIndicators({ symbol, currentPrice }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6mo');
  const [activeTab, setActiveTab] = useState('rsi');

  const PERIODS = ['1mo', '3mo', '6mo', '1y'];
  const TABS = [
    { id: 'rsi',         label: 'RSI',         icon: '🎯' },
    { id: 'macd',        label: 'MACD',        icon: '📊' },
    { id: 'ma',          label: 'EMA/SMA',     icon: '📈' },
    { id: 'bollinger',   label: 'Bollinger',   icon: '🔔' },
    { id: 'levels',      label: 'S/R Levels',  icon: '🏹' },
  ];

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    getTechnicals(symbol, period)
      .then(res => setData(res.data))
      .catch(err => console.error('Technicals error:', err))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  const price = currentPrice || data?.candles?.[data.candles.length - 1]?.close;

  const overallColors = {
    Bullish: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Bearish: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <span className="text-lg">📐</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Technical Indicators</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">RSI · MACD · EMA · Bollinger Bands</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data?.overallSignal && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${overallColors[data.overallSignal]}`}>
              {data.overallSignal === 'Bullish' ? '🐂' : data.overallSignal === 'Bearish' ? '🐻' : '⚖️'}{' '}
              {data.overallSignal}
            </span>
          )}
          {/* Period selector */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  period === p
                    ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm">Could not load technical data</p>
          </div>
        ) : (
          <>
            {activeTab === 'rsi' && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
                  RSI(14) — Relative Strength Index · Range: 0–100
                </p>
                <RSIGauge rsi={data.indicators.rsi} />
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { zone: '0–30', label: 'Oversold', color: 'green' },
                    { zone: '30–70', label: 'Neutral', color: 'gray' },
                    { zone: '70–100', label: 'Overbought', color: 'red' },
                  ].map(z => (
                    <div key={z.zone} className={`p-2 rounded-lg text-xs ${
                      z.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                      z.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                      'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      <div className="font-semibold">{z.zone}</div>
                      <div className="mt-0.5 opacity-80">{z.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'macd' && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
                  MACD(12,26,9) — Moving Average Convergence Divergence
                </p>
                <MACDCard macd={data.indicators.macd} />
              </div>
            )}

            {activeTab === 'ma' && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Price vs Moving Averages · Current: <strong className="text-gray-900 dark:text-white">
                    ₹{price?.toLocaleString('en-IN')}
                  </strong>
                </p>
                <div className="space-y-0">
                  {[
                    { label: 'EMA 20', value: data.indicators.ema.ema20 },
                    { label: 'EMA 50', value: data.indicators.ema.ema50 },
                    { label: 'EMA 200', value: data.indicators.ema.ema200 },
                    { label: 'SMA 20', value: data.indicators.sma.sma20 },
                    { label: 'SMA 50', value: data.indicators.sma.sma50 },
                    { label: 'SMA 200', value: data.indicators.sma.sma200 },
                  ].map(ma => (
                    <MARow
                      key={ma.label}
                      label={ma.label}
                      value={ma.value}
                      currentPrice={price}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
                  Green = price above MA (bullish) · Red = price below MA (bearish)
                </p>
              </div>
            )}

            {activeTab === 'bollinger' && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
                  Bollinger Bands(20,2) · Current: <strong className="text-gray-900 dark:text-white">
                    ₹{price?.toLocaleString('en-IN')}
                  </strong>
                </p>
                <BollingerCard bb={data.indicators.bollingerBands} currentPrice={price} />
              </div>
            )}

            {activeTab === 'levels' && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
                  Key Support & Resistance Levels · 30-day range
                </p>
                <SupportResistance levels={data.levels} currentPrice={price} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Signal Summary Bar */}
      {data && !loading && (
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
            <span className="text-gray-500 dark:text-gray-400">
              📊 {data.bullishSignals} Bullish · {data.bearishSignals} Bearish signals
            </span>
            <span className="text-gray-400 dark:text-gray-500">Based on {period} data · {data.candles?.length} candles</span>
          </div>
        </div>
      )}
    </div>
  );
}

// components/ScreenerFilters.jsx — Filter Panel for Screener
// Phase 6 Month 30

import { useState } from 'react';

const SECTORS = [
  'All', 'Banking', 'IT', 'FMCG', 'Auto', 'Pharma',
  'Energy', 'Metals', 'Infrastructure', 'NBFC', 'Telecom',
  'Consumer', 'Utilities', 'Cement', 'Healthcare', 'Chemicals',
  'Hospitality',
];

const MCAPS = [
  { value: 'all',   label: 'All Sizes' },
  { value: 'large', label: 'Large Cap' },
  { value: 'mid',   label: 'Mid Cap' },
  { value: 'small', label: 'Small Cap' },
];

const DEFAULT_FILTERS = {
  peMin: '', peMax: '', pbMax: '', roeMin: '',
  priceMin: '', priceMax: '', dividendYieldMin: '',
  debtToEquityMax: '', volumeSpike: '', near52wHigh: '',
  sector: 'all', mcap: 'all', changeMin: '', changeMax: '',
  scoreMin: '',
};

function FilterRow({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function RangeInputs({ fromValue, toValue, onChangeFrom, onChangeTo, placeholder = '' }) {
  return (
    <div className="flex gap-2">
      <input
        type="number" value={fromValue} onChange={e => onChangeFrom(e.target.value)}
        placeholder="Min"
        className="w-1/2 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="number" value={toValue} onChange={e => onChangeTo(e.target.value)}
        placeholder="Max"
        className="w-1/2 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function NumInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

export default function ScreenerFilters({ filters, onChange, onReset, onRun, loading }) {
  const [expanded, setExpanded] = useState({ basic: true, quality: false, advanced: false });

  const toggle = (section) => setExpanded(p => ({ ...p, [section]: !p[section] }));

  const set = (key, val) => onChange({ ...filters, [key]: val });

  const Section = ({ id, title, children }) => (
    <div className="mb-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-left
                   bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
      >
        <span>{title}</span>
        <span className="text-gray-400">{expanded[id] ? '▲' : '▼'}</span>
      </button>
      {expanded[id] && <div className="px-4 py-3 bg-white dark:bg-gray-900">{children}</div>}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 h-fit sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">🔍 Filters</h2>
        <button
          onClick={onReset}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Reset All
        </button>
      </div>

      {/* Sector */}
      <FilterRow label="SECTOR">
        <select
          value={filters.sector}
          onChange={e => set('sector', e.target.value)}
          className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SECTORS.map(s => <option key={s} value={s === 'All' ? 'all' : s}>{s}</option>)}
        </select>
      </FilterRow>

      {/* Market Cap */}
      <FilterRow label="MARKET CAP">
        <div className="flex flex-wrap gap-1.5">
          {MCAPS.map(m => (
            <button
              key={m.value}
              onClick={() => set('mcap', m.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filters.mcap === m.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </FilterRow>

      {/* Basic Fundamentals */}
      <Section id="basic" title="📊 Valuation">
        <FilterRow label="P/E RATIO">
          <RangeInputs
            fromValue={filters.peMin} toValue={filters.peMax}
            onChangeFrom={v => set('peMin', v)} onChangeTo={v => set('peMax', v)}
          />
        </FilterRow>
        <FilterRow label="PRICE TO BOOK (Max)">
          <NumInput value={filters.pbMax} onChange={v => set('pbMax', v)} placeholder="e.g. 1.5" />
        </FilterRow>
        <FilterRow label="PRICE RANGE (₹)">
          <RangeInputs
            fromValue={filters.priceMin} toValue={filters.priceMax}
            onChangeFrom={v => set('priceMin', v)} onChangeTo={v => set('priceMax', v)}
          />
        </FilterRow>
      </Section>

      {/* Quality */}
      <Section id="quality" title="⭐ Quality & Income">
        <FilterRow label="ROE % (Min)">
          <NumInput value={filters.roeMin} onChange={v => set('roeMin', v)} placeholder="e.g. 20" />
        </FilterRow>
        <FilterRow label="DIVIDEND YIELD % (Min)">
          <NumInput value={filters.dividendYieldMin} onChange={v => set('dividendYieldMin', v)} placeholder="e.g. 2.5" />
        </FilterRow>
        <FilterRow label="DEBT/EQUITY (Max)">
          <NumInput value={filters.debtToEquityMax} onChange={v => set('debtToEquityMax', v)} placeholder="e.g. 50" />
        </FilterRow>
        <FilterRow label="STOCKVISION SCORE (Min)">
          <NumInput value={filters.scoreMin} onChange={v => set('scoreMin', v)} placeholder="e.g. 60" />
        </FilterRow>
      </Section>

      {/* Advanced */}
      <Section id="advanced" title="🔬 Technical">
        <FilterRow label="VOLUME SPIKE (×Avg, Min)">
          <NumInput value={filters.volumeSpike} onChange={v => set('volumeSpike', v)} placeholder="e.g. 2.0" />
        </FilterRow>
        <FilterRow label="NEAR 52W HIGH (Within %)">
          <NumInput value={filters.near52wHigh} onChange={v => set('near52wHigh', v)} placeholder="e.g. 5" />
        </FilterRow>
        <FilterRow label="TODAY'S CHANGE %">
          <RangeInputs
            fromValue={filters.changeMin} toValue={filters.changeMax}
            onChangeFrom={v => set('changeMin', v)} onChangeTo={v => set('changeMax', v)}
          />
        </FilterRow>
      </Section>

      <button
        onClick={onRun}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                   text-white font-bold text-sm transition-all mt-2"
      >
        {loading ? '⏳ Screening...' : '▶ Run Screener'}
      </button>
    </div>
  );
}

export { DEFAULT_FILTERS };

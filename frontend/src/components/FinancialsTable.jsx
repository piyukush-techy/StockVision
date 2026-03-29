import { useState } from 'react';

function fmtCr(val) {
  if (val === null || val === undefined || val === 0) return '—';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e11) return `${sign}₹${(abs / 1e7).toFixed(0)} Cr`;
  if (abs >= 1e7)  return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5)  return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3)  return `${sign}₹${(abs / 1e3).toFixed(1)} K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

function fmtPct(val) {
  if (val === null || val === undefined) return '—';
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
}

function growth(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function PLTable({ data }) {
  if (!data || data.length === 0) return <EmptyState />;
  const rows = [
    { key: 'totalRevenue',    label: 'Total Revenue',    highlight: false },
    { key: 'grossProfit',     label: 'Gross Profit',     highlight: false },
    { key: 'operatingIncome', label: 'Operating Income', highlight: false },
    { key: 'ebit',            label: 'EBIT',             highlight: false },
    { key: 'netIncome',       label: 'Net Income',       highlight: true  },
    { key: 'eps',             label: 'EPS (₹)',          highlight: false, isEps: true },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-600">
            <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 w-44">Metric</th>
            {data.map(d => (
              <th key={d.date} className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">
                {d.date?.substring(0, 7)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className={`border-b border-gray-100 dark:border-gray-700 ${row.highlight ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
              <td className={`py-3 px-4 ${row.highlight ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {row.label}
              </td>
              {data.map((d, i) => {
                const val = d[row.key];
                const prev = data[i + 1]?.[row.key];
                const g = growth(val, prev);
                return (
                  <td key={d.date} className="text-right py-3 px-4">
                    <div className={`${row.highlight ? 'font-bold' : ''} ${
                      row.highlight && val > 0 ? 'text-green-700 dark:text-green-400'
                      : row.highlight && val < 0 ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {row.isEps ? (val ? `₹${val.toFixed(2)}` : '—') : fmtCr(val)}
                    </div>
                    {g !== null && (
                      <div className={`text-xs ${g >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtPct(g)}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BSTable({ data }) {
  if (!data || data.length === 0) return <EmptyState />;
  const rows = [
    { key: 'totalAssets',       label: 'Total Assets',         section: 'assets' },
    { key: 'currentAssets',     label: '  Current Assets',     section: 'assets' },
    { key: 'cash',              label: '  Cash & Equivalents', section: 'assets' },
    { key: 'netReceivables',    label: '  Net Receivables',    section: 'assets' },
    { key: 'totalLiabilities',  label: 'Total Liabilities',    section: 'liabilities' },
    { key: 'currentLiabilities',label: '  Current Liabilities',section: 'liabilities' },
    { key: 'longTermDebt',      label: '  Long Term Debt',     section: 'liabilities' },
    { key: 'totalEquity',       label: 'Total Equity',         section: 'equity', highlight: true },
    { key: 'retainedEarnings',  label: '  Retained Earnings',  section: 'equity' },
  ];
  let lastSection = '';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-600">
            <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 w-48">Item</th>
            {data.map(d => (
              <th key={d.date} className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">
                {d.date?.substring(0, 7)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const showSection = row.section !== lastSection;
            lastSection = row.section;
            return (
              <>
                {showSection && (
                  <tr key={`sec-${row.section}`} className="bg-gray-50 dark:bg-gray-700/50">
                    <td colSpan={data.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {row.section === 'assets' ? '📦 Assets' : row.section === 'liabilities' ? '💳 Liabilities' : '💰 Equity'}
                    </td>
                  </tr>
                )}
                <tr key={row.key} className={`border-b border-gray-100 dark:border-gray-700 ${row.highlight ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                  <td className={`py-2.5 px-4 ${row.highlight ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {row.label}
                  </td>
                  {data.map(d => (
                    <td key={d.date} className={`text-right py-2.5 px-4 ${row.highlight ? 'font-bold text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {fmtCr(d[row.key])}
                    </td>
                  ))}
                </tr>
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CFTable({ data }) {
  if (!data || data.length === 0) return <EmptyState />;
  const rows = [
    { key: 'operatingCashflow', label: '💼 Operating Cash Flow', highlight: true  },
    { key: 'investingCashflow', label: '📈 Investing Cash Flow', highlight: false },
    { key: 'financingCashflow', label: '🏦 Financing Cash Flow', highlight: false },
    { key: 'freeCashflow',      label: '💰 Free Cash Flow',      highlight: true  },
    { key: 'capex',             label: '🔧 CapEx',               highlight: false },
    { key: 'depreciation',      label: '📉 Depreciation',        highlight: false },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-600">
            <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400 w-52">Cash Flow</th>
            {data.map(d => (
              <th key={d.date} className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">
                {d.date?.substring(0, 7)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className={`border-b border-gray-100 dark:border-gray-700 ${row.highlight ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
              <td className={`py-3 px-4 ${row.highlight ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {row.label}
              </td>
              {data.map(d => {
                const val = d[row.key];
                return (
                  <td key={d.date} className={`text-right py-3 px-4 font-${row.highlight ? 'semibold' : 'normal'} ${
                    val > 0 ? 'text-green-700 dark:text-green-400' : val < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {fmtCr(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
      No data available for this period
    </div>
  );
}

export default function FinancialsTable({ financials, loading }) {
  const [activeTab, setActiveTab] = useState('pl');
  const [period, setPeriod] = useState('annual');

  const tabs = [
    { id: 'pl', label: '📊 P&L' },
    { id: 'bs', label: '🏦 Balance Sheet' },
    { id: 'cf', label: '💸 Cash Flow' },
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse" />
        <div className="h-64 bg-gray-50 dark:bg-gray-700/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!financials) return null;

  const data = financials[
    activeTab === 'pl' ? 'income' : activeTab === 'bs' ? 'balanceSheet' : 'cashFlow'
  ]?.[period] || [];
  const sliced = data.slice(0, 4);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 flex-wrap gap-3">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setPeriod('annual')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              period === 'annual'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Annual
          </button>
          <button
            onClick={() => setPeriod('quarterly')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              period === 'quarterly'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Quarterly
          </button>
        </div>
      </div>

      <div className="p-1">
        {activeTab === 'pl' && <PLTable data={sliced} />}
        {activeTab === 'bs' && <BSTable data={sliced} />}
        {activeTab === 'cf' && <CFTable data={sliced} />}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center p-3 border-t border-gray-100 dark:border-gray-700">
        Values in Indian Rupees · Source: Yahoo Finance · Updated daily
      </p>
    </div>
  );
}

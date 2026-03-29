// ExecutionRealityPage.jsx — Month 12: Execution Reality
// 6 tabs: Capital Gains Tax | Dividend Tax | Turnover Costs | Compounding Reality | Real vs Paper | Full Analysis
import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Shared helpers ───────────────────────────────────────────────────────────
const fmt  = (n, dec = 0) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: dec });
const fmtC = (n) => (n == null || isNaN(n)) ? '—' : '₹' + fmt(n, 0);
const fmtP = (s) => s == null ? '—' : String(s);
const num  = (v) => parseFloat(String(v).replace('%','')) || 0;

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
function Err({ msg }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
      ⚠️ {msg}
    </div>
  );
}
function Info({ children }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
      💡 {children}
    </div>
  );
}
function Row({ label, value, color }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-bold ${color || 'text-gray-900 dark:text-white'}`}>{value}</span>
    </div>
  );
}
function Card({ title, accent = 'gray', children }) {
  const borders = {
    gray:   'border-gray-200 dark:border-gray-700',
    blue:   'border-blue-200 dark:border-blue-800',
    green:  'border-green-200 dark:border-green-800',
    red:    'border-red-200 dark:border-red-800',
    orange: 'border-orange-200 dark:border-orange-800',
    purple: 'border-purple-200 dark:border-purple-800',
    yellow: 'border-yellow-200 dark:border-yellow-800',
  };
  return (
    <div className={`rounded-xl border p-5 bg-white dark:bg-gray-800 ${borders[accent]}`}>
      {title && <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">{title}</p>}
      {children}
    </div>
  );
}
const inp = "w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";
const FormGrid = ({ children }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
    {children}
  </div>
);

// ─── Tab 1: Capital Gains Tax ────────────────────────────────────────────────
function TaxCalc() {
  const [f, setF] = useState({ buyPrice:'', sellPrice:'', quantity:'', buyDate:'2023-04-01', sellDate:'2024-04-02', assetType:'equity', listed:'true', taxSlab:'30' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function run() {
    setLoading(true); setErr(null);
    try {
      const r = await axios.post(`${API}/api/execution-reality/capital-gains-tax`, {
        buyPrice: +f.buyPrice, sellPrice: +f.sellPrice, quantity: +f.quantity,
        buyDate: f.buyDate, sellDate: f.sellDate,
        assetType: f.assetType, listed: f.listed === 'true', taxSlab: +f.taxSlab
      });
      setData(r.data.data);
    } catch(e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }

  const set = k => e => setF(p => ({...p, [k]: e.target.value}));

  return (
    <div className="space-y-5">
      <Info>Calculates STCG/LTCG tax as per Indian tax laws FY 2025-26. Listed equity STCG = 15%, LTCG = 12.5% on gains above ₹1.25L.</Info>
      <FormGrid>
        <div><label className={lbl}>Buy Price (₹)</label><input type="number" className={inp} placeholder="100" value={f.buyPrice} onChange={set('buyPrice')} /></div>
        <div><label className={lbl}>Sell Price (₹)</label><input type="number" className={inp} placeholder="150" value={f.sellPrice} onChange={set('sellPrice')} /></div>
        <div><label className={lbl}>Quantity</label><input type="number" className={inp} placeholder="100" value={f.quantity} onChange={set('quantity')} /></div>
        <div><label className={lbl}>Tax Slab (%)</label>
          <select className={inp} value={f.taxSlab} onChange={set('taxSlab')}>
            {['0','5','20','30'].map(s => <option key={s} value={s}>{s}%</option>)}
          </select>
        </div>
        <div><label className={lbl}>Buy Date</label><input type="date" className={inp} value={f.buyDate} onChange={set('buyDate')} /></div>
        <div><label className={lbl}>Sell Date</label><input type="date" className={inp} value={f.sellDate} onChange={set('sellDate')} /></div>
        <div><label className={lbl}>Asset Type</label>
          <select className={inp} value={f.assetType} onChange={set('assetType')}>
            <option value="equity">Equity</option>
            <option value="debt">Debt</option>
          </select>
        </div>
        <div><label className={lbl}>Listed?</label>
          <select className={inp} value={f.listed} onChange={set('listed')}>
            <option value="true">Yes (NSE/BSE)</option>
            <option value="false">No (Unlisted)</option>
          </select>
        </div>
      </FormGrid>
      <button onClick={run} disabled={!f.buyPrice||!f.sellPrice||!f.quantity||loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-xl transition-all">
        {loading ? 'Calculating...' : '🧮 Calculate Tax'}
      </button>
      {loading && <Spinner />}
      {err && <Err msg={err} />}
      {data && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card title="Investment" accent="blue">
            <Row label="Total Invested"  value={fmtC(data.investment?.totalInvested)} />
            <Row label="Total Proceeds"  value={fmtC(data.investment?.totalProceeds)} />
            <Row label="Holding Period"  value={`${data.investment?.holdingPeriodDays} days`} />
            <Row label="Holding (Years)" value={`${data.investment?.holdingPeriodYears} yrs`} />
          </Card>
          <Card title="Capital Gains" accent="orange">
            <Row label="Gain Type"    value={<span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-black">{data.capitalGains?.gainType}</span>} />
            <Row label="Total Gain"   value={fmtC(data.capitalGains?.totalGain)} color={data.capitalGains?.totalGain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
            <Row label="Exemption"    value={fmtC(data.capitalGains?.exemptionUsed)} />
            <Row label="Taxable Gain" value={fmtC(data.capitalGains?.taxableGain)} />
            <Row label="Tax Rate"     value={fmtP(data.capitalGains?.taxRate)} />
          </Card>
          <Card title="Tax & Returns" accent="red">
            <Row label="Base Tax"       value={fmtC(data.tax?.baseTax)}    color="text-red-600 dark:text-red-400" />
            <Row label="Cess (4%)"      value={fmtC(data.tax?.cess)} />
            <Row label="Total Tax"      value={fmtC(data.tax?.totalTax)}   color="text-red-700 dark:text-red-300 font-black" />
            <Row label="Pre-Tax Return" value={fmtP(data.returns?.preTaxReturn)} />
            <Row label="After-Tax Ret." value={fmtP(data.returns?.afterTaxReturn)} color="text-green-600 dark:text-green-400" />
            <Row label="Tax Impact"     value={'-' + fmtP(data.returns?.taxImpact)} color="text-orange-600 dark:text-orange-400" />
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Dividend Tax ─────────────────────────────────────────────────────
function DividendTax() {
  const [f, setF] = useState({ dividendAmount:'', quantity:'', taxSlab:'30', tdsDeducted:'0' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function run() {
    setLoading(true); setErr(null);
    try {
      const r = await axios.post(`${API}/api/execution-reality/dividend-tax`, {
        dividendAmount: +f.dividendAmount, quantity: +f.quantity,
        taxSlab: +f.taxSlab, tdsDeducted: +f.tdsDeducted
      });
      setData(r.data.data);
    } catch(e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }

  const set = k => e => setF(p => ({...p, [k]: e.target.value}));

  return (
    <div className="space-y-5">
      <Info>Post-2020, dividends are taxable at your income tax slab rate. Companies deduct 10% TDS if annual dividend exceeds ₹5,000.</Info>
      <FormGrid>
        <div><label className={lbl}>Dividend per Share (₹)</label><input type="number" className={inp} placeholder="10" value={f.dividendAmount} onChange={set('dividendAmount')} /></div>
        <div><label className={lbl}>Number of Shares</label><input type="number" className={inp} placeholder="500" value={f.quantity} onChange={set('quantity')} /></div>
        <div><label className={lbl}>Tax Slab (%)</label>
          <select className={inp} value={f.taxSlab} onChange={set('taxSlab')}>
            {['0','5','20','30'].map(s => <option key={s} value={s}>{s}%</option>)}
          </select>
        </div>
        <div><label className={lbl}>TDS Already Deducted (₹)</label><input type="number" className={inp} placeholder="0" value={f.tdsDeducted} onChange={set('tdsDeducted')} /></div>
      </FormGrid>
      <button onClick={run} disabled={!f.dividendAmount||!f.quantity||loading}
        className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-xl transition-all">
        {loading ? 'Calculating...' : '💰 Calculate Dividend Tax'}
      </button>
      {loading && <Spinner />}
      {err && <Err msg={err} />}
      {data && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Dividend Details" accent="green">
            <Row label="Gross Dividend"  value={fmtC(data.dividend?.grossDividend)} />
            <Row label="Per Share"       value={fmtC(data.dividend?.perShare)} />
            <Row label="Shares"          value={fmt(data.dividend?.quantity)} />
            <Row label="Tax Rate (Slab)" value={fmtP(data.tax?.taxSlab)} />
            <Row label="Tax Liability"   value={fmtC(data.tax?.totalTax)} color="text-red-600 dark:text-red-400" />
            <Row label="TDS Deducted"    value={fmtC(data.tax?.tdsDeducted)} />
            <Row label="Additional Due"  value={fmtC(data.tax?.remainingLiability)} color={data.tax?.remainingLiability > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'} />
          </Card>
          <Card title="Net Income" accent="blue">
            <Row label="Gross Dividend"   value={fmtC(data.dividend?.grossDividend)} />
            <Row label="Total Tax"        value={fmtC(data.tax?.totalTax)} color="text-red-600 dark:text-red-400" />
            <Row label="Net Dividend"     value={fmtC(data.netIncome?.afterTaxDividend)} color="text-green-600 dark:text-green-400 text-base font-black" />
            <Row label="Effective Rate"   value={fmtP(data.netIncome?.effectiveTaxRate)} />
            <Row label="Refund Due"       value={fmtC(data.tax?.refundDue)} color="text-blue-600 dark:text-blue-400" />
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Turnover Costs ───────────────────────────────────────────────────
function TurnoverCosts() {
  const [f, setF] = useState({ portfolioValue:'', annualTurnover:'1.0', brokerageRate:'0.03', avgHoldingPeriod:'12' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function run() {
    setLoading(true); setErr(null);
    try {
      const r = await axios.post(`${API}/api/execution-reality/turnover-costs`, {
        portfolioValue: +f.portfolioValue, annualTurnover: +f.annualTurnover,
        brokerageRate: +f.brokerageRate, avgHoldingPeriod: +f.avgHoldingPeriod
      });
      setData(r.data.data);
    } catch(e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }

  const set = k => e => setF(p => ({...p, [k]: e.target.value}));

  return (
    <div className="space-y-5">
      <Info>Turnover 1.0 = traded full portfolio once. High turnover kills returns through brokerage + STT + GST + taxes.</Info>
      <FormGrid>
        <div><label className={lbl}>Portfolio Value (₹)</label><input type="number" className={inp} placeholder="1000000" value={f.portfolioValue} onChange={set('portfolioValue')} /></div>
        <div><label className={lbl}>Annual Turnover (×)</label><input type="number" step="0.1" className={inp} placeholder="1.0" value={f.annualTurnover} onChange={set('annualTurnover')} /></div>
        <div><label className={lbl}>Brokerage Rate (%)</label><input type="number" step="0.01" className={inp} placeholder="0.03" value={f.brokerageRate} onChange={set('brokerageRate')} /></div>
        <div><label className={lbl}>Avg Holding (months)</label><input type="number" className={inp} placeholder="12" value={f.avgHoldingPeriod} onChange={set('avgHoldingPeriod')} /></div>
      </FormGrid>
      <button onClick={run} disabled={!f.portfolioValue||loading}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-xl transition-all">
        {loading ? 'Calculating...' : '🔄 Calculate Turnover Costs'}
      </button>
      {loading && <Spinner />}
      {err && <Err msg={err} />}
      {data && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card title="Transaction Costs" accent="purple">
            <Row label="Traded Value"    value={fmtC(data.portfolio?.tradedValue)} />
            <Row label="Brokerage"       value={fmtC(data.costs?.breakdown?.brokerage)} />
            <Row label="STT"             value={fmtC(data.costs?.breakdown?.stt)} />
            <Row label="Exchange Fees"   value={fmtC(data.costs?.breakdown?.exchangeFees)} />
            <Row label="SEBI Charges"    value={fmtC(data.costs?.breakdown?.sebiCharges)} />
            <Row label="Stamp Duty"      value={fmtC(data.costs?.breakdown?.stampDuty)} />
            <Row label="GST"             value={fmtC(data.costs?.breakdown?.gst)} />
          </Card>
          <Card title="Total Cost Impact" accent="red">
            <Row label="Transaction Cost"  value={fmtC(data.costs?.totalTransactionCosts)} color="text-red-600 dark:text-red-400 font-black" />
            <Row label="Estimated Tax"     value={fmtC(data.costs?.estimatedCapitalGainsTax)} />
            <Row label="Total Friction"    value={fmtC(data.costs?.totalFriction)} color="text-red-700 dark:text-red-300 font-black" />
          </Card>
          <Card title="Break-Even Impact" accent="yellow">
            <Row label="Cost % of Portfolio"     value={fmtP(data.impact?.costAsPercentOfPortfolio)} color="text-orange-600 dark:text-orange-400" />
            <Row label="Annual Drag"             value={fmtP(data.impact?.annualDrag)} color="text-orange-600 dark:text-orange-400 font-black" />
            <Row label="Break-Even Required"     value={fmtP(data.impact?.breakeven)} color="text-yellow-700 dark:text-yellow-400 font-black" />
            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-800 dark:text-yellow-300">
              {fmtP(data.impact?.interpretation)}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Compounding Reality ──────────────────────────────────────────────
function CompoundingReality() {
  const [f, setF] = useState({ initialInvestment:'', years:'20', annualReturnPreTax:'15', withdrawalRate:'0', taxScenario:'ltcg', inflationRate:'6' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function run() {
    setLoading(true); setErr(null);
    try {
      const r = await axios.post(`${API}/api/execution-reality/compounding-reality`, {
        initialInvestment: +f.initialInvestment, years: +f.years,
        annualReturnPreTax: +f.annualReturnPreTax, withdrawalRate: +f.withdrawalRate,
        taxScenario: f.taxScenario, inflationRate: +f.inflationRate
      });
      setData(r.data.data);
    } catch(e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }

  const set = k => e => setF(p => ({...p, [k]: e.target.value}));

  return (
    <div className="space-y-5">
      <FormGrid>
        <div><label className={lbl}>Initial Investment (₹)</label><input type="number" className={inp} placeholder="500000" value={f.initialInvestment} onChange={set('initialInvestment')} /></div>
        <div><label className={lbl}>Years</label><input type="number" className={inp} placeholder="20" value={f.years} onChange={set('years')} /></div>
        <div><label className={lbl}>Pre-Tax Return (%/yr)</label><input type="number" className={inp} placeholder="15" value={f.annualReturnPreTax} onChange={set('annualReturnPreTax')} /></div>
        <div><label className={lbl}>Withdrawal Rate (%/yr)</label><input type="number" className={inp} placeholder="0" value={f.withdrawalRate} onChange={set('withdrawalRate')} /></div>
        <div><label className={lbl}>Tax Scenario</label>
          <select className={inp} value={f.taxScenario} onChange={set('taxScenario')}>
            <option value="ltcg">LTCG (12.5% on gains &gt;₹1.25L)</option>
            <option value="stcg">STCG (15% flat)</option>
            <option value="mixed">Mixed (avg 13.5%)</option>
          </select>
        </div>
        <div><label className={lbl}>Inflation Rate (%)</label><input type="number" className={inp} placeholder="6" value={f.inflationRate} onChange={set('inflationRate')} /></div>
      </FormGrid>
      <button onClick={run} disabled={!f.initialInvestment||loading}
        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-xl transition-all">
        {loading ? 'Projecting...' : '📈 Run Compounding Reality Check'}
      </button>
      {loading && <Spinner />}
      {err && <Err msg={err} />}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Final Value',         val: fmtC(data.results?.finalValue),        color: 'text-green-600 dark:text-green-400' },
              { label: 'Without Tax',         val: fmtC(data.comparison?.withoutTax),     color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Total Tax Paid',      val: fmtC(data.results?.totalTaxPaid),      color: 'text-red-600 dark:text-red-400' },
              { label: 'Tax Lost to Inflation',val: fmtC(data.comparison?.taxImpact),     color: 'text-orange-600 dark:text-orange-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className={`text-lg font-black ${color}`}>{val}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Return Analysis" accent="blue">
              <Row label="Pre-Tax CAGR"  value={fmtP(data.returns?.preTaxCAGR)} />
              <Row label="After-Tax CAGR" value={fmtP(data.returns?.afterTaxCAGR)} color="text-green-600 dark:text-green-400 font-black" />
              <Row label="Tax Drag"       value={fmtP(data.returns?.taxDrag)} color="text-red-600 dark:text-red-400" />
              <Row label="Real CAGR (Inflation-adj)" value={fmtP(data.returns?.realCAGR)} color="text-orange-600 dark:text-orange-400" />
            </Card>
            <Card title="Insights" accent="green">
              <Row label="Compounding Power"  value={fmtP(data.insights?.compoundingPower)} />
              <Row label="Tax Efficiency"     value={fmtP(data.insights?.taxEfficiency)} />
              <Row label="Inflation Erosion"  value={fmtP(data.insights?.inflationErosion)} />
              <Row label="Tax Impact %"       value={fmtP(data.comparison?.taxImpactPercent)} color="text-red-600 dark:text-red-400" />
            </Card>
          </div>
          {data.yearlyBreakdown && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Year-by-Year Breakdown</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      {['Year','Start Value','Pre-Tax Gain','Tax Paid','End Value','Real Value'].map(h => (
                        <th key={h} className="px-3 py-2 text-right first:text-left font-bold text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.yearlyBreakdown.map((row, i) => (
                      <tr key={row.year} className="border-t border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                        <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">Yr {row.year}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{fmtC(row.startValue)}</td>
                        <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">{fmtC(row.preTaxGain)}</td>
                        <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{fmtC(row.taxPaid)}</td>
                        <td className="px-3 py-2 text-right text-green-600 dark:text-green-400 font-semibold">{fmtC(row.endValue)}</td>
                        <td className="px-3 py-2 text-right text-purple-600 dark:text-purple-400">{fmtC(row.realValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab 5: Real vs Paper ────────────────────────────────────────────────────
function RealVsPaper() {
  const [f, setF] = useState({ paperReturn:'', investmentAmount:'', holdingPeriod:'12', assetType:'equity', turnoverRate:'1.0', brokerageRate:'0.03' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function run() {
    setLoading(true); setErr(null);
    try {
      const r = await axios.post(`${API}/api/execution-reality/real-vs-paper`, {
        paperReturn: +f.paperReturn, investmentAmount: +f.investmentAmount,
        holdingPeriod: +f.holdingPeriod, assetType: f.assetType,
        turnoverRate: +f.turnoverRate, brokerageRate: +f.brokerageRate
      });
      setData(r.data.data);
    } catch(e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }

  const set = k => e => setF(p => ({...p, [k]: e.target.value}));

  return (
    <div className="space-y-5">
      <Info>Paper returns are what backtests show. Real returns are what you actually pocket after brokerage, STT, taxes and slippage.</Info>
      <FormGrid>
        <div><label className={lbl}>Paper Return (%)</label><input type="number" step="0.1" className={inp} placeholder="20" value={f.paperReturn} onChange={set('paperReturn')} /></div>
        <div><label className={lbl}>Investment (₹)</label><input type="number" className={inp} placeholder="100000" value={f.investmentAmount} onChange={set('investmentAmount')} /></div>
        <div><label className={lbl}>Holding Period (months)</label><input type="number" className={inp} placeholder="12" value={f.holdingPeriod} onChange={set('holdingPeriod')} /></div>
        <div><label className={lbl}>Turnover Rate (×)</label><input type="number" step="0.1" className={inp} placeholder="1.0" value={f.turnoverRate} onChange={set('turnoverRate')} /></div>
        <div><label className={lbl}>Brokerage Rate (%)</label><input type="number" step="0.01" className={inp} placeholder="0.03" value={f.brokerageRate} onChange={set('brokerageRate')} /></div>
        <div><label className={lbl}>Asset Type</label>
          <select className={inp} value={f.assetType} onChange={set('assetType')}>
            <option value="equity">Equity</option>
            <option value="debt">Debt</option>
          </select>
        </div>
      </FormGrid>
      <button onClick={run} disabled={!f.paperReturn||!f.investmentAmount||loading}
        className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-xl transition-all">
        {loading ? 'Calculating...' : '🎭 Show Reality vs Paper'}
      </button>
      {loading && <Spinner />}
      {err && <Err msg={err} />}
      {data && (
        <div className="space-y-4">
          <div className="rounded-2xl p-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800">
            <div className="flex flex-wrap justify-between gap-4 items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400 mb-1">Reality Gap</p>
                <p className="text-4xl font-black text-red-700 dark:text-red-300">{fmtP(data.gap?.percentageOfPaperReturn)}</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">of paper return lost to friction</p>
              </div>
              <div className="grid grid-cols-2 gap-6 text-right">
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Paper</p><p className="text-2xl font-black text-blue-600 dark:text-blue-400">{fmtP(data.paper?.return)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Real</p><p className="text-2xl font-black text-green-600 dark:text-green-400">{fmtP(data.real?.return)}</p></div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card title="Cost Breakdown" accent="orange">
              <Row label="Brokerage"    value={fmtC(data.costs?.transactionCosts?.brokerage)} />
              <Row label="STT"          value={fmtC(data.costs?.transactionCosts?.stt)} />
              <Row label="Other Charges"value={fmtC(data.costs?.transactionCosts?.otherCharges)} />
              <Row label="GST"          value={fmtC(data.costs?.transactionCosts?.gst)} />
              <Row label="Slippage"     value={fmtC(data.costs?.transactionCosts?.slippage)} />
              <Row label="Total Costs"  value={fmtC(data.costs?.transactionCosts?.total)} color="text-red-600 dark:text-red-400 font-black" />
            </Card>
            <Card title="Tax" accent="red">
              <Row label="Gain Type"   value={fmtP(data.costs?.tax?.gainType)} />
              <Row label="Capital Tax" value={fmtC(data.costs?.tax?.capitalGainsTax)} color="text-red-600 dark:text-red-400" />
              <Row label="Total Friction" value={fmtC(data.costs?.totalFriction)} color="text-red-700 dark:text-red-300 font-black" />
            </Card>
            <Card title="Gain Comparison" accent="green">
              <Row label="Paper Gain"  value={fmtC(data.paper?.gain)} />
              <Row label="Real Gain"   value={fmtC(data.real?.gain)} color="text-green-600 dark:text-green-400 font-black" />
              <Row label="Gain Lost"   value={fmtC(data.gap?.gainGap)} color="text-red-600 dark:text-red-400" />
              <Row label="Efficiency"  value={fmtP(data.analysis?.efficiency)} />
            </Card>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
            💡 {fmtP(data.recommendation)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 6: Comprehensive Analysis ──────────────────────────────────────────
function Comprehensive() {
  const [f, setF] = useState({ portfolioValue:'', annualTurnover:'1.0', yearsToProject:'10', taxSlab:'30' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function run() {
    setLoading(true); setErr(null);
    try {
      // We build a dummy trade from portfolio params so comprehensive engine works
      const pv = +f.portfolioValue;
      const dummyTrade = {
        buyPrice: 100, sellPrice: 115, quantity: Math.round(pv / 100),
        buyDate: '2023-04-01', sellDate: '2024-04-01',
        assetType: 'equity', listed: true, taxSlab: +f.taxSlab
      };
      const r = await axios.post(`${API}/api/execution-reality/comprehensive`, {
        trades: [dummyTrade],
        portfolioValue: pv,
        annualTurnover: +f.annualTurnover,
        yearsToProject: +f.yearsToProject,
        taxSlab: +f.taxSlab
      });
      setData(r.data.data);
    } catch(e) { setErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }

  const set = k => e => setF(p => ({...p, [k]: e.target.value}));

  return (
    <div className="space-y-5">
      <Info>Full picture — all execution costs combined: brokerage + STT + taxes + turnover drag + long-term compounding erosion.</Info>
      <FormGrid>
        <div><label className={lbl}>Portfolio Value (₹)</label><input type="number" className={inp} placeholder="1000000" value={f.portfolioValue} onChange={set('portfolioValue')} /></div>
        <div><label className={lbl}>Annual Turnover (×)</label><input type="number" step="0.1" className={inp} placeholder="1.0" value={f.annualTurnover} onChange={set('annualTurnover')} /></div>
        <div><label className={lbl}>Years to Project</label><input type="number" className={inp} placeholder="10" value={f.yearsToProject} onChange={set('yearsToProject')} /></div>
        <div><label className={lbl}>Tax Slab (%)</label>
          <select className={inp} value={f.taxSlab} onChange={set('taxSlab')}>
            {['0','5','20','30'].map(s => <option key={s} value={s}>{s}%</option>)}
          </select>
        </div>
      </FormGrid>
      <button onClick={run} disabled={!f.portfolioValue||loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-xl transition-all">
        {loading ? 'Analysing...' : '🔬 Run Full Analysis'}
      </button>
      {loading && <Spinner />}
      {err && <Err msg={err} />}
      {data && (
        <div className="space-y-4">
          {/* Summary banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:'Portfolio Value',    val: fmtC(data.summary?.portfolioValue),       color:'text-blue-600 dark:text-blue-400' },
              { label:'Total Tax Paid',     val: fmtC(data.summary?.totalTaxPaid),         color:'text-red-600 dark:text-red-400' },
              { label:'Total Friction',     val: fmtC(data.summary?.totalFriction),        color:'text-orange-600 dark:text-orange-400' },
              { label:'Net Efficiency',     val: fmtP(data.summary?.netEfficiency),        color:'text-green-600 dark:text-green-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className={`text-lg font-black ${color}`}>{val}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Turnover Cost Analysis" accent="red">
              <Row label="Transaction Costs"  value={fmtC(data.turnoverCosts?.costs?.totalTransactionCosts)} color="text-red-600 dark:text-red-400" />
              <Row label="Estimated Tax Drag"  value={fmtC(data.turnoverCosts?.costs?.estimatedCapitalGainsTax)} />
              <Row label="Total Friction"      value={fmtC(data.turnoverCosts?.costs?.totalFriction)} color="text-red-700 dark:text-red-300 font-black" />
              <Row label="Annual Drag %"       value={fmtP(data.turnoverCosts?.impact?.annualDrag)} color="text-orange-600 dark:text-orange-400" />
              <Row label="Break-Even Needed"   value={fmtP(data.turnoverCosts?.impact?.breakeven)} color="text-yellow-700 dark:text-yellow-400" />
            </Card>
            <Card title="Compounding Over Time" accent="blue">
              <Row label="Final Portfolio Value" value={fmtC(data.compounding?.results?.finalValue)} color="text-green-600 dark:text-green-400 font-black" />
              <Row label="Without Tax"           value={fmtC(data.compounding?.comparison?.withoutTax)} color="text-blue-600 dark:text-blue-400" />
              <Row label="Total Tax Paid"        value={fmtC(data.compounding?.results?.totalTaxPaid)} color="text-red-600 dark:text-red-400" />
              <Row label="After-Tax CAGR"        value={fmtP(data.compounding?.returns?.afterTaxCAGR)} />
              <Row label="Tax Drag on CAGR"      value={fmtP(data.compounding?.returns?.taxDrag)} color="text-orange-600 dark:text-orange-400" />
            </Card>
          </div>
          <Card title="Real vs Paper" accent="orange">
            <div className="grid md:grid-cols-3 gap-4">
              <div><Row label="Paper Return" value={fmtP(data.realVsPaper?.paper?.return)} /><Row label="Paper Gain" value={fmtC(data.realVsPaper?.paper?.gain)} /></div>
              <div><Row label="Real Return"  value={fmtP(data.realVsPaper?.real?.return)} color="text-green-600 dark:text-green-400" /><Row label="Real Gain" value={fmtC(data.realVsPaper?.real?.gain)} color="text-green-600 dark:text-green-400" /></div>
              <div><Row label="Return Gap"   value={fmtP(data.realVsPaper?.gap?.returnGap)} color="text-red-600 dark:text-red-400" /><Row label="Gain Lost" value={fmtC(data.realVsPaper?.gap?.gainGap)} color="text-red-600 dark:text-red-400" /></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'tax',         icon: '🧮', label: 'Capital Gains Tax'   },
  { id: 'dividend',    icon: '💰', label: 'Dividend Tax'        },
  { id: 'turnover',    icon: '🔄', label: 'Turnover Costs'      },
  { id: 'compounding', icon: '📈', label: 'Compounding Reality' },
  { id: 'rvp',         icon: '🎭', label: 'Real vs Paper'       },
  { id: 'full',        icon: '🔬', label: 'Full Analysis'       },
];

export default function ExecutionRealityPage() {
  const [tab, setTab] = useState('tax');
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">⚡ Execution Reality</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Month 12 — Tax · Dividend · Turnover · Compounding · Real vs Paper</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-4 text-sm font-bold whitespace-nowrap flex-shrink-0 transition-all border-b-2 ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {tab === 'tax'         && <TaxCalc />}
          {tab === 'dividend'    && <DividendTax />}
          {tab === 'turnover'    && <TurnoverCosts />}
          {tab === 'compounding' && <CompoundingReality />}
          {tab === 'rvp'         && <RealVsPaper />}
          {tab === 'full'        && <Comprehensive />}
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-4">
        ⚠️ Tax calculations based on Indian tax laws FY 2025-26. Not a substitute for CA advice.
      </p>
    </div>
  );
}

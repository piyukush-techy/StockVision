// popup.js — StockVision Chrome Extension
// Handles search, live prices, watchlist quick view

const API = 'http://localhost:5000/api'; // Change to production URL when deployed

const INR = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const FMT = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

let debounceTimer;
let currentSymbol = null;
let sessionId;

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Get or create sessionId
  const stored = await chrome.storage.local.get(['sessionId', 'watchlistPins', 'apiBase']);
  sessionId = stored.sessionId || generateId();
  if (!stored.sessionId) chrome.storage.local.set({ sessionId });

  const apiBase = stored.apiBase || API;
  window.API_BASE = apiBase;

  // Load watchlist pins
  loadWatchlistPins(stored.watchlistPins || []);

  // Load ribbon
  loadRibbon();

  // Event listeners
  document.getElementById('searchInput').addEventListener('input', onSearchInput);
  document.getElementById('searchInput').addEventListener('keydown', onSearchKeydown);
  document.getElementById('btnView').addEventListener('click', openInApp);
  document.getElementById('btnWatchlist').addEventListener('click', addToWatchlist);
  document.getElementById('btnAlert').addEventListener('click', setAlert);
  document.getElementById('openApp').addEventListener('click', () => openTab('/'));
  document.getElementById('settingsLink').addEventListener('click', () => chrome.runtime.openOptionsPage());
});

// ── Search ────────────────────────────────────────────────────────────────────
function onSearchInput(e) {
  const q = e.target.value.trim();
  clearTimeout(debounceTimer);
  if (q.length < 2) { hide('autocomplete'); return; }

  debounceTimer = setTimeout(async () => {
    try {
      const res  = await fetch(`${window.API_BASE}/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      showAutocomplete(data.results || data || []);
    } catch {
      showAutocomplete([]);
    }
  }, 280);
}

function onSearchKeydown(e) {
  if (e.key === 'Escape') { hide('autocomplete'); }
}

function showAutocomplete(results) {
  const box = document.getElementById('autocomplete');
  if (!results.length) { hide('autocomplete'); return; }

  box.innerHTML = results.slice(0, 6).map(r => `
    <div class="autocomplete-item" data-symbol="${r.symbol}">
      <span class="ac-symbol">${r.symbol.replace('.NS','')}</span>
      <span class="ac-name">${r.name || ''}</span>
    </div>
  `).join('');

  box.querySelectorAll('.autocomplete-item').forEach(el => {
    el.addEventListener('click', () => selectStock(el.dataset.symbol));
  });

  show('autocomplete');
}

// ── Select stock ──────────────────────────────────────────────────────────────
async function selectStock(symbol) {
  hide('autocomplete');
  currentSymbol = symbol;
  document.getElementById('searchInput').value = symbol.replace('.NS', '');
  document.getElementById('stockSymbol').textContent = symbol.replace('.NS', '');
  document.getElementById('stockPrice').textContent  = '...';

  try {
    const res  = await fetch(`${window.API_BASE}/stocks/${symbol}`);
    const data = await res.json();
    const s    = data.data || data;

    document.getElementById('stockName').textContent  = s.name || '';
    document.getElementById('stockSymbol').textContent = s.symbol || symbol;
    document.getElementById('stockPrice').textContent  = INR(s.currentPrice || s.price || 0);

    const chg    = s.changePercent || s.change_percent || 0;
    const chgEl  = document.getElementById('stockChange');
    chgEl.textContent  = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
    chgEl.className    = 'change ' + (chg >= 0 ? 'up' : 'down');

    document.getElementById('ohlcO').textContent = INR(s.open || 0);
    document.getElementById('ohlcH').textContent = INR(s.high || 0);
    document.getElementById('ohlcL').textContent = INR(s.low  || 0);
    document.getElementById('ohlcV').textContent = FMT(s.volume || 0);

    const lo  = s.low52w  || 0;
    const hi  = s.high52w || 0;
    const cur = s.currentPrice || 0;
    const pct = hi > lo ? Math.round(((cur - lo) / (hi - lo)) * 100) : 50;
    document.getElementById('w52bar').style.width  = pct + '%';
    document.getElementById('w52low').textContent  = INR(lo);
    document.getElementById('w52high').textContent = INR(hi);

    show('stockCard');
    show('actionButtons');
  } catch (err) {
    showToast('Could not load stock data');
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
function openInApp() {
  if (currentSymbol) openTab(`/stock/${currentSymbol}`);
}

async function addToWatchlist() {
  if (!currentSymbol) return;
  try {
    await fetch(`${window.API_BASE}/watchlists`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId, name: 'Chrome Extension' }),
    }).catch(() => {});

    const wlRes  = await fetch(`${window.API_BASE}/watchlists/${sessionId}`);
    const wlData = await wlRes.json();
    const wl     = (wlData.data || wlData)?.[0];

    if (wl?._id) {
      await fetch(`${window.API_BASE}/watchlists/${wl._id}/stocks`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbol: currentSymbol, name: document.getElementById('stockName').textContent }),
      });
      showToast(`${currentSymbol.replace('.NS','')} added to watchlist ✓`);

      // Update pins
      const { watchlistPins = [] } = await chrome.storage.local.get('watchlistPins');
      if (!watchlistPins.find(p => p.symbol === currentSymbol)) {
        watchlistPins.unshift({ symbol: currentSymbol, name: document.getElementById('stockName').textContent });
        if (watchlistPins.length > 6) watchlistPins.pop();
        chrome.storage.local.set({ watchlistPins });
        loadWatchlistPins(watchlistPins);
      }
    } else {
      showToast('Please create a watchlist first in the app');
    }
  } catch {
    showToast('Failed to add to watchlist');
  }
}

async function setAlert() {
  if (!currentSymbol) return;
  const price = parseFloat(document.getElementById('stockPrice').textContent.replace(/[₹,]/g, ''));
  const target = prompt(`Set price alert for ${currentSymbol.replace('.NS','')}\nCurrent: ₹${price}\nEnter target price:`);
  if (!target || isNaN(parseFloat(target))) return;

  try {
    await fetch(`${window.API_BASE}/alerts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        sessionId,
        symbol:       currentSymbol,
        targetPrice:  parseFloat(target),
        condition:    parseFloat(target) > price ? 'above' : 'below',
      }),
    });
    showToast(`Alert set at ₹${target} ✓`);
    chrome.alarms.create(`alert_${currentSymbol}`, { periodInMinutes: 1 });
  } catch {
    showToast('Failed to set alert');
  }
}

// ── Watchlist Quick View ──────────────────────────────────────────────────────
async function loadWatchlistPins(pins) {
  const grid = document.getElementById('watchlistGrid');
  if (!pins.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;color:#334155;font-size:11px;padding:4px 0">Search and add stocks to see them here</div>`;
    return;
  }

  // Show skeleton first
  grid.innerHTML = pins.map(() => `
    <div class="wl-item">
      <div class="skeleton" style="width:60px;height:11px;margin-bottom:4px"></div>
      <div class="skeleton" style="width:80px;height:16px;margin-bottom:3px"></div>
      <div class="skeleton" style="width:40px;height:10px"></div>
    </div>
  `).join('');

  // Fetch live prices
  try {
    const symbols = pins.map(p => p.symbol);
    const prices  = await Promise.allSettled(
      symbols.map(s => fetch(`${window.API_BASE}/stocks/${s}`).then(r => r.json()))
    );

    grid.innerHTML = pins.map((pin, i) => {
      const d   = prices[i].status === 'fulfilled' ? (prices[i].value?.data || prices[i].value) : null;
      const chg = d?.changePercent ?? 0;
      return `
        <div class="wl-item" data-symbol="${pin.symbol}">
          <div class="wl-sym">${pin.symbol.replace('.NS','')}</div>
          <div class="wl-price">${d ? INR(d.currentPrice || 0) : '--'}</div>
          <div class="wl-chg ${chg >= 0 ? 'up' : 'down'}">${d ? (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%' : '--'}</div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.wl-item').forEach(el => {
      el.addEventListener('click', () => selectStock(el.dataset.symbol));
    });
  } catch {}
}

// ── Ribbon ────────────────────────────────────────────────────────────────────
async function loadRibbon() {
  try {
    const res  = await fetch(`${window.API_BASE}/indices`);
    const data = await res.json();
    const idxs = data.data || data || [];

    const nifty  = idxs.find(i => i.symbol === '^NSEI'  || i.name?.toLowerCase().includes('nifty 50'));
    const sensex = idxs.find(i => i.symbol === '^BSESN' || i.name?.toLowerCase().includes('sensex'));

    if (nifty) {
      const el  = document.getElementById('niftyVal');
      const chg = nifty.changePercent ?? 0;
      el.textContent = FMT(nifty.currentPrice || 0);
      el.className   = chg >= 0 ? 'up' : 'down';
    }
    if (sensex) {
      const el  = document.getElementById('sensexVal');
      const chg = sensex.changePercent ?? 0;
      el.textContent = FMT(sensex.currentPrice || 0);
      el.className   = chg >= 0 ? 'up' : 'down';
    }
  } catch {}
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function openTab(path) {
  const base = (window.API_BASE || API).replace('/api', '').replace(':5000', ':5173');
  chrome.tabs.create({ url: base + path });
}

function generateId() {
  return 'ext_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

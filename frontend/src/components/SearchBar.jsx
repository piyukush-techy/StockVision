import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchStocks, getTrending, getSearchHistory, saveSearch } from '../api';
import useSessionId from '../hooks/useSessionId';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const sessionId = useSessionId();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch trending and recent on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [trendingRes] = await Promise.all([
          getTrending(),
        ]);
        setTrending(trendingRes.data.trending || []);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Load recent searches when session is ready
  useEffect(() => {
    if (!sessionId) return;
    const loadHistory = async () => {
      try {
        const res = await getSearchHistory(sessionId);
        setRecentSearches(res.data.searches || []);
      } catch (err) {
        console.error('Failed to load search history:', err);
      }
    };
    loadHistory();
  }, [sessionId]);

  // Debounced search
  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 1) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchStocks(val);
        setResults(res.data.results || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  // Handle stock selection
  const handleSelect = async (stock) => {
    setQuery('');
    setIsOpen(false);

    // Save to history
    if (sessionId) {
      try {
        await saveSearch(sessionId, stock.symbol, stock.name);
        // Refresh recent searches
        const res = await getSearchHistory(sessionId);
        setRecentSearches(res.data.searches || []);
      } catch (err) {
        console.error('Failed to save search:', err);
      }
    }

    navigate(`/stock/${stock.symbol}`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isOpen;
  const showResults = query.length > 0 && results.length > 0;
  const showEmpty = query.length > 0 && !loading && results.length === 0;
  const showDefault = query.length === 0;

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search stocks, e.g. Reliance, TCS, INFY..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
        {loading && (
          <div className="absolute inset-y-0 right-4 flex items-center">
            <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto"
        >
          {/* Search Results */}
          {showResults && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium px-4 pt-3 pb-1 uppercase tracking-wide">Results</p>
              {results.map((stock) => (
                <StockRow key={stock.symbol} stock={stock} onSelect={handleSelect} />
              ))}
            </div>
          )}

          {/* No Results */}
          {showEmpty && (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              No stocks found for "{query}"
            </div>
          )}

          {/* Default: Recent + Trending */}
          {showDefault && (
            <div>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium px-4 pt-3 pb-1 uppercase tracking-wide">
                    Recent Searches
                  </p>
                  {recentSearches.slice(0, 5).map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => handleSelect({ symbol: item.symbol, name: item.stockName })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.symbol.replace('.NS', '').replace('.BO', '')}</p>
                        <p className="text-xs text-gray-500">{item.stockName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Trending */}
              {trending.length > 0 && (
                <div className={recentSearches.length > 0 ? 'border-t border-gray-100 dark:border-gray-700 mt-1' : ''}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium px-4 pt-3 pb-1 uppercase tracking-wide">
                    🔥 Trending
                  </p>
                  {trending.slice(0, 6).map((stock) => (
                    <StockRow key={stock.symbol} stock={stock} onSelect={handleSelect} />
                  ))}
                </div>
              )}

              {trending.length === 0 && recentSearches.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">
                  Start typing to search stocks
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-component: Single stock row in dropdown
function StockRow({ stock, onSelect }) {
  const change = stock.liveData?.changePercent || 0;
  const price = stock.liveData?.price || 0;
  const cleanSymbol = stock.symbol.replace('.NS', '').replace('.BO', '');

  return (
    <button
      onClick={() => onSelect(stock)}
      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-blue-700 text-xs font-bold">{cleanSymbol.charAt(0)}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{cleanSymbol}</p>
          <p className="text-xs text-gray-500 truncate max-w-[180px]">{stock.name}</p>
        </div>
      </div>
      {price > 0 && (
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </p>
        </div>
      )}
    </button>
  );
}

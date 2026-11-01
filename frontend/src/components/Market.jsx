import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';

export default function Market({ customStocks, onAddStock, onRemoveStock }) {
  // Default 5 Indices
  const [indices, setIndices] = useState([]);
  // Live quotes for custom user-added stocks
  const [stockQuotes, setStockQuotes] = useState({});
  // Search bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  // Auto-refresh state
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch the 5 Major Indices
  const fetchIndices = async () => {
    try {
      const res = await fetch('/api/indices');
      if (res.ok) {
        const data = await res.json();
        setIndices(data);
      }
    } catch (err) {
      console.warn('Error fetching indices:', err);
    }
  };

  // 2. Fetch Quotes for Custom Stocks
  const fetchCustomQuotes = async () => {
    if (!customStocks || customStocks.length === 0) return;
    try {
      const quotePromises = customStocks.map(async (stock) => {
        const res = await fetch(`/api/quote?symbol=${encodeURIComponent(stock.symbol)}&exchange=${encodeURIComponent(stock.exchange || 'NSE')}`);
        if (res.ok) {
          const data = await res.json();
          return { symbol: stock.symbol, data };
        }
        return null;
      });

      const results = await Promise.all(quotePromises);
      const newQuotes = {};
      results.forEach((item) => {
        if (item) newQuotes[item.symbol] = item.data;
      });
      setStockQuotes(newQuotes);
    } catch (err) {
      console.warn('Error fetching custom stock quotes:', err);
    }
  };

  // Combined Refresh every 2 seconds
  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchIndices(), fetchCustomQuotes()]);
    setLastRefreshed(new Date().toLocaleTimeString());
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 2000);
    return () => clearInterval(interval);
  }, [customStocks]);

  // 3. Search Stock Handler
  const handleSearch = async (queryText) => {
    setSearchQuery(queryText);
    if (!queryText.trim() || queryText.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(queryText.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.warn('Search query error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddStock = (stock) => {
    if (customStocks.length >= 10) {
      alert('Maximum 10 custom stocks allowed.');
      return;
    }
    if (customStocks.some((s) => s.symbol.toUpperCase() === stock.symbol.toUpperCase())) {
      alert(`${stock.symbol} is already in your watchlist.`);
      return;
    }
    onAddStock(stock);
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
  };

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
      
      {/* Search & Top Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-4">
        
        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search Stock (e.g. RELIANCE, TCS, INFY, SENSEX)..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="input-field pl-10 pr-20 text-sm"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5" />
            {isSearching && (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400 absolute right-3" />
            )}
          </div>

          {/* Search Autocomplete Dropdown */}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
              {searchResults.map((item) => (
                <div
                  key={item.symbol}
                  className="p-3 flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition"
                  onMouseDown={() => handleAddStock(item)}
                >
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {item.symbol}
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-blue-400 font-mono">
                        {item.exchange}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{item.name}</div>
                  </div>
                  <button
                    className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded-md transition font-medium"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Badge & Counter */}
        <div className="flex items-center gap-3 text-xs text-slate-400 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Auto Refresh: <strong className="text-white">2s</strong></span>
          </div>
          <span className="font-mono text-[11px]">{lastRefreshed}</span>
          <div className="text-[11px] font-semibold text-blue-400">
            Stocks: {customStocks.length}/10
          </div>
        </div>
      </div>

      {/* Market Watch Table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            <span>Market Watch & Live Indices</span>
          </div>
          <span className="text-xs text-slate-500">Live prices streamed from Alice Blue API</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <th className="py-3 px-5">Symbol / Name</th>
                <th className="py-3 px-4">Exchange</th>
                <th className="py-3 px-4 text-right">LTP (₹)</th>
                <th className="py-3 px-4 text-right">Change (%)</th>
                <th className="py-3 px-4 text-right">High (₹)</th>
                <th className="py-3 px-4 text-right">Low (₹)</th>
                <th className="py-3 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
              
              {/* Default 5 Indices */}
              {indices.map((idx) => {
                const isPositive = idx.change >= 0;
                return (
                  <tr key={idx.symbol} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-5 font-sans font-bold text-white text-sm">
                      <div className="flex items-center gap-2">
                        <span>{idx.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono font-medium">
                          INDEX
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">{idx.name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${idx.exchange === 'BSE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                        {idx.exchange}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white text-sm">
                      {Number(idx.ltp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isPositive ? '+' : ''}{Number(idx.change).toFixed(2)} ({isPositive ? '+' : ''}{Number(idx.change_percent).toFixed(2)}%)</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {Number(idx.high).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {Number(idx.low).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5 text-center text-slate-500 font-sans text-xs">
                      Default
                    </td>
                  </tr>
                );
              })}

              {/* Custom User-Added Stocks (Up to 10) */}
              {customStocks.map((stock) => {
                const quote = stockQuotes[stock.symbol];
                const ltp = quote ? quote.ltp : 0.0;
                const change = quote ? quote.change : 0.0;
                const changePct = quote ? quote.change_percent : 0.0;
                const high = quote ? quote.high : 0.0;
                const low = quote ? quote.low : 0.0;
                const isPositive = change >= 0;

                return (
                  <tr key={stock.symbol} className="hover:bg-slate-800/30 transition bg-slate-900/20">
                    <td className="py-3.5 px-5 font-sans font-bold text-white text-sm">
                      <div className="flex items-center gap-2">
                        <span>{stock.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono font-medium">
                          STOCK
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">{stock.name || stock.symbol}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${stock.exchange === 'BSE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                        {stock.exchange || 'NSE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white text-sm">
                      {ltp > 0 ? Number(ltp).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : <RefreshCw className="w-3 h-3 animate-spin inline text-slate-500" />}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ltp > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          <span>{isPositive ? '+' : ''}{Number(change).toFixed(2)} ({isPositive ? '+' : ''}{Number(changePct).toFixed(2)}%)</span>
                        </div>
                      ) : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {high > 0 ? Number(high).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {low > 0 ? Number(low).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <button
                        onClick={() => onRemoveStock(stock.symbol)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                        title="Remove stock from watch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

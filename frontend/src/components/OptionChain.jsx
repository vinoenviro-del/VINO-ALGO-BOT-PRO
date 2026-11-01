import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, Target, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function OptionChain({ customStocks = [] }) {
  const defaultSymbols = [
    { symbol: 'NIFTY', name: 'Nifty 50', exchange: 'NSE' },
    { symbol: 'BANKNIFTY', name: 'Nifty Bank', exchange: 'NSE' },
    { symbol: 'FINNIFTY', name: 'Fin Nifty', exchange: 'NSE' },
    { symbol: 'MIDCPNIFTY', name: 'Midcap Nifty', exchange: 'NSE' },
    { symbol: 'SENSEX', name: 'BSE Sensex', exchange: 'BSE' },
    { symbol: 'BANKEX', name: 'BSE Bankex', exchange: 'BSE' },
  ];

  const allSymbols = [
    ...defaultSymbols,
    ...customStocks
      .filter((cs) => !defaultSymbols.some((ds) => ds.symbol === cs.symbol))
      .map((cs) => ({
        symbol: cs.symbol,
        name: cs.name || cs.symbol,
        exchange: cs.exchange || (['SENSEX', 'BANKEX'].includes(cs.symbol) ? 'BSE' : 'NSE')
      }))
  ];

  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('');

  const currentSecurity = allSymbols.find((s) => s.symbol === selectedSymbol) || { exchange: 'NSE' };
  const currentExchange = ['SENSEX', 'BANKEX'].includes(selectedSymbol) ? 'BSE' : currentSecurity.exchange || 'NSE';

  const fetchOptionChain = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setIsRefreshing(true);

    try {
      const url = `/api/option-chain?symbol=${encodeURIComponent(selectedSymbol)}&exchange=${encodeURIComponent(currentExchange)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChainData(data);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn('Option chain fetch error:', err);
    } finally {
      if (isInitial) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOptionChain(true);
    const interval = setInterval(() => {
      fetchOptionChain(false);
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  return (
    <div className="w-full space-y-3 font-sans">
      
      {/* Top Header Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Underlying dropdown */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Underlying:</span>
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="text-xs font-bold text-white bg-[#0b0f19] border border-slate-700 py-1.5 px-3 rounded-lg cursor-pointer outline-none focus:border-blue-500"
          >
            {allSymbols.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} ({s.exchange})
              </option>
            ))}
          </select>
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {currentExchange}
          </span>
        </div>

        {/* Right: Spot & ATM Indicators */}
        {chainData && (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="bg-[#0b0f19] border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Spot:</span>
              <span className="font-mono font-bold text-white">
                ₹{Number(chainData.spot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-emerald-400">
              <Target className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-semibold">ATM:</span>
              <span className="font-mono font-bold text-emerald-300">
                {chainData.atm}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              Exp: <strong className="text-white">{chainData.expiry}</strong>
            </div>

            <button
              onClick={() => fetchOptionChain(false)}
              className="p-1.5 rounded-lg bg-[#0b0f19] border border-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        )}

      </div>

      {/* Option Chain Table Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            <span>Loading {selectedSymbol} Option Chain...</span>
          </div>
        ) : !chainData || !chainData.chain || chainData.chain.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            No active option chain data available for {selectedSymbol}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300 font-mono">
              <thead className="bg-[#0b0f19] text-[10px] uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3 text-left text-emerald-400 font-bold">CE OI</th>
                  <th className="py-2 px-3 text-right text-emerald-400 font-bold">CE LTP</th>
                  <th className="py-2 px-4 text-center text-white font-extrabold bg-slate-900/80">STRIKE</th>
                  <th className="py-2 px-3 text-left text-rose-400 font-bold">PE LTP</th>
                  <th className="py-2 px-3 text-right text-rose-400 font-bold">PE OI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {chainData.chain.map((row) => {
                  const isAtm = row.strike === chainData.atm;
                  return (
                    <tr
                      key={row.strike}
                      className={`hover:bg-slate-800/40 transition ${
                        isAtm ? 'bg-amber-500/10 font-bold border-y border-amber-500/30' : ''
                      }`}
                    >
                      <td className="py-1.5 px-3 text-slate-400 text-left">
                        {Number(row.ce_oi || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-1.5 px-3 text-emerald-400 font-semibold text-right">
                        ₹{Number(row.ce_ltp || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-4 text-center font-extrabold text-white bg-slate-900/60">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{row.strike}</span>
                          {isAtm && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                              ATM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-rose-400 font-semibold text-left">
                        ₹{Number(row.pe_ltp || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-3 text-slate-400 text-right">
                        {Number(row.pe_oi || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, AlertOctagon, RefreshCw, Terminal, TrendingUp, TrendingDown, Target, Shield, CheckCircle2 } from 'lucide-react';

export default function Strategy({ customStocks = [] }) {
  // Built-in Underlying Symbols
  const defaultSymbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'BANKEX'];
  const allSymbols = [...defaultSymbols, ...customStocks.map(s => s.symbol).filter(s => !defaultSymbols.includes(s))];

  // Strategy Form Parameters
  const [strategyType, setStrategyType] = useState('9:20 AM ORB Strategy');
  const [symbol, setSymbol] = useState('NIFTY');
  const [qty, setQty] = useState(25);
  const [slPercent, setSlPercent] = useState(30);
  const [targetPercent, setTargetPercent] = useState(50);
  const [product, setProduct] = useState('MIS');
  const [optionType, setOptionType] = useState('CE'); // For manual mode

  // Live Strategy Status from Backend
  const [status, setStatus] = useState({
    is_running: false,
    entry_price: 0.0,
    ltp: 0.0,
    pnl: 0.0,
    trades_today: 0,
    daily_pnl: 0.0,
    logs: []
  });

  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const logContainerRef = useRef(null);

  // 1. Fetch Strategy Status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/strategy/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.warn('Error fetching strategy status:', err);
    }
  };

  // Auto-scroll logs to bottom when updated
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [status.logs]);

  // Connect to WebSocket /ws/strategy with fallback polling every 1 sec
  useEffect(() => {
    fetchStatus();

    // Setup WebSocket
    let ws = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/strategy`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStatus(data);
        } catch (e) {}
      };

      ws.onerror = () => {
        // Fallback to polling if WebSocket fails
      };
    } catch (e) {}

    // Polling interval fallback
    const interval = setInterval(fetchStatus, 1500);

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  // Update default lot quantity based on selected index
  useEffect(() => {
    if (symbol === 'NIFTY') setQty(25);
    else if (symbol === 'BANKNIFTY') setQty(15);
    else if (symbol === 'FINNIFTY') setQty(25);
    else if (symbol === 'SENSEX') setQty(10);
    else if (symbol === 'BANKEX') setQty(15);
    else setQty(100); // Standard stock default
  }, [symbol]);

  // 2. Start Strategy
  const handleStart = async () => {
    setLoading(true);
    setActionMsg('');
    try {
      const res = await fetch('/api/strategy/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          strategy_type: strategyType,
          qty: parseInt(qty),
          sl_percent: parseFloat(slPercent),
          target_percent: parseFloat(targetPercent),
          product,
          option_type: optionType
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(`✅ ${data.message}`);
        fetchStatus();
      } else {
        setActionMsg(`❌ ${data.detail || 'Could not start strategy.'}`);
      }
    } catch (err) {
      setActionMsg(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Stop Strategy
  const handleStop = async () => {
    setLoading(true);
    setActionMsg('');
    try {
      const res = await fetch('/api/strategy/stop', { method: 'POST' });
      const data = await res.json();
      setActionMsg(data.message);
      fetchStatus();
    } catch (err) {
      setActionMsg('Error stopping strategy.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Square Off All
  const handleSquareOff = async () => {
    if (!confirm('Are you sure you want to SQUARE OFF all active positions immediately?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/squareoff/all', { method: 'POST' });
      const data = await res.json();
      setActionMsg(data.message);
      fetchStatus();
    } catch (err) {
      setActionMsg('Error executing square off.');
    } finally {
      setLoading(false);
    }
  };

  const pos = status.position;
  const isPosActive = Boolean(pos);

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
      
      {/* Top Banner & Control Status */}
      <div className="glass-panel p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Auto Trading Engine</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 ${
              status.is_running
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${status.is_running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {status.is_running ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated ATM Strike Selection • Stop Loss % & Target % Monitoring • Instant Auto Square-Off
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!status.is_running ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex-1 md:flex-initial btn-primary !bg-emerald-600 hover:!bg-emerald-500 !py-2.5 !px-5 text-xs"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Strategy</span>
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading}
              className="flex-1 md:flex-initial bg-amber-600/20 text-amber-300 border border-amber-600/40 hover:bg-amber-600/30 py-2.5 px-5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Strategy</span>
            </button>
          )}

          <button
            onClick={handleSquareOff}
            disabled={loading}
            className="flex-1 md:flex-initial bg-rose-600 text-white hover:bg-rose-500 py-2.5 px-5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/30"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Square Off All</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMsg && (
        <div className={`p-3.5 rounded-xl border text-xs font-medium ${
          actionMsg.startsWith('❌')
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          {actionMsg}
        </div>
      )}

      {/* Main Grid: Config Form & Live Position */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Strategy Configuration (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚙️ Strategy Parameters</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Product: MIS Intraday</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Strategy Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Strategy Algorithm
              </label>
              <select
                disabled={status.is_running}
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value)}
                className="input-field text-sm font-bold bg-slate-900 border-slate-700 cursor-pointer"
              >
                <option value="9:20 AM ORB Strategy">9:20 AM ORB Strategy (Opening Range Breakout)</option>
                <option value="9:30 AM EMA Crossover">9:30 AM EMA Crossover (Fast & Slow EMA)</option>
                <option value="Manual Strategy">Manual Strategy (Immediate Entry User Pick)</option>
              </select>
            </div>

            {/* Underlying Symbol */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Underlying Symbol
              </label>
              <select
                disabled={status.is_running}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="input-field text-sm font-bold bg-slate-900 border-slate-700 cursor-pointer"
              >
                {allSymbols.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Quantity / Lots */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Total Quantity
              </label>
              <input
                type="number"
                disabled={status.is_running}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="input-field font-mono"
                min={1}
                step={1}
              />
            </div>

            {/* Stop Loss % */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Stoploss % (Default 30%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  disabled={status.is_running}
                  value={slPercent}
                  onChange={(e) => setSlPercent(e.target.value)}
                  className="input-field font-mono pr-8"
                  min={1}
                  max={100}
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-bold">%</span>
              </div>
            </div>

            {/* Target % */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target % (Default 50%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  disabled={status.is_running}
                  value={targetPercent}
                  onChange={(e) => setTargetPercent(e.target.value)}
                  className="input-field font-mono pr-8"
                  min={1}
                  max={500}
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-bold">%</span>
              </div>
            </div>

            {/* Manual Strategy Option Toggle */}
            {strategyType === 'Manual Strategy' && (
              <div className="sm:col-span-2 bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300 font-semibold">Select Manual Option Leg:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOptionType('CE')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      optionType === 'CE' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    BUY CALL (CE)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionType('PE')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      optionType === 'PE' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    BUY PUT (PE)
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
            <div className="text-slate-300 font-semibold">Execution Mechanism:</div>
            <div>• <strong>9:20 AM ORB:</strong> Automatically picks current ATM Strike at 09:20 AM and enters.</div>
            <div>• <strong>Risk Protection:</strong> Automatically squared off if Option drops by {slPercent}% or gains {targetPercent}%.</div>
          </div>
        </div>

        {/* Right Column: Live Position Card (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚡ Live Position</span>
            </h3>
            {isPosActive && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ACTIVE
              </span>
            )}
          </div>

          {!isPosActive ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl mb-3">
                💤
              </div>
              <div className="text-sm font-semibold text-slate-300">No Open Position</div>
              <div className="text-xs text-slate-500 mt-1">
                {status.is_running ? 'Waiting for strategy entry trigger...' : 'Click "Start Strategy" to begin auto-trading.'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Position Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-base text-white">{pos.trading_symbol}</h4>
                  <div className="text-xs text-slate-400">Qty: {pos.qty} | Time: {pos.entry_time}</div>
                </div>

                <div className={`text-right font-mono font-extrabold text-lg ${pos.pnl_rupees >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pos.pnl_rupees >= 0 ? '+' : ''}₹ {Number(pos.pnl_rupees).toFixed(2)}
                  <div className="text-xs font-semibold">
                    ({pos.pnl_points >= 0 ? '+' : ''}{Number(pos.pnl_points).toFixed(2)} pts)
                  </div>
                </div>
              </div>

              {/* Price Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Entry Price</span>
                  <div className="text-white font-bold text-sm">₹ {Number(pos.entry_price).toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Current LTP</span>
                  <div className="text-blue-400 font-bold text-sm">₹ {Number(pos.current_ltp).toFixed(2)}</div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-rose-400 uppercase">Stoploss ({pos.sl_percent}%)</span>
                  <div className="text-rose-400 font-bold text-sm">₹ {Number(pos.sl_price).toFixed(2)}</div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-emerald-400 uppercase">Target ({pos.target_percent}%)</span>
                  <div className="text-emerald-400 font-bold text-sm">₹ {Number(pos.target_price).toFixed(2)}</div>
                </div>
              </div>

              {/* Instant Square off button */}
              <button
                onClick={handleSquareOff}
                className="w-full btn-danger text-xs py-2 justify-center"
              >
                Square Off Active Leg
              </button>
            </div>
          )}

          {/* Daily Quick Summary */}
          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Today's Strategy P&L:</span>
            <span className={`font-mono font-bold ${status.daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {status.daily_pnl >= 0 ? '+' : ''}₹ {Number(status.daily_pnl).toFixed(2)}
            </span>
          </div>
        </div>

      </div>

      {/* Strategy Live Terminal Log Box */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Execution Terminal & Engine Audit Logs</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Live 1-sec streaming</span>
        </div>

        <div
          ref={logContainerRef}
          className="bg-black/80 p-4 h-52 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300"
        >
          {status.logs && status.logs.length > 0 ? (
            status.logs.map((logLine, idx) => {
              let color = 'text-slate-300';
              if (logLine.includes('ENTRY')) color = 'text-blue-400 font-bold';
              else if (logLine.includes('TARGET')) color = 'text-emerald-400 font-bold';
              else if (logLine.includes('STOPLOSS') || logLine.includes('SL HIT')) color = 'text-rose-400 font-bold';
              else if (logLine.includes('BLOCKED') || logLine.includes('Alert')) color = 'text-amber-400 font-semibold';

              return (
                <div key={idx} className={`${color} leading-relaxed`}>
                  {logLine}
                </div>
              );
            })
          ) : (
            <div className="text-slate-600">Waiting for strategy execution events...</div>
          )}
        </div>
      </div>

    </div>
  );
}

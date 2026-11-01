import React, { useState, useEffect } from 'react';
import VinoElephantTable from './VinoElephantTable.jsx';
import { Play, Square, AlertOctagon, RefreshCw, Clock, Target, TrendingUp, TrendingDown, Layers, Zap, Shield, ArrowRight } from 'lucide-react';

export default function VinoAlgo({ customStocks = [] }) {
  const defaultSymbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'BANKEX'];
  const allSymbols = [...defaultSymbols, ...customStocks.map((s) => s.symbol).filter((s) => !defaultSymbols.includes(s))];

  const [symbol, setSymbol] = useState('NIFTY');
  const [lots, setLots] = useState(1);
  const [slPoints, setSlPoints] = useState(10);
  const [trailingStart, setTrailingStart] = useState(30);
  const [trailingStep, setTrailingStep] = useState(10);

  // Live status state
  const [status, setStatus] = useState({
    is_running: false,
    symbol: 'NIFTY',
    company_name: 'Nifty 50 Index',
    spot: 24520.40,
    atm: 24500,
    ce_ltp: 145.20,
    pe_ltp: 132.80,
    levels: {
      P: 24523.70,
      R1: 24607.20,
      R2: 24694.00,
      R3: 24777.50,
      S1: 24436.90,
      S2: 24353.40,
      S3: 24266.60,
      ce_bep: 24665.60,
      pe_bep: 24387.60,
      sf_ce: 24636.40,
      sf_pe: 24412.25,
      sf_r1_ce: 24679.80
    },
    history: {
      prev_high: 24610.50,
      prev_low: 24440.20,
      prev_close: 24520.40,
      prev_ce_high: 182.50,
      prev_ce_low: 85.00,
      prev_pe_high: 164.00,
      prev_pe_low: 72.00
    },
    signal: 'WAIT',
    countdown_to_315: '01:15:00',
    position: null,
    entry: 0.0,
    ltp: 0.0,
    pnl: 0.0,
    sl: 0.0,
    trailing_sl: 0.0,
    ce_chart: [],
    pe_chart: [],
    logs: [],
    table_rows: [],
    daily_pnl: 0.0,
    trades_today: 0
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // 1. Fetch Vino Status via REST
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/vino/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.warn('Error fetching vino status:', err);
    }
  };

  // 2. Setup WebSocket /ws/vino + 1s interval polling fallback
  useEffect(() => {
    fetchStatus();

    let ws = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/vino`;
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStatus(data);
        } catch (e) {}
      };
    } catch (e) {}

    const interval = setInterval(fetchStatus, 1500);

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, [symbol]);

  // 3. Start Vino Algo
  const handleStart = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/vino/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          lots: parseInt(lots),
          sl: parseFloat(slPoints),
          trailing_start: parseFloat(trailingStart),
          trailing_step: parseFloat(trailingStep)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`✅ ${data.message}`);
        fetchStatus();
      } else {
        setMsg(`❌ ${data.detail || 'Could not start Vino Algo.'}`);
      }
    } catch (err) {
      setMsg(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 4. Stop Vino Algo
  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vino/stop', { method: 'POST' });
      const data = await res.json();
      setMsg(data.message);
      fetchStatus();
    } catch (err) {
      setMsg('Error stopping algo.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Emergency Square Off All
  const handleEmergencySquareOff = async () => {
    if (!confirm('🚨 EMERGENCY STOP: Square off ALL open positions immediately at market?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/squareoff/all', { method: 'POST' });
      const data = await res.json();
      setMsg(`Square off: ${data.message}`);
      fetchStatus();
    } catch (err) {
      setMsg('Square off error.');
    } finally {
      setLoading(false);
    }
  };

  // SVG Chart Helper for Drawing Premium Line and Horizontal Overlays
  const renderPremiumChart = (data = [], title, isCall, overlays = {}) => {
    const width = 500;
    const height = 220;
    const padding = 30;

    if (!data || data.length === 0) {
      return (
        <div className="h-[220px] flex items-center justify-center text-slate-500 text-xs font-mono">
          Collecting live ticks for {title}...
        </div>
      );
    }

    const prices = data.map((d) => d.ltp);
    const minP = Math.min(...prices) * 0.95;
    const maxP = Math.max(...prices) * 1.05;
    const range = maxP - minP || 1;

    // Generate Path Points
    const points = data.map((d, idx) => {
      const x = padding + (idx / Math.max(1, data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.ltp - minP) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const lastPrice = prices[prices.length - 1];

    return (
      <div className="relative bg-slate-950/80 rounded-xl p-3 border border-slate-800">
        <div className="flex justify-between items-center mb-2 px-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <span className={`w-2.5 h-2.5 rounded-full ${isCall ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="text-white">{title}</span>
          </div>
          <div className="font-mono font-extrabold text-sm text-white">
            ₹ {Number(lastPrice).toFixed(2)}
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Subtle horizontal grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1e293b" strokeDasharray="3 3" />

          {/* Overlays */}
          {/* SF Safe Buy (Blue Dotted) */}
          <line x1={padding} y1={height * 0.45} x2={width - padding} y2={height * 0.45} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={padding + 5} y={height * 0.45 - 4} fill="#60a5fa" fontSize="9" fontFamily="monospace">SF Safe Buy</text>

          {/* Prev Day High (Orange Dashed) */}
          <line x1={padding} y1={height * 0.25} x2={width - padding} y2={height * 0.25} stroke="#f97316" strokeWidth="1.2" strokeDasharray="5 3" />
          <text x={width - padding - 85} y={height * 0.25 - 4} fill="#fb923c" fontSize="9" fontFamily="monospace">Prev Day High</text>

          {/* BEP (Yellow Dashed) */}
          <line x1={padding} y1={height * 0.65} x2={width - padding} y2={height * 0.65} stroke="#eab308" strokeWidth="1.2" strokeDasharray="4 4" />
          <text x={padding + 5} y={height * 0.65 + 10} fill="#facc15" fontSize="9" fontFamily="monospace">BEP Level</text>

          {/* Main Price Line */}
          <polyline
            fill="none"
            stroke={isCall ? '#10b981' : '#f43f5e'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Pulse marker at latest tick */}
          {data.length > 0 && (
            <circle
              cx={width - padding}
              cy={height - padding - ((lastPrice - minP) / range) * (height - padding * 2)}
              r="4.5"
              fill={isCall ? '#10b981' : '#f43f5e'}
              className="animate-ping"
            />
          )}
        </svg>

        {/* Legend Overlay Info */}
        <div className="flex justify-between items-center mt-2 px-1 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-blue-500" /> SF Main Buy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-400" /> BEP
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-orange-500" /> Prev Day H/L
          </span>
        </div>
      </div>
    );
  };

  const lvl = status.levels || {};
  const hist = status.history || {};
  const isPos = Boolean(status.position);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 py-6 space-y-6">

      {/* Top Info & Control Bar */}
      <div className="glass-panel p-5 space-y-4">
        
        {/* Title, Countdown Timer, Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/20">
              🐘
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">Vino Algo Pro 🐘</h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase">
                  Dual Chart Power
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 ${
                  status.is_running
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${status.is_running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  {status.is_running ? 'ALGO RUNNING' : 'IDLE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pivot Math • BEP & Safe Breakout (SF) • Fixed 10pt SL • Trailing SL (+30pt step 10pt) • 3:15 PM Auto-Cutoff
              </p>
            </div>
          </div>

          {/* Countdown & Emergency Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            
            {/* 3:15 PM Cutoff Countdown */}
            <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-mono">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-slate-400">Auto Close 3:15 PM in:</span>
              <span className="text-amber-300 font-extrabold">{status.countdown_to_315}</span>
            </div>

            {/* Run / Stop Button */}
            {!status.is_running ? (
              <button
                onClick={handleStart}
                disabled={loading}
                className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 !py-2.5 !px-5 text-xs font-bold"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Algo</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                disabled={loading}
                className="bg-amber-600/20 text-amber-300 border border-amber-600/40 hover:bg-amber-600/30 py-2.5 px-5 rounded-lg text-xs font-bold flex items-center gap-2 transition"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Algo</span>
              </button>
            )}

            {/* Emergency Square Off */}
            <button
              onClick={handleEmergencySquareOff}
              disabled={loading}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center gap-1.5 transition shadow-lg shadow-rose-600/30"
              title="Square off all open positions immediately"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Square Off All</span>
            </button>
          </div>
        </div>

        {/* Action Alert */}
        {msg && (
          <div className="text-xs p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium">
            {msg}
          </div>
        )}

        {/* Top Info Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-xs">
          
          {/* Symbol Selector */}
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Symbol</span>
            <select
              disabled={status.is_running}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-transparent text-white font-bold font-sans text-xs outline-none cursor-pointer mt-0.5"
            >
              {allSymbols.map((s) => (
                <option key={s} value={s} className="bg-slate-900">{s}</option>
              ))}
            </select>
          </div>

          {/* Spot LTP */}
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Spot Price</span>
            <div className="text-white font-extrabold text-sm mt-0.5">
              ₹ {Number(status.spot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* ATM Strike */}
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold">ATM Strike</span>
            <div className="text-emerald-300 font-extrabold text-sm mt-0.5">
              {status.atm}
            </div>
          </div>

          {/* CE LTP */}
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">ATM CE LTP</span>
            <div className="text-emerald-400 font-extrabold text-sm mt-0.5">
              ₹ {Number(status.ce_ltp).toFixed(2)}
            </div>
          </div>

          {/* PE LTP */}
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">ATM PE LTP</span>
            <div className="text-rose-400 font-extrabold text-sm mt-0.5">
              ₹ {Number(status.pe_ltp).toFixed(2)}
            </div>
          </div>

          {/* CE BEP */}
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl" title="Break Even: Spot + CE LTP">
            <span className="text-[10px] text-amber-400 uppercase font-sans font-semibold">CE BEP</span>
            <div className="text-amber-300 font-extrabold text-sm mt-0.5">
              {lvl.ce_bep || '--'}
            </div>
          </div>

          {/* PE BEP */}
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl" title="Break Even: Spot - PE LTP">
            <span className="text-[10px] text-amber-400 uppercase font-sans font-semibold">PE BEP</span>
            <div className="text-amber-300 font-extrabold text-sm mt-0.5">
              {lvl.pe_bep || '--'}
            </div>
          </div>

          {/* Live Signal */}
          <div className={`p-2.5 rounded-xl border flex flex-col justify-center text-center ${
            status.signal.includes('CE BUY')
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
              : status.signal.includes('PE BUY')
              ? 'bg-rose-500/15 border-rose-500 text-rose-400'
              : status.signal.includes('ACTIVE')
              ? 'bg-blue-500/15 border-blue-500 text-blue-400'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            <span className="text-[9px] uppercase font-sans font-bold">Signal</span>
            <div className="font-extrabold text-xs truncate mt-0.5">{status.signal}</div>
          </div>

        </div>

        {/* Pivot Math Strip: P, R1, R2, R3, S1, S2, S3, SF */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-sans font-bold text-[11px]">PIVOTS:</span>
            <span className="text-white">P: <strong>{lvl.P}</strong></span>
            <span className="text-emerald-400">R1: <strong>{lvl.R1}</strong></span>
            <span className="text-emerald-400">R2: <strong>{lvl.R2}</strong></span>
            <span className="text-emerald-400">R3: <strong>{lvl.R3}</strong></span>
            <span className="text-rose-400">S1: <strong>{lvl.S1}</strong></span>
            <span className="text-rose-400">S2: <strong>{lvl.S2}</strong></span>
            <span className="text-rose-400">S3: <strong>{lvl.S3}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-blue-400 font-bold" title="Safe Breakout: (CE BEP + R1) / 2">
              SF CE: {lvl.sf_ce}
            </span>
            <span className="text-blue-400 font-bold" title="Safe Breakout: (PE BEP + S1) / 2">
              SF PE: {lvl.sf_pe}
            </span>
            <span className="text-slate-400 text-[11px]">
              Prev H: {hist.prev_high} | Prev L: {hist.prev_low}
            </span>
          </div>
        </div>

      </div>

      {/* D. DUAL CHART UI (LEFT: CE PREMIUM, RIGHT: PE PREMIUM) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: CE Premium Chart */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white uppercase tracking-wider">
                {symbol} ATM CALL (CE) PREMIUM CHART
              </h3>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">1-Min LTP Stream</span>
          </div>
          {renderPremiumChart(status.ce_chart, `${symbol} ${status.atm} CE`, true)}
        </div>

        {/* Right: PE Premium Chart */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-white uppercase tracking-wider">
                {symbol} ATM PUT (PE) PREMIUM CHART
              </h3>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">1-Min LTP Stream</span>
          </div>
          {renderPremiumChart(status.pe_chart, `${symbol} ${status.atm} PE`, false)}
        </div>

      </div>

      {/* Active Position Live Status Card (if running) */}
      {isPos && (
        <div className="glass-panel p-5 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/40 border-blue-500/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500 text-slate-950">
                  {status.position.buy_type}
                </span>
                <h3 className="text-base font-extrabold text-white font-mono">
                  {status.position.trading_symbol}
                </h3>
                <span className="text-xs text-slate-400">Qty: {status.position.qty}</span>
              </div>
              <div className="flex gap-4 text-xs font-mono text-slate-300 mt-2">
                <span>Entry: <strong>₹ {Number(status.position.entry_price).toFixed(2)}</strong></span>
                <span>Current LTP: <strong className="text-white">₹ {Number(status.position.current_ltp).toFixed(2)}</strong></span>
                <span>Fixed SL: <strong className="text-rose-400">₹ {Number(status.position.sl_price).toFixed(2)}</strong></span>
                <span>Target: <strong className="text-emerald-400">₹ {Number(status.position.target_price).toFixed(2)}</strong></span>
                {status.position.trailing_activated && (
                  <span className="text-purple-400 font-bold">Trailing SL Active!</span>
                )}
              </div>
            </div>

            <div className="text-right font-mono">
              <div className={`text-2xl font-extrabold ${status.position.pnl_rupees >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {status.position.pnl_rupees >= 0 ? '+' : ''}₹ {Number(status.position.pnl_rupees).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">
                ({status.position.pnl_points >= 0 ? '+' : ''}{Number(status.position.pnl_points).toFixed(2)} pts)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* F. POLISHED VINO ELEPHANT TABLE */}
      <VinoElephantTable rows={status.table_rows || []} />

    </div>
  );
}

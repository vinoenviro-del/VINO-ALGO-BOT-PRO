import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Zap, Maximize2, Minimize2 } from 'lucide-react';

export default function DualMomentumCandleChart({ 
  dualData, 
  height = 380, 
  isMaximized: propIsMaximized, 
  onToggleMaximize: propOnToggleMaximize 
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [activeMode, setActiveMode] = useState('MOMENTUM'); // 'MOMENTUM' | 'CE' | 'PE'
  const [internalMaximized, setInternalMaximized] = useState(false);

  const isMaximized = propIsMaximized !== undefined ? propIsMaximized : internalMaximized;
  const toggleMaximize = propOnToggleMaximize || (() => setInternalMaximized(prev => !prev));

  // Dynamic values based on ATM strike and Friday levels
  const strike = dualData?.strike || 23050;
  const ceBep = dualData?.bep?.ce_bep || (strike + 130.10);
  const peBep = dualData?.bep?.pe_bep || (strike - 130.10);
  const r1 = dualData?.pivots?.R1 || 23145.80;
  const p = dualData?.pivots?.P || 23025.40;
  const s1 = dualData?.pivots?.S1 || 22932.80;

  // Escape key to exit big screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMaximized) {
        toggleMaximize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized, toggleMaximize]);

  const effectiveHeight = isMaximized 
    ? (typeof window !== 'undefined' ? Math.max(window.innerHeight - 200, 520) : 580)
    : height;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    container.innerHTML = '';

    const width = container.clientWidth || 650;
    const chart = createChart(container, {
      width: width,
      height: effectiveHeight,
      layout: {
        background: { color: '#0a1931' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { color: '#1a2a4a' },
        horzLines: { color: '#1a2a4a' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1a2a4a',
      },
      rightPriceScale: {
        borderColor: '#1a2a4a',
      },
    });

    chartInstanceRef.current = chart;

    // 1. Add Candlestick Series
    const candleSeries = typeof chart.addCandlestickSeries === 'function'
      ? chart.addCandlestickSeries({
          upColor: '#00ff88',
          downColor: '#ff4444',
          borderVisible: false,
          wickUpColor: '#00ff88',
          wickDownColor: '#ff4444',
        })
      : chart.addSeries(CandlestickSeries, {
          upColor: '#00ff88',
          downColor: '#ff4444',
          borderVisible: false,
          wickUpColor: '#00ff88',
          wickDownColor: '#ff4444',
        });

    // Determine which candles to display based on activeMode
    let candlesToDisplay = [];
    if (activeMode === 'CE' && dualData?.ce_candles) {
      candlesToDisplay = dualData.ce_candles;
    } else if (activeMode === 'PE' && dualData?.pe_candles) {
      candlesToDisplay = dualData.pe_candles;
    } else if (dualData?.momentum_candles) {
      candlesToDisplay = dualData.momentum_candles;
    } else if (Array.isArray(dualData?.candles)) {
      candlesToDisplay = dualData.candles;
    }

    if (candlesToDisplay && candlesToDisplay.length > 0) {
      // Ensure sorted by time ascending and unique timestamps
      const formatted = candlesToDisplay.map((item, idx) => {
        let ts = item.time;
        if (typeof ts === 'string' && ts.includes(':')) {
          const [hh, mm] = ts.split(':').map(Number);
          const now = new Date();
          const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh || 9, mm || 15, 0);
          ts = Math.floor(dt.getTime() / 1000) + (idx * 60);
        } else if (typeof ts === 'number' && ts > 1e11) {
          ts = Math.floor(ts / 1000);
        }
        return {
          time: ts,
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close),
        };
      });

      formatted.sort((a, b) => a.time - b.time);
      const uniqueCandles = [];
      let prevTs = null;
      for (const c of formatted) {
        if (c.time !== prevTs) {
          uniqueCandles.push(c);
          prevTs = c.time;
        }
      }

      candleSeries.setData(uniqueCandles);
      chart.timeScale().fitContent();

      // Set Signal Markers (BUY_CE, BUY_PE)
      if (dualData?.markers && Array.isArray(dualData.markers) && dualData.markers.length > 0) {
        try {
          const sortedMarkers = dualData.markers
            .map((m) => {
              let mTs = m.time;
              if (typeof mTs === 'string' && mTs.includes(':')) {
                const [hh, mm] = mTs.split(':').map(Number);
                const now = new Date();
                mTs = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0).getTime() / 1000);
              } else if (typeof mTs === 'number' && mTs > 1e11) {
                mTs = Math.floor(mTs / 1000);
              }
              return {
                time: mTs,
                position: m.position || (m.type === 'BUY_PE' ? 'aboveBar' : 'belowBar'),
                color: m.color || (m.type === 'BUY_PE' ? '#ef4444' : '#00ff88'),
                shape: m.shape || (m.type === 'BUY_PE' ? 'arrowDown' : 'arrowUp'),
                text: m.text || m.label || (m.type === 'BUY_PE' ? 'BUY_PE' : 'BUY_CE'),
              };
            })
            .sort((a, b) => a.time - b.time);

          if (typeof candleSeries.setMarkers === 'function') {
            candleSeries.setMarkers(sortedMarkers);
          }
        } catch (err) {
          console.warn('Marker setup warning:', err);
        }
      }
    }

    // 2. Add Horizontal BEP & Pivot Reference Lines
    const priceLines = [
      { price: ceBep, color: '#eab308', title: `CE BEP (${Math.round(ceBep).toLocaleString('en-IN')})` },
      { price: peBep, color: '#f97316', title: `PE BEP (${Math.round(peBep).toLocaleString('en-IN')})` },
      { price: r1, color: '#ef4444', title: 'R1' },
      { price: p, color: '#94a3b8', title: 'P' },
      { price: s1, color: '#22c55e', title: 'S1' },
    ];

    // Only draw spot BEP / Pivot lines when in MOMENTUM mode (since option prices have different scale ~100-200)
    if (activeMode === 'MOMENTUM') {
      priceLines.forEach((lvl) => {
        candleSeries.createPriceLine({
          price: lvl.price,
          color: lvl.color,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: lvl.title,
        });
      });
    } else {
      // In CE/PE mode, show entry / target / SL lines
      if (activeMode === 'CE') {
        candleSeries.createPriceLine({ price: 145.20, color: '#00ff88', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'ENTRY: 145.20' });
        candleSeries.createPriceLine({ price: 175.20, color: '#22c55e', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'TARGET: 175.20' });
        candleSeries.createPriceLine({ price: 125.00, color: '#ef4444', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'SL: 125.00' });
      } else if (activeMode === 'PE') {
        candleSeries.createPriceLine({ price: 132.80, color: '#f97316', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'ENTRY: 132.80' });
        candleSeries.createPriceLine({ price: 122.80, color: '#ef4444', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'EXIT: 122.80' });
      }
    }

    // 3. Responsive resize
    const handleResize = () => {
      if (chart && container) {
        chart.applyOptions({ width: container.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [dualData, activeMode, effectiveHeight]);

  return (
    <div className={`flex flex-col w-full transition-all duration-200 ${
      isMaximized 
        ? 'fixed inset-0 z-50 bg-[#071022]/98 p-4 md:p-6 backdrop-blur-xl flex flex-col overflow-y-auto' 
        : 'bg-[#1e293b]/90 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-md'
    }`}>
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/10 mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            DUAL MOMENTUM CANDLESTICK (5-MIN)
          </h3>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
            ATM STRIKE: {dualData?.strike || strike || 23050}
          </span>
          {isMaximized && (
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
              BIG SCREEN MODE (Press ESC to exit)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-[#0a1931] p-1 rounded-md border border-white/10 text-[11px] font-mono">
            <button
              onClick={() => setActiveMode('MOMENTUM')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                activeMode === 'MOMENTUM'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-yellow-400" />
              <span>DUAL MOMENTUM</span>
            </button>

            <button
              onClick={() => setActiveMode('CE')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                activeMode === 'CE'
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'text-gray-400 hover:text-emerald-300'
              }`}
            >
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              <span>{strike} CE CANDLES</span>
            </button>

            <button
              onClick={() => setActiveMode('PE')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                activeMode === 'PE'
                  ? 'bg-rose-600 text-white font-bold shadow'
                  : 'text-gray-400 hover:text-rose-300'
              }`}
            >
              <ArrowDownRight className="w-3 h-3 text-rose-400" />
              <span>{strike} PE CANDLES</span>
            </button>
          </div>

          {/* Min / Max Big Screen Button */}
          <button
            onClick={toggleMaximize}
            className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold border border-white/15 shadow-sm"
            title={isMaximized ? "Minimize / Normal Screen (Esc)" : "Maximize / Big Screen View"}
          >
            {isMaximized ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline text-[11px]">Minimize</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline text-[11px]">Big Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Legend & Channel Status Bar */}
      <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-300 mb-2 px-1">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#00ff88]" />
            <span className="text-emerald-400 font-semibold">Bullish Candle (CE Cross)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ff4444]" />
            <span className="text-rose-400 font-semibold">Bearish Candle (PE Cross)</span>
          </div>
          <div className="flex items-center gap-1 text-yellow-300">
            <span className="border-b border-dashed border-yellow-400 w-3 inline-block" />
            <span>CE BEP: {Number(ceBep).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400">
            <span className="border-b border-dashed border-orange-400 w-3 inline-block" />
            <span>PE BEP: {Number(peBep).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Signals summary badge */}
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
            09:21 BUY_CE (HIT)
          </span>
          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold">
            10:45 BUY_PE (SL)
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
            13:12 BUY_CE (HIT)
          </span>
        </div>
      </div>

      {/* Lightweight Candlestick Chart Container */}
      <div
        ref={chartContainerRef}
        className="w-full rounded overflow-hidden"
        style={{ height: `${effectiveHeight}px`, width: '100%', minHeight: `${effectiveHeight}px` }}
      />
    </div>
  );
}

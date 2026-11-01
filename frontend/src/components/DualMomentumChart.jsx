import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { Maximize2, Minimize2, TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function DualMomentumChart({ 
  ceData = [], 
  peData = [], 
  strike = 23050, 
  commonBep = {}, 
  markers = [],
  levels = null,
  isMaximized: propIsMaximized, 
  onToggleMaximize: propOnToggleMaximize 
}) {
  const ceRef = useRef();
  const peRef = useRef();
  const [internalMaximized, setInternalMaximized] = useState(false);
  const [viewFilter, setViewFilter] = useState('BOTH'); // 'BOTH' | 'CE' | 'PE'

  const isMaximized = propIsMaximized !== undefined ? propIsMaximized : internalMaximized;
  const toggleMaximize = propOnToggleMaximize || (() => setInternalMaximized(prev => !prev));

  // Resolve V3 Common BEP & Pivot Levels (same for both CE and PE charts)
  const resolvedLevels = React.useMemo(() => {
    let lvl = levels || commonBep?.levels || commonBep?.ce_chart_levels;
    if (lvl && (lvl.BEP || lvl.bep)) {
      return {
        BEP: lvl.BEP ?? lvl.bep ?? 135.10,
        R1: lvl.R1 ?? (lvl.BEP + 15),
        R2: lvl.R2 ?? (lvl.BEP + 30),
        R3: lvl.R3 ?? (lvl.BEP + 45),
        S1: lvl.S1 ?? (lvl.BEP - 15),
        S2: lvl.S2 ?? (lvl.BEP - 30),
        S3: lvl.S3 ?? (lvl.BEP - 45),
      };
    }

    const ceH = Number(commonBep?.ce_high || commonBep?.ce_pdh || 175.20);
    const peL = Number(commonBep?.pe_low || commonBep?.pe_pdl || 95.00);
    const peH = Number(commonBep?.pe_high || commonBep?.pe_pdh || 132.89);
    const ceL = Number(commonBep?.ce_low || commonBep?.ce_pdl || 110.00);

    let bepVal = 135.10;
    if (ceH > peH) {
      bepVal = (ceH + peL) / 2;
    } else if (peH > ceH) {
      bepVal = (peH + ceL) / 2;
    } else {
      bepVal = (ceH + peL) / 2;
    }
    bepVal = Math.round(bepVal * 100) / 100;
    const offset = 15;
    return {
      BEP: bepVal,
      R1: Math.round((bepVal + offset) * 100) / 100,
      R2: Math.round((bepVal + offset * 2) * 100) / 100,
      R3: Math.round((bepVal + offset * 3) * 100) / 100,
      S1: Math.round((bepVal - offset) * 100) / 100,
      S2: Math.round((bepVal - offset * 2) * 100) / 100,
      S3: Math.round((bepVal - offset * 3) * 100) / 100,
    };
  }, [levels, commonBep]);

  // Escape key listener for fullscreen
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
    ? (typeof window !== 'undefined' ? Math.max(window.innerHeight - 200, 480) : 520)
    : 280;

  useEffect(() => {
    let ceChart = null;
    let peChart = null;
    let resizeObserver = null;

    // Helper to format candles for lightweight-charts
    const formatCandles = (data) => {
      if (!Array.isArray(data) || data.length === 0) return [];
      const today = new Date();
      const baseYear = today.getFullYear();
      const baseMonth = today.getMonth();
      const baseDate = today.getDate();

      const items = data.map((d, idx) => {
        let ts = d.time;
        if (typeof ts === 'string' && ts.includes(':')) {
          const [hh, mm] = ts.split(':').map(Number);
          ts = Math.floor(new Date(baseYear, baseMonth, baseDate, hh || 9, mm || 15, 0).getTime() / 1000) + (idx * 60);
        } else if (typeof ts === 'number' && ts > 1e11) {
          ts = Math.floor(ts / 1000);
        } else if (!ts) {
          ts = Math.floor(Date.now() / 1000) - ((data.length - idx) * 300);
        }
        return {
          time: ts,
          open: Number(d.open ?? d.close ?? 140),
          high: Number(d.high ?? 150),
          low: Number(d.low ?? 130),
          close: Number(d.close ?? 145)
        };
      });

      items.sort((a, b) => a.time - b.time);
      const unique = [];
      let lastTime = null;
      for (const item of items) {
        if (item.time !== lastTime) {
          unique.push(item);
          lastTime = item.time;
        }
      }
      return unique;
    };

    const formattedCe = formatCandles(ceData);
    const formattedPe = formatCandles(peData);

    // Format crossover markers helper
    const getFormattedMarkers = (typeFilter) => {
      if (!Array.isArray(markers) || markers.length === 0) return [];
      const today = new Date();
      return markers
        .filter(m => !typeFilter || m.type === typeFilter)
        .map(m => {
          let mTs = m.time;
          if (typeof mTs === 'string' && mTs.includes(':')) {
            const [hh, mm] = mTs.split(':').map(Number);
            mTs = Math.floor(new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm, 0).getTime() / 1000);
          } else if (typeof mTs === 'number' && mTs > 1e11) {
            mTs = Math.floor(mTs / 1000);
          }
          const isCe = m.type === 'BUY_CE';
          return {
            time: mTs,
            position: m.position || (isCe ? 'belowBar' : 'aboveBar'),
            color: m.color || (isCe ? '#00ff88' : '#ff4444'),
            shape: m.shape || (isCe ? 'arrowUp' : 'arrowDown'),
            text: m.text || m.label || (isCe ? 'BUY_CE' : 'BUY_PE'),
          };
        })
        .sort((a, b) => a.time - b.time);
    };

    // Helper to draw V3 Common BEP & Pivot Levels (same on both CE and PE charts)
    const applyV3PriceLines = (series, isCe) => {
      if (!series || typeof series.createPriceLine !== 'function') return;

      // 1. BEP Line (Bold Gold / Yellow - Exact Common BEP from V3 Engine)
      if (resolvedLevels.BEP) {
        series.createPriceLine({
          price: Number(resolvedLevels.BEP),
          color: '#FFD700',
          lineWidth: 2,
          lineStyle: 0, // Solid line
          axisLabelVisible: true,
          title: `BEP: ₹${Number(resolvedLevels.BEP).toFixed(2)}`
        });
      }

      // 2. Resistance Levels (R1, R2, R3 - Red/Coral)
      if (resolvedLevels.R1) {
        series.createPriceLine({
          price: Number(resolvedLevels.R1),
          color: '#f87171',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `R1: ₹${Number(resolvedLevels.R1).toFixed(2)}`
        });
      }
      if (resolvedLevels.R2) {
        series.createPriceLine({
          price: Number(resolvedLevels.R2),
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `R2: ₹${Number(resolvedLevels.R2).toFixed(2)}`
        });
      }
      if (resolvedLevels.R3) {
        series.createPriceLine({
          price: Number(resolvedLevels.R3),
          color: '#dc2626',
          lineWidth: 2,
          lineStyle: 1, // Dotted
          axisLabelVisible: true,
          title: `R3: ₹${Number(resolvedLevels.R3).toFixed(2)}`
        });
      }

      // 3. Support Levels (S1, S2, S3 - Emerald/Green)
      if (resolvedLevels.S1) {
        series.createPriceLine({
          price: Number(resolvedLevels.S1),
          color: '#34d399',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `S1: ₹${Number(resolvedLevels.S1).toFixed(2)}`
        });
      }
      if (resolvedLevels.S2) {
        series.createPriceLine({
          price: Number(resolvedLevels.S2),
          color: '#10b981',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `S2: ₹${Number(resolvedLevels.S2).toFixed(2)}`
        });
      }
      if (resolvedLevels.S3) {
        series.createPriceLine({
          price: Number(resolvedLevels.S3),
          color: '#059669',
          lineWidth: 2,
          lineStyle: 1,
          axisLabelVisible: true,
          title: `S3: ₹${Number(resolvedLevels.S3).toFixed(2)}`
        });
      }

      // 4. Subtle High/Low reference line
      const highVal = isCe ? commonBep?.ce_high : commonBep?.pe_high;
      const lowVal = isCe ? commonBep?.ce_low : commonBep?.pe_low;
      if (highVal) {
        series.createPriceLine({
          price: Number(highVal),
          color: isCe ? '#059669' : '#e11d48',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: false,
          title: `${isCe ? 'CE' : 'PE'} HIGH: ₹${highVal}`
        });
      }
      if (lowVal) {
        series.createPriceLine({
          price: Number(lowVal),
          color: isCe ? '#047857' : '#be123c',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: false,
          title: `${isCe ? 'CE' : 'PE'} LOW: ₹${lowVal}`
        });
      }
    };

    // --- 1. RENDER CE CHART ---
    if (ceRef.current && (viewFilter === 'BOTH' || viewFilter === 'CE')) {
      ceRef.current.innerHTML = '';
      ceChart = createChart(ceRef.current, {
        width: ceRef.current.clientWidth || 320,
        height: effectiveHeight,
        layout: { background: { color: '#0a1931' }, textColor: '#d1d4dc' },
        grid: { vertLines: { color: '#1a2a4a' }, horzLines: { color: '#1a2a4a' } },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#1a2a4a' },
        rightPriceScale: { borderColor: '#1a2a4a' }
      });

      const ceOptions = {
        upColor: '#00ff88', borderUpColor: '#00ff88', wickUpColor: '#00ff88',
        downColor: '#ff4444', borderDownColor: '#ff4444', wickDownColor: '#ff4444',
      };
      const ceSeries = typeof ceChart.addCandlestickSeries === 'function'
        ? ceChart.addCandlestickSeries(ceOptions)
        : ceChart.addSeries(CandlestickSeries, ceOptions);

      if (formattedCe.length > 0) {
        ceSeries.setData(formattedCe);
        const lastCe = formattedCe[formattedCe.length - 1];
        
        // CE LTP Line
        ceSeries.createPriceLine({
          price: lastCe.close,
          color: '#00ff88',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `LTP: ₹${lastCe.close.toFixed(2)}`
        });

        // Apply V3 Common BEP & Pivot Levels (Gold BEP, R1-R3, S1-S3)
        applyV3PriceLines(ceSeries, true);

        // Add BUY_CE crossover markers
        const ceMarkers = getFormattedMarkers('BUY_CE');
        if (ceMarkers.length > 0 && typeof ceSeries.setMarkers === 'function') {
          try {
            ceSeries.setMarkers(ceMarkers);
          } catch (e) {
            console.warn('CE Marker set error', e);
          }
        }

        ceChart.timeScale().fitContent();
      }
    }

    // --- 2. RENDER PE CHART ---
    if (peRef.current && (viewFilter === 'BOTH' || viewFilter === 'PE')) {
      peRef.current.innerHTML = '';
      peChart = createChart(peRef.current, {
        width: peRef.current.clientWidth || 320,
        height: effectiveHeight,
        layout: { background: { color: '#0a1931' }, textColor: '#d1d4dc' },
        grid: { vertLines: { color: '#1a2a4a' }, horzLines: { color: '#1a2a4a' } },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#1a2a4a' },
        rightPriceScale: { borderColor: '#1a2a4a' }
      });

      const peOptions = {
        upColor: '#00ff88', borderUpColor: '#00ff88', wickUpColor: '#00ff88',
        downColor: '#ff4444', borderDownColor: '#ff4444', wickDownColor: '#ff4444',
      };
      const peSeries = typeof peChart.addCandlestickSeries === 'function'
        ? peChart.addCandlestickSeries(peOptions)
        : peChart.addSeries(CandlestickSeries, peOptions);

      if (formattedPe.length > 0) {
        peSeries.setData(formattedPe);
        const lastPe = formattedPe[formattedPe.length - 1];

        // PE LTP Line
        peSeries.createPriceLine({
          price: lastPe.close,
          color: '#ff4444',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `LTP: ₹${lastPe.close.toFixed(2)}`
        });

        // Apply V3 Common BEP & Pivot Levels (Gold BEP, R1-R3, S1-S3)
        applyV3PriceLines(peSeries, false);

        // Add BUY_PE crossover markers
        const peMarkers = getFormattedMarkers('BUY_PE');
        if (peMarkers.length > 0 && typeof peSeries.setMarkers === 'function') {
          try {
            peSeries.setMarkers(peMarkers);
          } catch (e) {
            console.warn('PE Marker set error', e);
          }
        }

        peChart.timeScale().fitContent();
      }
    }

    // Resize observer
    const handleResize = () => {
      if (ceChart && ceRef.current) {
        ceChart.applyOptions({ width: ceRef.current.clientWidth });
      }
      if (peChart && peRef.current) {
        peChart.applyOptions({ width: peRef.current.clientWidth });
      }
    };

    resizeObserver = new ResizeObserver(() => handleResize());
    if (ceRef.current) resizeObserver.observe(ceRef.current);
    if (peRef.current) resizeObserver.observe(peRef.current);

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (ceChart) ceChart.remove();
      if (peChart) peChart.remove();
    };

  }, [ceData, peData, viewFilter, effectiveHeight, commonBep, markers, resolvedLevels]);

  // Latest prices for header
  const latestCe = Array.isArray(ceData) && ceData.length > 0 ? (ceData[ceData.length - 1]?.close || 135.44) : 135.44;
  const latestPe = Array.isArray(peData) && peData.length > 0 ? (peData[peData.length - 1]?.close || 214.28) : 214.28;

  return (
    <div className={`transition-all duration-200 ${
      isMaximized 
        ? 'fixed inset-0 z-50 bg-[#071022]/98 p-4 md:p-6 backdrop-blur-xl flex flex-col overflow-y-auto' 
        : 'bg-[#0f172a]/90 border border-white/10 rounded-lg p-3 shadow-lg'
    }`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>DUAL MOMENTUM 5-MIN CANDLESTICK CHARTS</span>
          </h3>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
            ATM: {strike}
          </span>
          {isMaximized && (
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
              BIG SCREEN (ESC to exit)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Filter Switcher */}
          <div className="flex items-center gap-1 bg-[#0a1931] p-1 rounded-md border border-white/10 text-[11px] font-mono">
            <button
              onClick={() => setViewFilter('BOTH')}
              className={`px-2 py-0.5 rounded transition ${
                viewFilter === 'BOTH' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              SIDE-BY-SIDE
            </button>
            <button
              onClick={() => setViewFilter('CE')}
              className={`px-2 py-0.5 rounded transition ${
                viewFilter === 'CE' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              CE ONLY
            </button>
            <button
              onClick={() => setViewFilter('PE')}
              className={`px-2 py-0.5 rounded transition ${
                viewFilter === 'PE' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              PE ONLY
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

      {/* Side-by-Side Candlestick Cards */}
      <div className={`grid gap-3 w-full ${
        viewFilter === 'BOTH' 
          ? 'grid-cols-1 lg:grid-cols-2' 
          : 'grid-cols-1'
      } ${isMaximized ? 'flex-1' : ''}`}>
        
        {/* CE Chart Card */}
        {(viewFilter === 'BOTH' || viewFilter === 'CE') && (
          <div className="bg-[#0a1931] rounded-lg p-2.5 border border-emerald-500/30 flex flex-col shadow-inner">
            <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-xs font-bold text-emerald-400 tracking-wide font-mono">
                  📈 CE - {strike} CANDLE - 5 MIN
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  LTP: ₹{Number(latestCe).toFixed(2)}
                </span>
                {commonBep?.ce_high && (
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    H: {commonBep.ce_high} | L: {commonBep.ce_low}
                  </span>
                )}
              </div>
            </div>

            {/* Common BEP & Pivot Levels Ribbon */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono py-1 px-2 bg-[#061122] rounded border border-white/10 mb-2">
              <span className="text-yellow-400 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                BEP: ₹{resolvedLevels.BEP}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-400 font-semibold">R1: ₹{resolvedLevels.R1}</span>
              <span className="text-rose-400 font-semibold">R2: ₹{resolvedLevels.R2}</span>
              <span className="text-rose-300 font-bold">R3: ₹{resolvedLevels.R3}</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-semibold">S1: ₹{resolvedLevels.S1}</span>
              <span className="text-emerald-400 font-semibold">S2: ₹{resolvedLevels.S2}</span>
              <span className="text-emerald-300 font-bold">S3: ₹{resolvedLevels.S3}</span>
            </div>

            <div ref={ceRef} style={{ width: '100%', height: `${effectiveHeight}px` }} />
          </div>
        )}

        {/* PE Chart Card */}
        {(viewFilter === 'BOTH' || viewFilter === 'PE') && (
          <div className="bg-[#0a1931] rounded-lg p-2.5 border border-rose-500/30 flex flex-col shadow-inner">
            <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                <h4 className="text-xs font-bold text-rose-400 tracking-wide font-mono">
                  📉 PE - {strike} CANDLE - 5 MIN
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                  LTP: ₹{Number(latestPe).toFixed(2)}
                </span>
                {commonBep?.pe_high && (
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    H: {commonBep.pe_high} | L: {commonBep.pe_low}
                  </span>
                )}
              </div>
            </div>

            {/* Common BEP & Pivot Levels Ribbon */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono py-1 px-2 bg-[#061122] rounded border border-white/10 mb-2">
              <span className="text-yellow-400 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                BEP: ₹{resolvedLevels.BEP}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-400 font-semibold">R1: ₹{resolvedLevels.R1}</span>
              <span className="text-rose-400 font-semibold">R2: ₹{resolvedLevels.R2}</span>
              <span className="text-rose-300 font-bold">R3: ₹{resolvedLevels.R3}</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-semibold">S1: ₹{resolvedLevels.S1}</span>
              <span className="text-emerald-400 font-semibold">S2: ₹{resolvedLevels.S2}</span>
              <span className="text-emerald-300 font-bold">S3: ₹{resolvedLevels.S3}</span>
            </div>

            <div ref={peRef} style={{ width: '100%', height: `${effectiveHeight}px` }} />
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" /> BUY_CE Markers (Green Arrows)
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <ArrowDownRight className="w-3.5 h-3.5" /> BUY_PE Markers (Red Arrows)
          </span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Lightweight-Charts • 5-Min Dual Momentum Straddle
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';

export default function NiftySpotChart({ spotData, pivotLevels, height = 280, algoLevels = null }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    // Clear any previous canvas/elements
    container.innerHTML = '';

    const width = container.clientWidth || 550;

    const chart = createChart(container, {
      width: width,
      height: height,
      layout: { 
        background: { color: '#0a1931' }, 
        textColor: '#ffffff' 
      },
      grid: { 
        vertLines: { color: '#1a2a4a' }, 
        horzLines: { color: '#1a2a4a' } 
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1a2a4a'
      },
      rightPriceScale: {
        borderColor: '#1a2a4a'
      }
    });

    chartInstanceRef.current = chart;

    // Use addSeries(CandlestickSeries) or fallback to addCandlestickSeries for lightweight-charts compatibility
    const candleSeries = typeof chart.addCandlestickSeries === 'function'
      ? chart.addCandlestickSeries({
          upColor: '#00ff88',
          downColor: '#ff4444',
          borderVisible: false,
          wickUpColor: '#00ff88',
          wickDownColor: '#ff4444'
        })
      : chart.addSeries(CandlestickSeries, {
          upColor: '#00ff88',
          downColor: '#ff4444',
          borderVisible: false,
          wickUpColor: '#00ff88',
          wickDownColor: '#ff4444'
        });

    // Format spotData to match lightweight-charts expectations
    if (Array.isArray(spotData) && spotData.length > 0) {
      const today = new Date();
      const baseYear = today.getFullYear();
      const baseMonth = today.getMonth();
      const baseDay = today.getDate();

      const formattedData = spotData.map((item, index) => {
        let ts;
        if (typeof item.time === 'number') {
          // If already unix timestamp in seconds
          ts = item.time > 1e11 ? Math.floor(item.time / 1000) : Math.floor(item.time);
        } else if (typeof item.time === 'string' && item.time.includes(':')) {
          const [hh, mm] = item.time.split(':').map(Number);
          const dt = new Date(baseYear, baseMonth, baseDay, hh || 9, mm || 15, 0);
          ts = Math.floor(dt.getTime() / 1000) + (index * 60); // ensure monotonic
        } else {
          ts = Math.floor(Date.now() / 1000) - ((spotData.length - index) * 300);
        }

        const open = Number(item.open ?? item.spot ?? 23053.10);
        const high = Number(item.high ?? (open + 8));
        const low = Number(item.low ?? (open - 8));
        const close = Number(item.close ?? item.spot ?? open);

        return {
          time: ts,
          open,
          high,
          low,
          close
        };
      });

      // Sort by time ascending and remove duplicate timestamps
      formattedData.sort((a, b) => a.time - b.time);
      const uniqueData = [];
      let lastTs = null;
      for (const d of formattedData) {
        if (d.time !== lastTs) {
          uniqueData.push(d);
          lastTs = d.time;
        }
      }

      candleSeries.setData(uniqueData);
      chart.timeScale().fitContent();
    }

    // Exact Floor Pivot Levels Specified by User (Based on Friday Real Session H: 23118.10, L: 22905.10, C: 23053.10)
    const pivotLines = [
      { price: pivotLevels?.R3 ?? 23358.80, color: '#ff4444', title: 'R3' },
      { price: pivotLevels?.R2 ?? 23238.40, color: '#ff8844', title: 'R2' },
      { price: pivotLevels?.R1 ?? 23145.80, color: '#ffaa00', title: 'R1' },
      { price: pivotLevels?.PP ?? 23025.40, color: '#FFD700', title: 'PIVOT' },
      { price: pivotLevels?.S1 ?? 22932.80, color: '#00ff88', title: 'S1' },
      { price: pivotLevels?.S2 ?? 22812.40, color: '#00ff88', title: 'S2' },
      { price: pivotLevels?.S3 ?? 22719.80, color: '#00ff88', title: 'S3' },
    ];

    pivotLines.forEach(l => {
      candleSeries.createPriceLine({
        price: Number(l.price),
        color: l.color,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: l.title
      });
    });

    // --- ALGO BREAKOUT & REVERSAL LINES (User Specification) ---
    // Yellow dotted line breakout, Red/Green solid line reversal!
    if (algoLevels?.breakout_upper) {
      candleSeries.createPriceLine({
        price: Number(algoLevels.breakout_upper),
        color: '#FFD700',
        lineWidth: 1,
        lineStyle: 3, // Dotted
        axisLabelVisible: true,
        title: `BREAKOUT UPPER: ${algoLevels.breakout_upper}`
      });
    }
    if (algoLevels?.breakout_lower) {
      candleSeries.createPriceLine({
        price: Number(algoLevels.breakout_lower),
        color: '#FFD700',
        lineWidth: 1,
        lineStyle: 3, // Dotted
        axisLabelVisible: true,
        title: `BREAKDOWN LOWER: ${algoLevels.breakout_lower}`
      });
    }
    if (algoLevels?.reversal_upper) {
      candleSeries.createPriceLine({
        price: Number(algoLevels.reversal_upper),
        color: '#ff4444',
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: `REVERSAL UPPER: ${algoLevels.reversal_upper}`
      });
    }
    if (algoLevels?.reversal_lower) {
      candleSeries.createPriceLine({
        price: Number(algoLevels.reversal_lower),
        color: '#00ff88',
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: `REVERSAL LOWER: ${algoLevels.reversal_lower}`
      });
    }

    // Resize Handler
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
  }, [spotData, pivotLevels, height, algoLevels]);

  const activePivots = [
    { name: 'R3', price: pivotLevels?.R3 ?? 23358.80, color: '#ff4444' },
    { name: 'R2', price: pivotLevels?.R2 ?? 23238.40, color: '#ff8844' },
    { name: 'R1', price: pivotLevels?.R1 ?? 23145.80, color: '#ffaa00' },
    { name: 'PIVOT', price: pivotLevels?.PP ?? 23025.40, color: '#FFD700', isBold: true },
    { name: 'S1', price: pivotLevels?.S1 ?? 22932.80, color: '#00ff88' },
    { name: 'S2', price: pivotLevels?.S2 ?? 22812.40, color: '#00ff88' },
    { name: 'S3', price: pivotLevels?.S3 ?? 22719.80, color: '#00ff88' },
  ];

  return (
    <div className="relative w-full rounded overflow-hidden" style={{ minHeight: `${height}px` }}>
      {/* Chart-Top Pivot Points Badges Overlay */}
      <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1.5 pointer-events-none bg-[#0a1931]/85 p-1.5 rounded border border-white/10 backdrop-blur-sm">
        <span className="text-[9px] font-bold text-slate-300 font-mono px-0.5">PIVOTS:</span>
        {activePivots.map((p, i) => (
          <span 
            key={i} 
            className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold"
            style={{ 
              color: p.color, 
              backgroundColor: `${p.color}18`, 
              border: `1px solid ${p.color}40`,
              boxShadow: p.isBold ? `0 0 6px ${p.color}40` : 'none'
            }}
          >
            {p.name}: {p.price}
          </span>
        ))}
        {algoLevels?.breakout_upper && (
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold text-[#FFD700] bg-[#FFD700]/15 border border-[#FFD700]/50">
            BREAKOUT: {algoLevels.breakout_upper} / {algoLevels.breakout_lower}
          </span>
        )}
        {algoLevels?.reversal_upper && (
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold text-rose-300 bg-rose-500/15 border border-rose-500/40">
            REV: {algoLevels.reversal_upper} / {algoLevels.reversal_lower}
          </span>
        )}
      </div>

      <div 
        ref={chartContainerRef} 
        className="w-full" 
        style={{ height: `${height}px`, width: '100%', minHeight: `${height}px` }} 
      />
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import Dashboard from './components/Dashboard.jsx';
import OptionChain from './components/OptionChain.jsx';
import Profile from './components/Profile.jsx';

const API = "http://127.0.0.1:8000";

// Helper for lightweight-charts v4 & v5 compatibility
const addCandleSeries = (chart, opts) => {
  return typeof chart.addCandlestickSeries === 'function'
    ? chart.addCandlestickSeries(opts)
    : chart.addSeries(CandlestickSeries, opts);
};

const addLineSeriesCompat = (chart, opts) => {
  return typeof chart.addLineSeries === 'function'
    ? chart.addLineSeries(opts)
    : chart.addSeries(LineSeries, opts);
};

export default function App() {
  const [activeTab, setActiveTab] = useState('v3'); // 'v3' | 'dashboard' | 'optionchain'
  const [data, setData] = useState(null);
  const [spot, setSpot] = useState(23053.10);
  const [atm, setAtm] = useState(23050);

  // Separate refs for CE, PE, and Spot charts (Clean variable declarations)
  const ceRef = useRef(null);
  const peRef = useRef(null);
  const spotRef = useRef(null);
  const ceChartRef = useRef(null);
  const peChartRef = useRef(null);
  const spotChartRef = useRef(null);

  // Fetch from YOUR backend endpoints dynamically
  useEffect(() => {
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    if (isWeekend) {
      console.log("Sunday - Market closed - Showing Friday close 23053.10");
      setSpot(23053.10);
      setAtm(23050);
    }

    const load = async () => {
      try {
        const isWeekendCheck = new Date().getDay() === 0 || new Date().getDay() === 6;
        if (isWeekendCheck) {
          console.log("Sunday - Market closed - Showing Friday close 23053.10");
          setSpot(23053.10);
          setAtm(23050);
        }

        // First get live quote / spot OHLC to determine exact dynamic Spot & dynamic ATM strike
        const [spotOhlc, vinoHist] = await Promise.all([
          fetch(`${API}/api/nifty/spot-ohlc`).then(r => r.json()).catch(() => null),
          fetch(`${API}/api/vino/history`).then(r => r.json()).catch(() => null)
        ]);

        let spotVal;
        let dynamicAtm;

        if (isWeekendCheck) {
          spotVal = 23053.10;
          dynamicAtm = 23050;
        } else {
          spotVal = spotOhlc?.spot || spotOhlc?.candles?.slice(-1)[0]?.close || 23053.10;
          dynamicAtm = spotOhlc?.atm || Math.round(spotVal / 50) * 50 || 23050;
        }

        setSpot(spotVal);
        setAtm(dynamicAtm);

        // Fetch dynamic Common BEP and dynamic Dual Momentum candles for the dynamic ATM strike
        const [commonBep, dualCandles] = await Promise.all([
          fetch(`${API}/api/vino/common-bep/${dynamicAtm}`).then(r => r.json()).catch(() => null),
          fetch(`${API}/api/dual-momentum/candles?strike=${dynamicAtm}`).then(r => r.json()).catch(() => null)
        ]);

        const ceLtp = dualCandles?.ce_candles?.slice(-1)[0]?.close || vinoHist?.yesterday?.ce_pdh || 145.20;
        const peLtp = dualCandles?.pe_candles?.slice(-1)[0]?.close || vinoHist?.yesterday?.pe_pdh || 123.50;

        setData({
          ...(commonBep || {}),
          vinoHist,
          spotOhlc,
          dualCandles,
          atm: dynamicAtm,
          ce_ltp: ceLtp,
          pe_ltp: peLtp,
          spot: spotVal,
          ce_candles: dualCandles?.ce_candles || [],
          pe_candles: dualCandles?.pe_candles || [],
          spot_candles: spotOhlc?.candles || []
        });
      } catch (e) {
        console.log("API error, using fallback", e);
        // Fallback mock using Friday's metrics
        setData({
          yesterday: { ce_pdh: 175.20, ce_pdl: 110.00, pe_pdh: 132.89, pe_pdl: 95.00 },
          bep_data: { type: "CE_DOMINANT", bep: 135.10, logic: "CE_PDH 175.20 > PE_PDH 132.89 => (175.20+95.00)/2 = 135.10" },
          levels_premium: { BEP: 135.10, R1: 150.10, R2: 165.10, R3: 180.10, S1: 120.10, S2: 105.10, S3: 90.10 },
          ce_chart_levels: { BEP: 135.10, R1: 150.10, R2: 165.10, R3: 180.10, S1: 120.10, S2: 105.10, S3: 90.10 },
          pe_chart_levels: { BEP: 135.10, R1: 150.10, R2: 165.10, R3: 180.10, S1: 120.10, S2: 105.10, S3: 90.10 },
          breakout_up: 23185.10, breakout_down: 22914.90,
          atm: 23050, ce_ltp: 145.20, pe_ltp: 123.50, spot: 23053.10,
          signal: "NO_TRADE"
        });
      }
    };
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  // Dual Chart - SEPARATE INSTANCES - FIX CROSSOVER
  useEffect(() => {
    if (activeTab !== 'v3' || !data || !ceRef.current || !peRef.current || !spotRef.current) return;

    // Cleanup old charts
    if (ceChartRef.current) { ceChartRef.current.remove(); ceChartRef.current = null; }
    if (peChartRef.current) { peChartRef.current.remove(); peChartRef.current = null; }
    if (spotChartRef.current) { spotChartRef.current.remove(); spotChartRef.current = null; }

    const ceWidth = ceRef.current.clientWidth || 360;
    const peWidth = peRef.current.clientWidth || 360;
    const spotWidth = spotRef.current.clientWidth || 750;

    // --- CE CHART ---
    const ceChart = createChart(ceRef.current, {
      width: ceWidth, height: 280,
      layout: { background: { color: '#0a0a0f' }, textColor: '#aaa' },
      grid: { vertLines: { color: '#1a1a2e' }, horzLines: { color: '#1a1a2e' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#1a1a2e' },
      rightPriceScale: { borderColor: '#1a1a2e' }
    });
    ceChartRef.current = ceChart;
    const ceSeries = addCandleSeries(ceChart, { 
      upColor: '#00ff88', downColor: '#ff4444',
      borderUpColor: '#00ff88', borderDownColor: '#ff4444',
      wickUpColor: '#00ff88', wickDownColor: '#ff4444'
    });

    const ceCandles = (data.ce_candles && data.ce_candles.length > 0)
      ? data.ce_candles
      : [{ time: Math.floor(Date.now() / 1000) - 300, open: data.ce_ltp - 2, high: data.ce_ltp + 4, low: data.ce_ltp - 3, close: data.ce_ltp }];
    ceSeries.setData(ceCandles);

    // CE LTP Line
    ceSeries.createPriceLine({
      price: Number(data.ce_ltp),
      color: '#00ff88',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `LTP: ₹${Number(data.ce_ltp).toFixed(2)}`
    });
    
    // SAME BEP LEVELS ON CE CHART - IMPORTANT
    if (data.ce_chart_levels) {
      Object.entries(data.ce_chart_levels).forEach(([k, v]) => {
        ceSeries.createPriceLine({
          price: Number(v),
          color: k === 'BEP' ? '#FFD700' : k.startsWith('R') ? '#ff4444' : '#00ff88',
          lineWidth: k === 'BEP' ? 2 : 1,
          lineStyle: k === 'BEP' ? 0 : 2, // BEP solid, R/S dashed
          axisLabelVisible: true,
          title: `${k} ${Number(v).toFixed(2)}`
        });
      });
    }
    ceChart.timeScale().fitContent();

    // --- PE CHART - SEPARATE - SAME LEVELS - FIX CROSSOVER ---
    const peChart = createChart(peRef.current, {
      width: peWidth, height: 280,
      layout: { background: { color: '#0a0a0f' }, textColor: '#aaa' },
      grid: { vertLines: { color: '#1a1a2e' }, horzLines: { color: '#1a1a2e' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#1a1a2e' },
      rightPriceScale: { borderColor: '#1a1a2e' }
    });
    peChartRef.current = peChart;
    const peSeries = addCandleSeries(peChart, { 
      upColor: '#00ff88', downColor: '#ff4444',
      borderUpColor: '#00ff88', borderDownColor: '#ff4444',
      wickUpColor: '#00ff88', wickDownColor: '#ff4444'
    });

    const peCandles = (data.pe_candles && data.pe_candles.length > 0)
      ? data.pe_candles
      : [{ time: Math.floor(Date.now() / 1000) - 300, open: data.pe_ltp - 2, high: data.pe_ltp + 4, low: data.pe_ltp - 3, close: data.pe_ltp }];
    peSeries.setData(peCandles);

    // PE LTP Line
    peSeries.createPriceLine({
      price: Number(data.pe_ltp),
      color: '#ff4444',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `LTP: ₹${Number(data.pe_ltp).toFixed(2)}`
    });
    
    // SAME BEP LEVELS ON PE CHART - IDENTICAL TO CE
    if (data.pe_chart_levels) {
      Object.entries(data.pe_chart_levels).forEach(([k, v]) => {
        peSeries.createPriceLine({
          price: Number(v),
          color: k === 'BEP' ? '#FFD700' : k.startsWith('R') ? '#ff4444' : '#00ff88',
          lineWidth: k === 'BEP' ? 2 : 1,
          lineStyle: k === 'BEP' ? 0 : 2,
          axisLabelVisible: true,
          title: `${k} ${Number(v).toFixed(2)}`
        });
      });
    }
    peChart.timeScale().fitContent();

    // --- SPOT CHART - Using get_nifty_spot_ohlc() - 5-Min ---
    const spotChart = createChart(spotRef.current, {
      width: spotWidth, height: 320,
      layout: { background: { color: '#0a0a0f' }, textColor: '#aaa' },
      grid: { vertLines: { color: '#1a1a2e' }, horzLines: { color: '#1a1a2e' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#1a1a2e' },
      rightPriceScale: { borderColor: '#1a1a2e' }
    });
    spotChartRef.current = spotChart;

    if (data.spot_candles && data.spot_candles.length > 0) {
      const spotSeries = addCandleSeries(spotChart, {
        upColor: '#00ff88', downColor: '#ff4444',
        borderUpColor: '#00ff88', borderDownColor: '#ff4444',
        wickUpColor: '#00ff88', wickDownColor: '#ff4444'
      });
      spotSeries.setData(data.spot_candles);

      if (data.breakout_up) {
        spotSeries.createPriceLine({ 
          price: Number(data.breakout_up), 
          color: '#00ff88', 
          lineWidth: 2, 
          lineStyle: 0, 
          axisLabelVisible: true,
          title: `BREAKOUT UP ${Number(data.breakout_up).toFixed(2)}` 
        });
      }
      if (data.breakout_down) {
        spotSeries.createPriceLine({ 
          price: Number(data.breakout_down), 
          color: '#ff4444', 
          lineWidth: 2, 
          lineStyle: 0, 
          axisLabelVisible: true,
          title: `BREAKDOWN ${Number(data.breakout_down).toFixed(2)}` 
        });
      }
    } else {
      const spotLineSeries = addLineSeriesCompat(spotChart, { color: '#FFD700', lineWidth: 2 });
      spotLineSeries.setData([{ time: Math.floor(Date.now() / 1000) - 300, value: data.spot }]);

      if (data.breakout_up) {
        spotLineSeries.createPriceLine({ 
          price: Number(data.breakout_up), 
          color: '#00ff88', 
          lineWidth: 2, 
          lineStyle: 0, 
          axisLabelVisible: true,
          title: `BREAKOUT UP ${Number(data.breakout_up).toFixed(2)}` 
        });
      }
      if (data.breakout_down) {
        spotLineSeries.createPriceLine({ 
          price: Number(data.breakout_down), 
          color: '#ff4444', 
          lineWidth: 2, 
          lineStyle: 0, 
          axisLabelVisible: true,
          title: `BREAKDOWN ${Number(data.breakout_down).toFixed(2)}` 
        });
      }
    }
    spotChart.timeScale().fitContent();

    // Auto resize
    const handleResize = () => {
      if (ceChartRef.current && ceRef.current) ceChartRef.current.applyOptions({ width: ceRef.current.clientWidth });
      if (peChartRef.current && peRef.current) peChartRef.current.applyOptions({ width: peRef.current.clientWidth });
      if (spotChartRef.current && spotRef.current) spotChartRef.current.applyOptions({ width: spotRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ceChartRef.current) { ceChartRef.current.remove(); ceChartRef.current = null; }
      if (peChartRef.current) { peChartRef.current.remove(); peChartRef.current = null; }
      if (spotChartRef.current) { spotChartRef.current.remove(); spotChartRef.current = null; }
    };

  }, [data, activeTab]);

  if (!data) {
    return (
      <div style={{ background: '#0a0a0f', color: '#fff', minHeight: '100vh', padding: 30, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚡</div>
          <div style={{ color: '#FFD700', fontSize: '16px', fontWeight: 'bold' }}>Loading VINO V3 - Connecting to get_yesterday_data()...</div>
          <div style={{ color: '#666', fontSize: '12px', marginTop: '6px' }}>Fetching Common BEP, Spot Candles & Options LTP</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0a0f', color: '#fff', minHeight: '100vh', padding: '12px', fontFamily: 'monospace' }}>
      
      {/* Top Header & Navigation Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1a1a2e', paddingBottom: '10px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <h2 style={{ color: '#FFD700', margin: 0, fontSize: '17px', fontWeight: '900', letterSpacing: '0.5px' }}>
                VINO ALGO BOT PRO V3 - DUAL CHART COMMON BEP
              </h2>
              <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                Using: get_yesterday_data() | get_vino_history() | prev_day() | get_nifty_spot_ohlc() | alice.get_historical()
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('profile')}
            style={{
              background: '#131b2e',
              border: '1px solid #1e293b',
              padding: '4px 10px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
            title="Click to view Trader Profile & Session Details"
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
            <span>Client: <strong style={{ color: '#38bdf8' }}>2719650</strong></span>
            <span style={{ color: '#22c55e', fontSize: '10px', fontWeight: 'bold' }}>[ACTIVE]</span>
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#12121e', padding: '3px', borderRadius: '6px', border: '1px solid #222' }}>
          <button
            onClick={() => setActiveTab('v3')}
            style={{
              background: activeTab === 'v3' ? '#FFD700' : 'transparent',
              color: activeTab === 'v3' ? '#000' : '#aaa',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            ⚡ VINO V3 VIEW
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              background: activeTab === 'dashboard' ? '#3b82f6' : 'transparent',
              color: activeTab === 'dashboard' ? '#fff' : '#aaa',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            📊 FULL DASHBOARD
          </button>
          <button
            onClick={() => setActiveTab('optionchain')}
            style={{
              background: activeTab === 'optionchain' ? '#3b82f6' : 'transparent',
              color: activeTab === 'optionchain' ? '#fff' : '#aaa',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            ⛓️ OPTION CHAIN
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              background: activeTab === 'profile' ? '#10b981' : 'transparent',
              color: activeTab === 'profile' ? '#fff' : '#aaa',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            👤 TRADER PROFILE
          </button>
        </div>
      </div>

      {/* TAB 1: VINO V3 STANDALONE VIEW */}
      {activeTab === 'v3' && (
        <div>
          {/* Subtitle / Logic Bar */}
          <div style={{ textAlign: 'center', color: '#FFD700', fontSize: '12px', marginBottom: '12px', background: '#141424', padding: '6px', borderRadius: '6px', border: '1px solid #FFD70033' }}>
            BEP LOGIC: <strong>{data.bep_data?.logic}</strong> | TYPE: <strong>{data.bep_data?.type}</strong>
          </div>

          {/* DUAL CHARTS: CE & PE (Side-by-Side) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {/* CE Chart Card */}
            <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '10px', border: '1px solid #00ff8833' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h4 style={{ color: '#00ff88', margin: 0, fontSize: '13px' }}>📈 CE CHART - COMMON BEP LEVELS</h4>
                <span style={{ background: '#00ff8822', color: '#00ff88', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  LTP: ₹{Number(data.ce_ltp).toFixed(2)}
                </span>
              </div>
              <div ref={ceRef} style={{ width: '100%', minHeight: '280px' }}></div>
              <div style={{ color: '#FFD700', fontSize: '11px', marginTop: '6px', background: '#0b0b14', padding: '4px 8px', borderRadius: '4px' }}>
                BEP: {data.levels_premium?.BEP?.toFixed(2)} | R1: {data.levels_premium?.R1?.toFixed(2)} | S1: {data.levels_premium?.S1?.toFixed(2)} - SAME ON BOTH
              </div>
            </div>

            {/* PE Chart Card */}
            <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '10px', border: '1px solid #ff444433' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h4 style={{ color: '#ff4444', margin: 0, fontSize: '13px' }}>📉 PE CHART - SAME COMMON BEP LEVELS</h4>
                <span style={{ background: '#ff444422', color: '#ff4444', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  LTP: ₹{Number(data.pe_ltp).toFixed(2)}
                </span>
              </div>
              <div ref={peRef} style={{ width: '100%', minHeight: '280px' }}></div>
              <div style={{ color: '#FFD700', fontSize: '11px', marginTop: '6px', background: '#0b0b14', padding: '4px 8px', borderRadius: '4px' }}>
                BEP: {data.levels_premium?.BEP?.toFixed(2)} | R1: {data.levels_premium?.R1?.toFixed(2)} | S1: {data.levels_premium?.S1?.toFixed(2)} - SAME ON BOTH
              </div>
            </div>
          </div>

          {/* NIFTY SPOT CHART */}
          <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '10px', marginTop: '12px', border: '1px solid #FFD70066' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h4 style={{ color: '#FFD700', margin: 0, fontSize: '13px' }}>🎯 NIFTY SPOT - 5-MIN - get_nifty_spot_ohlc()</h4>
              <span style={{ background: '#FFD70022', color: '#FFD700', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                SPOT: {Number(data.spot).toFixed(2)}
              </span>
            </div>
            <div ref={spotRef} style={{ width: '100%', minHeight: '320px' }}></div>
          </div>

          {/* FINAL SIGNAL & BREAKOUT BADGES */}
          <div style={{ 
            background: data.signal?.includes('CE') ? '#00ff8818' : data.signal?.includes('PE') ? '#ff444418' : '#141424', 
            border: `2px solid ${data.signal?.includes('CE') ? '#00ff88' : data.signal?.includes('PE') ? '#ff4444' : '#FFD700'}`, 
            borderRadius: '10px', 
            padding: '14px', 
            marginTop: '12px' 
          }}>
            <h3 style={{ color: data.signal?.includes('CE') ? '#00ff88' : data.signal?.includes('PE') ? '#ff4444' : '#FFD700', margin: 0, fontSize: '16px' }}>
              {data.signal || 'NO TRADE'}
            </h3>
            
            <div style={{ color: '#fff', marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: '#000', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', border: '1px solid #333' }}>
                ATM: <strong>{data.atm}</strong>
              </span>
              <span style={{ background: '#FFD700', color: '#000', padding: '5px 10px', borderRadius: '5px', fontWeight: 'bold', fontSize: '12px' }}>
                BEP: {data.levels_premium?.BEP?.toFixed(2)}
              </span>
              <span style={{ background: '#00ff88', color: '#000', padding: '5px 10px', borderRadius: '5px', fontWeight: 'bold', fontSize: '12px' }}>
                BREAKOUT UP: {data.breakout_up?.toFixed(2)}
              </span>
              <span style={{ background: '#ff4444', color: '#fff', padding: '5px 10px', borderRadius: '5px', fontWeight: 'bold', fontSize: '12px' }}>
                BREAKDOWN: {data.breakout_down?.toFixed(2)}
              </span>
            </div>

            <div style={{ color: '#aaa', fontSize: '11px', marginTop: '10px', lineHeight: '1.6', background: '#00000044', padding: '8px', borderRadius: '6px' }}>
              Yesterday via get_yesterday_data(): CE_PDH {data.yesterday?.ce_pdh} CE_PDL {data.yesterday?.ce_pdl} | PE_PDH {data.yesterday?.pe_pdh} PE_PDL {data.yesterday?.pe_pdl}<br/>
              Logic: {data.bep_data?.logic}<br/>
              Type: {data.bep_data?.type} - Equal High na BEP_1 & BEP_2 rendu chart la varum
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FULL COMPREHENSIVE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ marginTop: '10px' }}>
          <Dashboard />
        </div>
      )}

      {/* TAB 3: OPTION CHAIN */}
      {activeTab === 'optionchain' && (
        <div style={{ marginTop: '10px' }}>
          <OptionChain />
        </div>
      )}

      {/* TAB 4: TRADER PROFILE */}
      {activeTab === 'profile' && (
        <div style={{ marginTop: '10px' }}>
          <Profile onSwitchTab={setActiveTab} />
        </div>
      )}

    </div>
  );
}

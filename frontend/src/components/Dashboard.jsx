import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  BarChart2,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  X,
  TrendingUp,
  AlertCircle,
  Activity,
  Maximize2,
  Minimize2,
  Zap
} from 'lucide-react';
import NiftySpotChart from './NiftySpotChart';
import DualMomentumCandleChart from './DualMomentumCandleChart';
import DualMomentumChart from './DualMomentumChart';
import Profile from './Profile';

// Comprehensive NSE Directory for instant search suggestions
const NSE_STOCK_DIRECTORY = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", ltp: 2845.60, change: "+1.2%", hl: "2860/2810", mom: "+1.2%", signal: "BUY", isGreen: true },
  { symbol: "TCS", name: "Tata Consultancy Services", ltp: 3920.10, change: "+0.8%", hl: "3940/3890", mom: "WAIT", signal: "WAIT", isYellow: true },
  { symbol: "INFY", name: "Infosys Ltd", ltp: 1540.30, change: "-0.5%", hl: "1560/1525", mom: "-0.5%", signal: "PE", isRed: true },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", ltp: 1680.90, change: "+1.5%", hl: "1690/1660", mom: "+1.5%", signal: "BUY", isGreen: true },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", ltp: 1245.20, change: "+0.9%", hl: "1255/1230", mom: "+0.9%", signal: "BUY", isGreen: true },
  { symbol: "SBIN", name: "State Bank of India", ltp: 815.40, change: "+1.8%", hl: "822/806", mom: "+1.8%", signal: "BUY", isGreen: true },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", ltp: 875.50, change: "+2.1%", hl: "882/860", mom: "+2.1%", signal: "BUY", isGreen: true },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", ltp: 1660.00, change: "+0.4%", hl: "1675/1645", mom: "+0.4%", signal: "WAIT", isYellow: true },
  { symbol: "ITC", name: "ITC Ltd", ltp: 485.20, change: "-0.2%", hl: "490/482", mom: "-0.2%", signal: "WAIT", isYellow: true },
  { symbol: "LT", name: "Larsen & Toubro Ltd", ltp: 3560.00, change: "+1.1%", hl: "3590/3520", mom: "+1.1%", signal: "BUY", isGreen: true },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", ltp: 1780.00, change: "-0.6%", hl: "1800/1770", mom: "-0.6%", signal: "PE", isRed: true },
  { symbol: "AXISBANK", name: "Axis Bank Ltd", ltp: 1190.50, change: "+1.4%", hl: "1205/1175", mom: "+1.4%", signal: "BUY", isGreen: true },
  { symbol: "MARUTI", name: "Maruti Suzuki India", ltp: 11450.00, change: "+0.7%", hl: "11550/11380", mom: "+0.7%", signal: "WAIT", isYellow: true },
  { symbol: "SUNPHARMA", name: "Sun Pharma Industries", ltp: 1890.00, change: "+1.6%", hl: "1910/1870", mom: "+1.6%", signal: "BUY", isGreen: true },
  { symbol: "TITAN", name: "Titan Company Ltd", ltp: 3340.00, change: "-1.1%", hl: "3380/3310", mom: "-1.1%", signal: "PE", isRed: true },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", ltp: 6980.00, change: "+1.9%", hl: "7050/6900", mom: "+1.9%", signal: "BUY", isGreen: true },
  { symbol: "WIPRO", name: "Wipro Ltd", ltp: 555.00, change: "-0.4%", hl: "562/550", mom: "-0.4%", signal: "WAIT", isYellow: true },
  { symbol: "HCLTECH", name: "HCL Technologies Ltd", ltp: 1820.00, change: "+0.5%", hl: "1840/1805", mom: "+0.5%", signal: "WAIT", isYellow: true },
  { symbol: "ADANIENT", name: "Adani Enterprises Ltd", ltp: 3050.00, change: "+2.5%", hl: "3110/2990", mom: "+2.5%", signal: "BUY", isGreen: true },
  { symbol: "ADANIPORTS", name: "Adani Ports & SEZ", ltp: 1380.00, change: "+1.3%", hl: "1395/1360", mom: "+1.3%", signal: "BUY", isGreen: true },
  { symbol: "NTPC", name: "NTPC Ltd", ltp: 410.00, change: "+0.6%", hl: "415/406", mom: "+0.6%", signal: "WAIT", isYellow: true },
  { symbol: "TATASTEEL", name: "Tata Steel Ltd", ltp: 152.00, change: "+1.3%", hl: "155/150", mom: "+1.3%", signal: "BUY", isGreen: true },
  { symbol: "POWERGRID", name: "Power Grid Corp", ltp: 325.00, change: "+0.3%", hl: "329/322", mom: "+0.3%", signal: "WAIT", isYellow: true },
  { symbol: "ONGC", name: "Oil & Natural Gas Corp", ltp: 270.00, change: "-0.8%", hl: "274/268", mom: "-0.8%", signal: "PE", isRed: true },
  { symbol: "COALINDIA", name: "Coal India Ltd", ltp: 450.00, change: "+0.9%", hl: "456/445", mom: "+0.9%", signal: "BUY", isGreen: true },
  { symbol: "ZOMATO", name: "Zomato Ltd", ltp: 265.00, change: "+3.2%", hl: "272/258", mom: "+3.2%", signal: "BUY", isGreen: true },
  { symbol: "JIOFIN", name: "Jio Financial Services", ltp: 320.00, change: "+1.1%", hl: "325/316", mom: "+1.1%", signal: "BUY", isGreen: true },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv Ltd", ltp: 1740.00, change: "+1.0%", hl: "1755/1720", mom: "+1.0%", signal: "BUY", isGreen: true },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", ltp: 2390.00, change: "-0.3%", hl: "2410/2375", mom: "-0.3%", signal: "WAIT", isYellow: true },
  { symbol: "JSWSTEEL", name: "JSW Steel Ltd", ltp: 960.00, change: "+1.4%", hl: "972/948", mom: "+1.4%", signal: "BUY", isGreen: true },
  { symbol: "M&M", name: "Mahindra & Mahindra", ltp: 2790.00, change: "+2.0%", hl: "2820/2750", mom: "+2.0%", signal: "BUY", isGreen: true }
];

// ==============================================================================
// SPOT CHART COMPONENT (5-Min Candles / Line with Pivot Levels)
// ==============================================================================
function SpotChart({ spotData, pivotLevels }) {
  const chartW = 600;
  const chartH = 210;
  const paddingLeft = 38;
  const paddingRight = 68;
  const paddingTop = 16;
  const paddingBottom = 22;

  const minP = (pivotLevels?.S3 || 24000) - 25;
  const maxP = (pivotLevels?.R3 || 25000) + 25;

  const getX = (idx, total) => paddingLeft + (idx / Math.max(total - 1, 1)) * (chartW - paddingLeft - paddingRight);
  const getY = (val) => chartH - paddingBottom - ((val - minP) / Math.max(maxP - minP, 1)) * (chartH - paddingTop - paddingBottom);

  const points = spotData && spotData.length > 0 
    ? spotData.map((d, i) => `${getX(i, spotData.length)},${getY(d.spot)}`).join(' ')
    : '';

  const lastPoint = spotData && spotData.length > 0 ? spotData[spotData.length - 1] : null;
  const lastX = lastPoint ? getX(spotData.length - 1, spotData.length) : 0;
  const lastY = lastPoint ? getY(lastPoint.spot) : 0;

  return (
    <div className="w-full h-full relative select-none">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spotGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Pivot Levels Horizontal Reference Lines */}
        {pivotLevels && (
          <g className="font-mono text-[8px]">
            {/* R3 */}
            <line x1={paddingLeft} y1={getY(pivotLevels.R3)} x2={chartW - paddingRight} y2={getY(pivotLevels.R3)} stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,3" />
            <text x={chartW - paddingRight + 4} y={getY(pivotLevels.R3) + 3} fill="#ef4444">R3 {pivotLevels.R3}</text>

            {/* R2 */}
            <line x1={paddingLeft} y1={getY(pivotLevels.R2)} x2={chartW - paddingRight} y2={getY(pivotLevels.R2)} stroke="#f87171" strokeWidth="0.8" strokeDasharray="3,3" />
            <text x={chartW - paddingRight + 4} y={getY(pivotLevels.R2) + 3} fill="#f87171">R2 {pivotLevels.R2}</text>

            {/* R1 */}
            <line x1={paddingLeft} y1={getY(pivotLevels.R1)} x2={chartW - paddingRight} y2={getY(pivotLevels.R1)} stroke="#fb923c" strokeWidth="0.9" strokeDasharray="4,3" />
            <text x={chartW - paddingRight + 4} y={getY(pivotLevels.R1) + 3} fill="#fb923c">R1 {pivotLevels.R1}</text>

            {/* PIVOT PP (BOLD YELLOW ACCENT) */}
            <line x1={paddingLeft} y1={getY(pivotLevels.PP)} x2={chartW - paddingRight} y2={getY(pivotLevels.PP)} stroke="#eab308" strokeWidth="1.6" strokeDasharray="5,2" />
            <rect x={chartW - paddingRight + 3} y={getY(pivotLevels.PP) - 6.5} width="62" height="13" rx="2" fill="#ca8a04" />
            <text x={chartW - paddingRight + 34} y={getY(pivotLevels.PP) + 3} fill="#ffffff" fontWeight="bold" textAnchor="middle">PP {pivotLevels.PP}</text>

            {/* S1 */}
            <line x1={paddingLeft} y1={getY(pivotLevels.S1)} x2={chartW - paddingRight} y2={getY(pivotLevels.S1)} stroke="#34d399" strokeWidth="0.9" strokeDasharray="4,3" />
            <text x={chartW - paddingRight + 4} y={getY(pivotLevels.S1) + 3} fill="#34d399">S1 {pivotLevels.S1}</text>

            {/* S2 */}
            <line x1={paddingLeft} y1={getY(pivotLevels.S2)} x2={chartW - paddingRight} y2={getY(pivotLevels.S2)} stroke="#22c55e" strokeWidth="0.8" strokeDasharray="3,3" />
            <text x={chartW - paddingRight + 4} y={getY(pivotLevels.S2) + 3} fill="#22c55e">S2 {pivotLevels.S2}</text>

            {/* S3 */}
            <line x1={paddingLeft} y1={getY(pivotLevels.S3)} x2={chartW - paddingRight} y2={getY(pivotLevels.S3)} stroke="#16a34a" strokeWidth="0.8" strokeDasharray="3,3" />
            <text x={chartW - paddingRight + 4} y={getY(pivotLevels.S3) + 3} fill="#16a34a">S3 {pivotLevels.S3}</text>
          </g>
        )}

        {/* Spot Area Fill */}
        {points && lastPoint && (
          <polygon 
            points={`${paddingLeft},${chartH - paddingBottom} ${points} ${lastX},${chartH - paddingBottom}`}
            fill="url(#spotGrad)" 
          />
        )}

        {/* Spot Line */}
        {points && (
          <polyline 
            fill="none" 
            stroke="#38bdf8" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            points={points} 
          />
        )}

        {/* Current Spot Pulsing Dot */}
        {lastPoint && (
          <g>
            <circle cx={lastX} cy={lastY} r="5" fill="#38bdf8" opacity="0.4" className="animate-ping" />
            <circle cx={lastX} cy={lastY} r="3.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.2" />
          </g>
        )}

        {/* X-Axis Time Labels */}
        {spotData && spotData.filter((_, idx) => idx % 2 === 0).map((d, idx) => {
          const originalIdx = idx * 2;
          return (
            <text 
              key={idx} 
              x={getX(originalIdx, spotData.length)} 
              y={chartH - 6} 
              textAnchor="middle" 
              fill="#94a3b8" 
              fontSize="8" 
              fontFamily="monospace"
            >
              {d.time}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ==============================================================================
// MAIN DASHBOARD COMPONENT
// ==============================================================================
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("OVERVIEW"); // OVERVIEW, POSITIONS, CHARTS, STOCKS, ANALYTICS
  const [chartSubTab, setChartSubTab] = useState("SPOT"); // "SPOT" or "DUAL_MOMENTUM"
  const [expandedCard, setExpandedCard] = useState(null); // 'CHARTS_SPOT' | 'CHARTS_DUAL' | 'OVERVIEW_SPOT' | 'OVERVIEW_DUAL' | 'OVERVIEW_BACKTEST'
  const [dualCandleData, setDualCandleData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [exitNotice, setExitNotice] = useState("");
  const [stockNotice, setStockNotice] = useState("");
  const searchContainerRef = useRef(null);

  // Bottom 4 Cards Values (Exact Screenshot Specification)
  const [marketData, setMarketData] = useState({
    spot: 23053.10,
    atm: 23050,
    ce_bep: 23185.10,
    pe_bep: 22914.90,
    status: 'IDLE / READY'
  });

  // Straddle Common BEP (Market Maker Trap Calculation)
  const [commonBep, setCommonBep] = useState({
    ce_high: 175.20,
    ce_low: 110.00,
    pe_high: 132.89,
    pe_low: 95.00,
    common_premium: 270.20,
    common_bep_upper: 23185.10,
    common_bep_lower: 22914.90,
    logic: "CE_PDH 175.20 > PE_PDH 132.89 => (175.20+95.00)/2 = 135.10"
  });

  // Final Algo Logic State (Breakout / Breakdown / Reversals & Live Target/SL Prompt)
  const [algoData, setAlgoData] = useState({
    atm_strike: 23050,
    nifty_spot: 23053.10,
    yesterday: { ce_high: 175.20, ce_low: 110.00, pe_high: 132.89, pe_low: 95.00, loaded: true },
    combined_total: 270.20,
    single_common_value: 135.10,
    breakout_upper: 23185.10,
    breakout_lower: 22914.90,
    ce_bep: 23185.10,
    pe_bep: 22914.90,
    reversal_upper: 23320.20,
    reversal_lower: 22779.80,
    signal: "NO TRADE",
    entry: 145.20,
    target: 217.80,
    stop_loss: 101.64,
    trailing_sl: 123.42,
    prompt: "Awaiting Breakout / Breakdown confirmation on 5-Min Spot..."
  });

  // Yesterday Backtest Metrics
  const [backtestStats, setBacktestStats] = useState({
    total_trades: 3,
    win_rate: '66.7%',
    wins_losses: '2 / 1',
    net_profit: '+₹2,085'
  });

  // Yesterday Trades Table Data (Exact Screenshot Specification)
  const [trades, setTrades] = useState([
    {
      id: 1,
      time: '09:21',
      type: 'CE BUY',
      strike: '23050 CE',
      entry: 145.20,
      exit: 175.20,
      pnl: '+₹1,500.00',
      isProfit: true,
      result: 'TARGET HIT'
    },
    {
      id: 2,
      time: '10:45',
      type: 'PE BUY',
      strike: '23050 PE',
      entry: 132.80,
      exit: 122.80,
      pnl: '-₹500.00',
      isProfit: false,
      result: 'STOP LOSS HIT'
    },
    {
      id: 3,
      time: '13:12',
      type: 'CE BUY',
      strike: '24550 CE',
      entry: 110.00,
      exit: 131.70,
      pnl: '+₹1,085.00',
      isProfit: true,
      result: 'TARGET HIT'
    }
  ]);

  // Dual Momentum 5-Min Series
  const [momentumData, setMomentumData] = useState([
    { time: '09:15', ce: 0.18, pe: 0.32 },
    { time: '09:20', ce: 0.28, pe: 0.29 },
    { time: '09:21', ce: 0.44, pe: 0.26 }, // BUY_CE cross
    { time: '09:30', ce: 0.58, pe: 0.22 },
    { time: '09:45', ce: 0.65, pe: 0.18 },
    { time: '10:00', ce: 0.61, pe: 0.21 },
    { time: '10:15', ce: 0.52, pe: 0.28 },
    { time: '10:30', ce: 0.41, pe: 0.38 },
    { time: '10:45', ce: 0.31, pe: 0.51 }, // BUY_PE cross
    { time: '11:00', ce: 0.24, pe: 0.59 },
    { time: '11:30', ce: 0.22, pe: 0.54 },
    { time: '12:00', ce: 0.29, pe: 0.47 },
    { time: '12:30', ce: 0.34, pe: 0.42 },
    { time: '13:00', ce: 0.39, pe: 0.38 },
    { time: '13:12', ce: 0.54, pe: 0.32 }, // BUY_CE cross
    { time: '13:30', ce: 0.63, pe: 0.27 },
    { time: '14:00', ce: 0.69, pe: 0.23 },
    { time: '14:30', ce: 0.64, pe: 0.26 },
    { time: '15:00', ce: 0.58, pe: 0.31 },
    { time: '15:30', ce: 0.52, pe: 0.35 }
  ]);

  // Markers for CE/PE Crossovers
  const markers = [
    { time: '09:21', label: 'BUY_CE', type: 'CE', index: 2, price: '145.20' },
    { time: '10:45', label: 'BUY_PE', type: 'PE', index: 8, price: '132.80' },
    { time: '13:12', label: 'BUY_CE', type: 'CE', index: 14, price: '110.00' }
  ];

  // 1. Previous Day High / Low
  const [prevDay, setPrevDay] = useState({
    prev_high: 24610.50,
    prev_low: 24320.10,
    prev_close: 24480.30
  });

  // ==============================================================================
  // PIVOT CALCULATION (Exact User Formula Specification)
  // high = yesterday_high, low = yesterday_low, close = yesterday_close
  // PP = (high + low + close) / 3
  // R1 = (2 * PP) - low, S1 = (2 * PP) - high
  // R2 = PP + (high - low), S2 = PP - (high - low)
  // R3 = high + 2*(PP - low), S3 = low - 2*(high - PP)
  // ==============================================================================
  const yesterday_high = prevDay.prev_high || 24610.50;
  const yesterday_low = prevDay.prev_low || 24320.10;
  const yesterday_close = prevDay.prev_close || 24480.30;

  const PP = (yesterday_high + yesterday_low + yesterday_close) / 3;
  const R1 = (2 * PP) - yesterday_low;
  const S1 = (2 * PP) - yesterday_high;
  const R2 = PP + (yesterday_high - yesterday_low);
  const S2 = PP - (yesterday_high - yesterday_low);
  const R3 = yesterday_high + 2 * (PP - yesterday_low);
  const S3 = yesterday_low - 2 * (yesterday_high - PP);

  const pivot = {
    PP: Number(PP.toFixed(2)),
    R1: Number(R1.toFixed(2)),
    S1: Number(S1.toFixed(2)),
    R2: Number(R2.toFixed(2)),
    S2: Number(S2.toFixed(2)),
    R3: Number(R3.toFixed(2)),
    S3: Number(S3.toFixed(2))
  };

  // 5-Min Spot Chart Data
  const [spotData, setSpotData] = useState([
    { time: '09:15', spot: 24450.20 },
    { time: '09:30', spot: 24478.40 },
    { time: '09:45', spot: 24512.60 },
    { time: '10:00', spot: 24535.80 },
    { time: '10:30', spot: 24485.50 },
    { time: '11:00', spot: 24455.10 },
    { time: '11:30', spot: 24430.20 },
    { time: '12:00', spot: 24475.00 },
    { time: '12:30', spot: 24492.40 },
    { time: '13:00', spot: 24520.10 },
    { time: '13:30', spot: 24545.20 },
    { time: '14:00', spot: 24510.50 },
    { time: '14:30', spot: 24485.00 },
    { time: '15:00', spot: 24490.10 },
    { time: '15:30', spot: 24496.44 }
  ]);

  // 5-Min Spot Candlestick OHLC Data (Lightweight Charts)
  const [spotCandles, setSpotCandles] = useState([]);

  // 2. Live Positions & P&L
  const [positionsData, setPositionsData] = useState({
    positions: [
      { symbol: "24500 CE", qty: 50, avg: 145.2, ltp: 175.2, pnl: 1500, pnl_percent: 20.6 },
      { symbol: "24550 CE", qty: 50, avg: 110.0, ltp: 131.7, pnl: 1085, pnl_percent: 19.7 }
    ],
    total_pnl: 2585,
    day_pnl: 2085
  });

  // 3. Stocks Watchlist (Persisted in localStorage)
  const [stocksList, setStocksList] = useState(() => {
    const saved = localStorage.getItem('vino_user_watchlist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      { symbol: "RELIANCE", name: "Reliance Industries Ltd", ltp: 2845, change: "+1.2%", hl: "2860/2810", mom: "+1.2%", signal: "BUY", isGreen: true },
      { symbol: "TCS", name: "Tata Consultancy Services", ltp: 3920, change: "+0.8%", hl: "3940/3890", mom: "WAIT", signal: "WAIT", isYellow: true },
      { symbol: "INFY", name: "Infosys Ltd", ltp: 1540, change: "-0.5%", hl: "1560/1525", mom: "-0.5%", signal: "PE", isRed: true },
      { symbol: "HDFCBANK", name: "HDFC Bank Ltd", ltp: 1680, change: "+1.5%", hl: "1690/1660", mom: "+1.5%", signal: "BUY", isGreen: true },
      { symbol: "ICICIBANK", name: "ICICI Bank Ltd", ltp: 1245, change: "+0.9%", hl: "1255/1230", mom: "+0.9%", signal: "BUY", isGreen: true }
    ];
  });

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('vino_user_watchlist', JSON.stringify(stocksList));
  }, [stocksList]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key to exit any maximized big screen card
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && expandedCard) {
        setExpandedCard(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedCard]);

  // Fetch functions with dynamic fallback
  const fetchDualMomentum = async (strike) => {
    try {
      const targetStrike = strike || algoData?.atm_strike || 23050;
      const res = await fetch(`http://127.0.0.1:8000/api/dual-momentum?strike=${targetStrike}`);
      if (res.ok) {
        const data = await res.json();
        if (data.series && data.series.length > 0) {
          setMomentumData(data.series.map(pt => ({
            time: pt.time,
            ce: pt.ce_mom,
            pe: pt.pe_mom
          })));
        }
      }
    } catch (e) {}
  };

  const fetchLivePositions = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/live/positions');
      if (res.ok) {
        const data = await res.json();
        if (data.positions) {
          setPositionsData(data);
        }
      }
    } catch (e) {}
  };

  const fetchPrevDay = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/prev-day/NIFTY');
      if (res.ok) {
        const data = await res.json();
        setPrevDay({
          prev_high: data.prev_high || 24610.50,
          prev_low: data.prev_low || 24320.10,
          prev_close: data.prev_close || 24480.30
        });
      }
    } catch (e) {}
  };

  const fetchStocks = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/stocks/watchlist');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setStocksList(prev => {
            const backendMap = new Map(data.map(item => [item.symbol.toUpperCase(), item]));
            return prev.map(s => {
              const bItem = backendMap.get(s.symbol.toUpperCase());
              if (bItem) {
                return {
                  ...s,
                  ltp: Math.round(bItem.ltp),
                  change: (bItem.change >= 0 ? '+' : '') + bItem.change + '%',
                  hl: `${bItem.prev_high}/${bItem.prev_low}`,
                  mom: bItem.mom,
                  signal: bItem.signal.includes('CE') ? 'BUY' : bItem.signal.includes('PE') ? 'PE' : bItem.signal,
                  isGreen: bItem.signal.includes('CE') || bItem.change > 0,
                  isRed: bItem.signal.includes('PE') || bItem.change < 0,
                  isYellow: bItem.signal === 'WAIT'
                };
              }
              return s;
            });
          });
        }
      }
    } catch (e) {}
  };

  const fetchBacktestData = async () => {
    setLoadingBacktest(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/backtest/yesterday');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setBacktestStats(data.stats);
        if (data.trades) setTrades(data.trades);
      }
    } catch (e) {}
    finally {
      setTimeout(() => setLoadingBacktest(false), 300);
    }
  };

  const fetchNiftySpotOhlc = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/nifty/spot-ohlc');
      if (res.ok) {
        const data = await res.json();
        if (data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
          setSpotCandles(data.candles);
        }
      }
    } catch (e) {}
  };

  const fetchDualMomentumCandles = async (strike) => {
    try {
      const targetStrike = strike || algoData?.atm_strike || 23050;
      const res = await fetch(`http://127.0.0.1:8000/api/dual-momentum/candles?strike=${targetStrike}`);
      if (res.ok) {
        const data = await res.json();
        setDualCandleData(data);
      }
    } catch (e) {}
  };

  const fetchLiveData = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/live_data');
      if (res.ok) {
        const data = await res.json();
        setAlgoData(data);
        if (data.nifty_spot) {
          const atm = data.atm_strike || Math.round(data.nifty_spot / 50) * 50;
          setMarketData({
            spot: data.nifty_spot,
            atm: atm,
            ce_bep: data.common_bep_upper || (atm + (data.bep_val || 135.10)),
            pe_bep: data.common_bep_lower || (atm - (data.bep_val || 135.10)),
            status: data.signal ? data.signal.split(' - ')[0] : 'IDLE / READY'
          });
        }
        if (data.common_bep_upper) {
          setCommonBep({
            ce_high: data.ce_high,
            ce_low: data.ce_low,
            pe_high: data.pe_high,
            pe_low: data.pe_low,
            common_premium: data.common_premium,
            common_bep_upper: data.common_bep_upper,
            common_bep_lower: data.common_bep_lower,
            logic: data.logic,
            levels: data.levels,
            bep_val: data.bep_val
          });
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchDualMomentum();
    fetchLivePositions();
    fetchPrevDay();
    fetchStocks();
    fetchNiftySpotOhlc();
    fetchDualMomentumCandles();
    fetchLiveData();

    const interval = setInterval(() => {
      fetchLivePositions();
      fetchNiftySpotOhlc();
      fetchDualMomentumCandles();
      fetchLiveData();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTrade = () => {
    setIsRunning(!isRunning);
  };

  const handleExitAll = () => {
    setExitNotice("All open positions squared off successfully on Alice Blue!");
    setTimeout(() => {
      setExitNotice("");
    }, 4000);
  };

  // Add stock to watchlist
  const handleAddStock = (stockInput) => {
    let sym = "";
    let stockObj = null;

    if (typeof stockInput === 'string') {
      sym = stockInput.trim().toUpperCase();
      if (!sym) return;
      const foundInDir = NSE_STOCK_DIRECTORY.find(s => s.symbol.toUpperCase() === sym);
      if (foundInDir) {
        stockObj = { ...foundInDir };
      }
    } else if (stockInput && stockInput.symbol) {
      sym = stockInput.symbol.toUpperCase();
      stockObj = { ...stockInput };
    }

    if (!sym) return;

    if (stocksList.some(s => s.symbol.toUpperCase() === sym)) {
      setStockNotice(`${sym} is already in your watchlist!`);
      setTimeout(() => setStockNotice(""), 3000);
      setStockSearch("");
      setIsSearchFocused(false);
      return;
    }

    if (!stockObj) {
      stockObj = {
        symbol: sym,
        name: `${sym} (NSE Equity)`,
        ltp: Math.floor(Math.random() * 2500 + 450),
        change: "+1.1%",
        hl: "2150/2090",
        mom: "+1.1%",
        signal: "BUY",
        isGreen: true
      };
    }

    setStocksList(prev => [stockObj, ...prev]);
    setStockNotice(`✓ Added ${sym} to your Watchlist!`);
    setTimeout(() => setStockNotice(""), 3500);
    setStockSearch("");
    setIsSearchFocused(false);
  };

  // Remove stock from watchlist
  const handleRemoveStock = (symbolToRemove) => {
    setStocksList(prev => prev.filter(s => s.symbol.toUpperCase() !== symbolToRemove.toUpperCase()));
    setStockNotice(`Removed ${symbolToRemove} from watchlist.`);
    setTimeout(() => setStockNotice(""), 3000);
  };

  // Search matching from current watchlist
  const trimmedSearch = stockSearch.trim().toLowerCase();
  const filteredStocks = trimmedSearch
    ? stocksList.filter(s => 
        s.symbol.toLowerCase().includes(trimmedSearch) ||
        (s.name && s.name.toLowerCase().includes(trimmedSearch))
      )
    : stocksList;

  // Search matching from full NSE directory (for instant suggestions)
  const matchingSuggestions = trimmedSearch
    ? NSE_STOCK_DIRECTORY.filter(s => 
        s.symbol.toLowerCase().includes(trimmedSearch) || 
        s.name.toLowerCase().includes(trimmedSearch)
      )
    : [];

  // SVG Chart Geometry Calculations (compact h-48 ~ 155px)
  const chartW = 760;
  const chartH = 150;
  const paddingX = 35;
  const paddingY = 18;

  const minMom = 0.05;
  const maxMom = 0.85;

  const getX = (idx, total) => paddingX + (idx / (total - 1)) * (chartW - 2 * paddingX);
  const getY = (val) => chartH - paddingY - ((val - minMom) / (maxMom - minMom)) * (chartH - 2 * paddingY);

  const cePoints = momentumData.map((d, i) => `${getX(i, momentumData.length)},${getY(d.ce)}`).join(' ');
  const pePoints = momentumData.map((d, i) => `${getX(i, momentumData.length)},${getY(d.pe)}`).join(' ');

  // Dynamic BEP Channel Levels for display on chart & header
  const dynamicCeBep = Math.round(commonBep?.common_bep_upper || algoData?.breakout_upper || dualCandleData?.bep?.ce_bep || (algoData?.atm_strike ? algoData.atm_strike + 130.10 : 23130.10));
  const dynamicPeBep = Math.round(commonBep?.common_bep_lower || algoData?.breakout_lower || dualCandleData?.bep?.pe_bep || (algoData?.atm_strike ? algoData.atm_strike - 130.10 : 22869.90));

  return (
    <div className="w-full space-y-2 font-sans text-xs">
      
      {/* ===================================================================== */}
      {/* 1. VINO ALGO BOT MAIN HEADER CARD                                     */}
      {/* ===================================================================== */}
      <div className="bg-[#1e293b]/80 border border-white/10 rounded-lg p-2.5 shadow-md backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Vino Algo Bot</span>
              </h2>
              <div className="flex items-center gap-1.5 px-2 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isRunning ? 'RUNNING' : 'IDLE / READY'}</span>
              </div>
            </div>

            <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">
              Dual Chart Momentum • CE/PE Cross Marker • BEP Channel • Pivot Support/Resistance
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTrade}
              className={`h-7 px-3 text-[11px] font-bold rounded-md shadow flex items-center gap-1 transition ${
                isRunning 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop Trading</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Start Paper Trade</span>
                </>
              )}
            </button>

            <button
              onClick={fetchBacktestData}
              disabled={loadingBacktest}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-slate-700 bg-slate-800/80 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw className={`w-3 h-3 ${loadingBacktest ? 'animate-spin text-blue-400' : ''}`} />
              <span>{loadingBacktest ? 'Running...' : 'Run Backtest'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. TOP FOLDER TABS BAR                                                */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2 mb-2 bg-[#0f1c35]/80 p-1.5 rounded-lg border border-white/10 w-fit">
        <button 
          onClick={() => setActiveTab("OVERVIEW")} 
          className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "OVERVIEW" 
              ? "bg-blue-600 text-white shadow" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          📁 OVERVIEW
        </button>

        <button 
          onClick={() => setActiveTab("POSITIONS")} 
          className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "POSITIONS" 
              ? "bg-green-600 text-white shadow" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          📂 LIVE POSITIONS {activeTab !== "POSITIONS" && (
            <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono">+2,585</span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("CHARTS")} 
          className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "CHARTS" 
              ? "bg-cyan-600 text-white shadow" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          📈 CHARTS
          <span className="bg-cyan-400/20 text-cyan-300 text-[9px] px-1.5 py-0.2 rounded-full border border-cyan-400/30 font-mono">
            CANDLE
          </span>
        </button>

        <button 
          onClick={() => setActiveTab("STOCKS")} 
          className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "STOCKS" 
              ? "bg-purple-600 text-white shadow" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          📂 STOCKS NSE
          <span className="bg-purple-400/20 text-purple-300 text-[9px] px-1.5 py-0.2 rounded-full border border-purple-400/30">
            {stocksList.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab("ANALYTICS")} 
          className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "ANALYTICS" 
              ? "bg-orange-600 text-white shadow" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          📊 ANALYTICS
        </button>

        <button 
          onClick={() => setActiveTab("PROFILE")} 
          className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "PROFILE" 
              ? "bg-emerald-600 text-white shadow" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          👤 PROFILE
        </button>
      </div>

      {/* ===================================================================== */}
      {/* FINAL ALGO SIGNAL BOX & BREAKOUT ENGINE (User Specification)          */}
      {/* ===================================================================== */}
      {algoData.signal !== "NO TRADE" ? (
        <div style={{
          background: algoData.signal.includes('CE') ? '#00ff8822' : '#ff444422', 
          border: `2px solid ${algoData.signal.includes('CE') ? '#00ff88' : '#ff4444'}`, 
          padding: '15px', 
          borderRadius: '10px', 
          marginTop: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          <div className="flex items-center justify-between">
            <h3 style={{ color: algoData.signal.includes('CE') ? '#00ff88' : '#ff4444', margin: 0, fontWeight: 900, fontSize: '18px' }} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: algoData.signal.includes('CE') ? '#00ff88' : '#ff4444' }} />
              <span>{algoData.signal}</span>
            </h3>
            <button 
              onClick={() => setAlgoData(prev => ({ ...prev, signal: "NO TRADE", prompt: "Reset to live monitoring." }))}
              className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 transition"
            >
              Reset Signal
            </button>
          </div>
          <p style={{ color: '#FFD700', fontWeight: 'bold', margin: '8px 0 0 0', fontSize: '13px' }}>
            {algoData.prompt}
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <div style={{ background: '#000', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold' }}>
              ENTRY: ₹{algoData.entry}
            </div>
            <div style={{ background: '#00ff88', color: '#000', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold' }}>
              TARGET: ₹{algoData.target?.toFixed(2)}
            </div>
            <div style={{ background: '#ff4444', color: '#fff', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold' }}>
              SL: ₹{algoData.stop_loss?.toFixed(2)}
            </div>
            <div style={{ background: '#FFD700', color: '#000', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold' }}>
              TRAIL: ₹{algoData.trailing_sl?.toFixed(2)}
            </div>
          </div>
          <div style={{ marginTop: '10px', color: '#aaa', fontSize: '12px', fontFamily: 'monospace' }}>
            Yesterday: CE H:{algoData.yesterday?.ce_high} L:{algoData.yesterday?.ce_low} | PE H:{algoData.yesterday?.pe_high} L:{algoData.yesterday?.pe_low}<br />
            Combined: {algoData.combined_total} /2 = {algoData.single_common_value} → Breakout: {algoData.breakout_upper?.toFixed(2)} / {algoData.breakout_lower?.toFixed(2)}<br />
            Reversal: {algoData.reversal_upper?.toFixed(2)} / {algoData.reversal_lower?.toFixed(2)}
          </div>
        </div>
      ) : (
        <div className="bg-[#111c33]/90 border border-cyan-500/30 p-2.5 rounded-lg mt-2 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="font-bold text-white text-xs uppercase tracking-wide">
                ⚡ STRADDLE COMMON BEP /2 BREAKOUT MONITOR
              </span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold">
                STATUS: NO TRADE (MONITORING 5-MIN SPOT)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAlgoData(prev => ({
                    ...prev,
                    signal: "CE BUY - BREAKOUT CONFIRMED",
                    entry: 145.20,
                    target: 145.20 * 1.5,
                    stop_loss: 145.20 * 0.7,
                    trailing_sl: 145.20 * 0.85,
                    prompt: `BUY ${prev.atm_strike}CE @ 145.20 | TARGET 217.80 | SL 101.64 | TRAIL 123.42 | Logic: Spot ${(prev.breakout_upper + 20).toFixed(2)} > Breakout ${prev.breakout_upper} (Single Common ${prev.single_common_value})`
                  }));
                }}
                className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50 transition flex items-center gap-1"
                title="Test how CE BUY signal renders with 50% target and 15% trailing stop"
              >
                <span>⚡ Simulate CE Breakout</span>
              </button>
              <button
                onClick={() => {
                  setAlgoData(prev => ({
                    ...prev,
                    signal: "PE BUY - BREAKDOWN CONFIRMED",
                    entry: 123.50,
                    target: 123.50 * 1.5,
                    stop_loss: 123.50 * 0.7,
                    trailing_sl: 123.50 * 0.85,
                    prompt: `BUY ${prev.atm_strike}PE @ 123.50 | TARGET 185.25 | SL 86.45 | TRAIL 104.98 | Logic: Spot ${(prev.breakout_lower - 20).toFixed(2)} < Breakdown ${prev.breakout_lower}`
                  }));
                }}
                className="px-2 py-1 rounded text-[11px] font-bold bg-rose-600/30 text-rose-300 border border-rose-500/40 hover:bg-rose-600/50 transition flex items-center gap-1"
                title="Test how PE BUY signal renders with 50% target and 15% trailing stop"
              >
                <span>⚡ Simulate PE Breakdown</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-[#0a1324] p-2 rounded border border-yellow-500/20">
              <span className="text-[10px] text-yellow-400 font-bold block">BREAKOUT UPPER</span>
              <span className="text-sm font-bold text-white">₹{algoData.breakout_upper?.toFixed(2)}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Spot &gt; Upper = CE BUY</span>
            </div>
            <div className="bg-[#0a1324] p-2 rounded border border-yellow-500/20">
              <span className="text-[10px] text-yellow-400 font-bold block">BREAKDOWN LOWER</span>
              <span className="text-sm font-bold text-white">₹{algoData.breakout_lower?.toFixed(2)}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Spot &lt; Lower = PE BUY</span>
            </div>
            <div className="bg-[#0a1324] p-2 rounded border border-rose-500/20">
              <span className="text-[10px] text-rose-400 font-bold block">REVERSAL UPPER</span>
              <span className="text-sm font-bold text-white">₹{algoData.reversal_upper?.toFixed(2)}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Spot &gt;= Upper = Sell / PE</span>
            </div>
            <div className="bg-[#0a1324] p-2 rounded border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 font-bold block">REVERSAL LOWER</span>
              <span className="text-sm font-bold text-white">₹{algoData.reversal_lower?.toFixed(2)}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Spot &lt;= Lower = Buy CE</span>
            </div>
          </div>

          <div className="text-[10.5px] text-slate-400 mt-2 font-mono flex items-center justify-between border-t border-white/5 pt-1.5">
            <span>Yesterday: CE H:{algoData.yesterday?.ce_high} L:{algoData.yesterday?.ce_low} | PE H:{algoData.yesterday?.pe_high} L:{algoData.yesterday?.pe_low}</span>
            <span className="text-yellow-400 font-bold">Combined: {algoData.combined_total} /2 = {algoData.single_common_value} (Breakout Filter)</span>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. OVERVIEW TAB CONTENT (DEFAULT)                                     */}
      {/* ===================================================================== */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-2">
          
          {/* Dual Momentum Chart Section */}
          <div className={`transition-all duration-200 ${
            expandedCard === 'OVERVIEW_DUAL'
              ? 'fixed inset-0 z-50 bg-[#071022]/98 p-4 md:p-6 backdrop-blur-xl flex flex-col overflow-y-auto'
              : 'bg-[#1e293b]/80 border border-white/10 rounded-lg p-2.5 shadow-md backdrop-blur-md'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="w-2.5 h-0.5 bg-[#22c55e] inline-block rounded" />
                  <span className="font-semibold text-emerald-400">CE Momentum</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="w-2.5 h-0.5 bg-[#ef4444] inline-block rounded" />
                  <span className="font-semibold text-rose-400">PE Momentum</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-amber-300/80 font-mono">
                  <span className="border-b border-dashed border-amber-400 w-2.5 inline-block" />
                  <span>BEP Channel ({dynamicCeBep.toLocaleString('en-IN')} / {dynamicPeBep.toLocaleString('en-IN')})</span>
                </div>
                {expandedCard === 'OVERVIEW_DUAL' && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                    BIG SCREEN MODE (Press ESC to exit)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[10px] font-mono text-slate-400">
                  Intraday 5-Min Dual Momentum
                </div>

                <button
                  onClick={() => setExpandedCard(expandedCard === 'OVERVIEW_DUAL' ? null : 'OVERVIEW_DUAL')}
                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
                  title={expandedCard === 'OVERVIEW_DUAL' ? "Minimize (Esc)" : "Maximize / Big Screen"}
                >
                  {expandedCard === 'OVERVIEW_DUAL' ? (
                    <>
                      <Minimize2 className="w-3 h-3 text-cyan-400" />
                      <span className="hidden sm:inline">Minimize</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3 text-cyan-400" />
                      <span className="hidden sm:inline">Big Screen</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className={`w-full relative select-none ${expandedCard === 'OVERVIEW_DUAL' ? 'flex-1 min-h-[500px]' : 'h-[145px]'}`}>
              <svg 
                viewBox={`0 0 ${chartW} ${chartH}`} 
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="ceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="peGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Pivot Horizontal Grid Lines */}
                <line x1={paddingX} y1={getY(0.70)} x2={chartW - paddingX} y2={getY(0.70)} stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />
                <text x={paddingX - 4} y={getY(0.70) + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">R1</text>

                <line x1={paddingX} y1={getY(0.48)} x2={chartW - paddingX} y2={getY(0.48)} stroke="#334155" strokeWidth="0.8" />
                <text x={paddingX - 4} y={getY(0.48) + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">P</text>

                <line x1={paddingX} y1={getY(0.25)} x2={chartW - paddingX} y2={getY(0.25)} stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />
                <text x={paddingX - 4} y={getY(0.25) + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">S1</text>

                {/* BEP Channel Lines */}
                <line x1={paddingX} y1={getY(0.66)} x2={chartW - paddingX} y2={getY(0.66)} stroke="#eab308" strokeWidth="1.1" strokeDasharray="4,3" />
                <text x={chartW - paddingX + 4} y={getY(0.66) + 3} fill="#eab308" fontSize="8" fontFamily="monospace">CE BEP ({dynamicCeBep.toLocaleString('en-IN')})</text>

                <line x1={paddingX} y1={getY(0.33)} x2={chartW - paddingX} y2={getY(0.33)} stroke="#f97316" strokeWidth="1.1" strokeDasharray="4,3" />
                <text x={chartW - paddingX + 4} y={getY(0.33) + 3} fill="#f97316" fontSize="8" fontFamily="monospace">PE BEP ({dynamicPeBep.toLocaleString('en-IN')})</text>

                {/* CE & PE Area Fills */}
                <polygon 
                  points={`${getX(0, momentumData.length)},${chartH - paddingY} ${cePoints} ${getX(momentumData.length - 1, momentumData.length)},${chartH - paddingY}`}
                  fill="url(#ceGrad)" 
                />
                <polygon 
                  points={`${getX(0, momentumData.length)},${chartH - paddingY} ${pePoints} ${getX(momentumData.length - 1, momentumData.length)},${chartH - paddingY}`}
                  fill="url(#peGrad)" 
                />

                {/* CE Momentum Line */}
                <polyline fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={cePoints} />

                {/* PE Momentum Line */}
                <polyline fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pePoints} />

                {/* CE/PE Cross Markers */}
                {markers.map((m, idx) => {
                  const xPos = getX(m.index, momentumData.length);
                  const isCe = m.type === 'CE';
                  const badgeColor = isCe ? '#22c55e' : '#ef4444';
                  return (
                    <g key={idx}>
                      <line x1={xPos} y1={paddingY} x2={xPos} y2={chartH - paddingY} stroke={badgeColor} strokeWidth="1.1" strokeDasharray="2,2" />
                      <rect x={xPos - 22} y={paddingY - 13} width="44" height="13" rx="2.5" fill={isCe ? '#14532d' : '#7f1d1d'} stroke={badgeColor} strokeWidth="0.8" />
                      <text x={xPos} y={paddingY - 3.5} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace">
                        {m.label}
                      </text>
                      <circle cx={xPos} cy={getY(isCe ? momentumData[m.index].ce : momentumData[m.index].pe)} r="3" fill={badgeColor} stroke="#ffffff" strokeWidth="1" />
                    </g>
                  );
                })}

                {/* X-Axis Time Labels */}
                {['09:15', '10:00', '10:45', '11:30', '12:30', '13:15', '14:30', '15:30'].map((timeLabel, idx) => {
                  const foundIdx = momentumData.findIndex(d => d.time === timeLabel);
                  const x = foundIdx !== -1 ? getX(foundIdx, momentumData.length) : (paddingX + idx * 95);
                  return (
                    <text key={idx} x={x} y={chartH - 2} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                      {timeLabel}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Yesterday NIFTY Backtest Card */}
          <div className={`transition-all duration-200 ${
            expandedCard === 'OVERVIEW_BACKTEST'
              ? 'fixed inset-0 z-50 bg-[#071022]/98 p-4 md:p-6 backdrop-blur-xl flex flex-col overflow-y-auto space-y-3'
              : 'bg-[#1e293b]/80 border border-white/10 rounded-lg p-2.5 shadow-md backdrop-blur-md space-y-1.5'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                <h3 className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider">
                  Yesterday NIFTY Backtest
                </h3>
                {expandedCard === 'OVERVIEW_BACKTEST' && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                    BIG SCREEN MODE (Press ESC to exit)
                  </span>
                )}
              </div>

              <button
                onClick={() => setExpandedCard(expandedCard === 'OVERVIEW_BACKTEST' ? null : 'OVERVIEW_BACKTEST')}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
                title={expandedCard === 'OVERVIEW_BACKTEST' ? "Minimize (Esc)" : "Maximize / Big Screen"}
              >
                {expandedCard === 'OVERVIEW_BACKTEST' ? (
                  <>
                    <Minimize2 className="w-3 h-3 text-cyan-400" />
                    <span className="hidden sm:inline">Minimize</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3 text-cyan-400" />
                    <span className="hidden sm:inline">Big Screen</span>
                  </>
                )}
              </button>
            </div>

            {/* 4 Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <div className="bg-[#0f172a]/90 border border-white/5 rounded p-1.5 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">TOTAL TRADES</span>
                <div className="text-sm font-mono font-black text-white mt-0.5">{backtestStats.total_trades}</div>
              </div>

              <div className="bg-[#0f172a]/90 border border-white/5 rounded p-1.5 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">WIN RATE</span>
                <div className="text-sm font-mono font-black text-white mt-0.5">{backtestStats.win_rate}</div>
              </div>

              <div className="bg-[#0f172a]/90 border border-white/5 rounded p-1.5 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">WINS / LOSSES</span>
                <div className="text-sm font-mono font-black text-white mt-0.5">{backtestStats.wins_losses}</div>
              </div>

              <div className="bg-[#0f172a]/90 border border-white/5 rounded p-1.5 text-center">
                <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">NET PROFIT</span>
                <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">{backtestStats.net_profit}</div>
              </div>
            </div>

            {/* Compact Trades Table */}
            <div className="overflow-x-auto rounded border border-white/5">
              <table className="w-full text-left text-[10.5px] text-slate-300 font-mono">
                <thead className="bg-[#0f172a] text-[9.5px] uppercase text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="py-0.5 px-2 font-semibold">TIME</th>
                    <th className="py-0.5 px-2 font-semibold">TYPE</th>
                    <th className="py-0.5 px-2 font-semibold">STRIKE</th>
                    <th className="py-0.5 px-2 font-semibold">ENTRY</th>
                    <th className="py-0.5 px-2 font-semibold">EXIT</th>
                    <th className="py-0.5 px-2 font-semibold text-right">P&L</th>
                    <th className="py-0.5 px-2 font-semibold text-center">RESULT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-[#1e293b]/40">
                  {trades.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-700/30 transition">
                      <td className="py-0.5 px-2 text-slate-400 font-medium">{t.time}</td>
                      <td className="py-0.5 px-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                          t.type.includes('CE') 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-0.5 px-2 font-semibold text-white">{t.strike}</td>
                      <td className="py-0.5 px-2 text-slate-300">₹{Number(t.entry).toFixed(2)}</td>
                      <td className="py-0.5 px-2 text-slate-300">₹{Number(t.exit).toFixed(2)}</td>
                      <td className={`py-0.5 px-2 font-bold text-right ${t.isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.pnl}
                      </td>
                      <td className="py-0.5 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          t.result === 'TARGET HIT'
                            ? 'text-emerald-400 border border-emerald-500/30 bg-emerald-500/10'
                            : 'text-rose-400 border border-rose-500/30 bg-rose-500/10'
                        }`}>
                          {t.result === 'TARGET HIT' ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-2.5 h-2.5 text-rose-400" />
                          )}
                          <span>{t.result}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom 4 Small Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            <div className="h-14 flex flex-col justify-center px-3 rounded bg-[#1e293b]/80 border border-white/10 shadow-sm">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">NIFTY 50 SPOT</span>
              <div className="text-xs sm:text-sm font-mono font-black text-white mt-0.5">
                ₹{Number(marketData.spot).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="h-14 flex flex-col justify-center px-3 rounded bg-[#1e293b]/80 border border-white/10 shadow-sm">
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">ATM STRIKE</span>
              <div className="text-xs sm:text-sm font-mono font-black text-emerald-400 mt-0.5">{marketData.atm}</div>
            </div>

            <div className="h-14 flex flex-col justify-center px-3 rounded bg-[#1e293b]/80 border border-white/10 shadow-sm">
              <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">CE BEP</span>
              <div className="text-xs sm:text-sm font-mono font-black text-amber-300 mt-0.5">
                ₹{Number(marketData.ce_bep).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="h-14 flex flex-col justify-center px-3 rounded bg-[#1e293b]/80 border border-white/10 shadow-sm">
              <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">PE BEP</span>
              <div className="text-xs sm:text-sm font-mono font-black text-purple-300 mt-0.5">
                ₹{Number(marketData.pe_bep).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* COMMON STRADDLE BEP (MARKET MAKER TRAP CALCULATION) */}
          <div style={{display:'flex', gap:'10px', marginTop:'10px'}} className="flex-col sm:flex-row">
            <div style={{flex:1, background:'#1a1a2e', border:'2px solid #FFD700', padding:'10px', borderRadius:'8px'}} className="shadow-lg">
              <small style={{color:'#FFD700', fontWeight:'bold', letterSpacing:'0.5px'}}>COMMON BEP (UPPER)</small>
              <h3 style={{color:'#FFD700', margin:'4px 0 0 0', fontSize:'18px', fontWeight:'900', fontFamily:'monospace'}}>
                ₹{commonBep.common_bep_upper?.toFixed(2)}
              </h3>
              <small style={{color:'#aaa', fontSize:'10px', display:'block', marginTop:'2px'}}>{commonBep.logic}</small>
            </div>
            <div style={{flex:1, background:'#1a1a2e', border:'2px solid #00ff88', padding:'10px', borderRadius:'8px'}} className="shadow-lg">
              <small style={{color:'#00ff88', fontWeight:'bold'}}>
                CE H:{commonBep.ce_high} L:{commonBep.ce_low} | PE H:{commonBep.pe_high} L:{commonBep.pe_low}
              </small>
              <h4 style={{color:'#fff', margin:'4px 0 0 0', fontSize:'16px', fontWeight:'bold'}}>
                Combined: {commonBep.common_premium}
              </h4>
              <small style={{color:'#aaa', fontSize:'10px', display:'block', marginTop:'2px'}}>Market Maker Range</small>
            </div>
            <div style={{flex:1, background:'#1a1a2e', border:'2px solid #ff5555', padding:'10px', borderRadius:'8px'}} className="shadow-lg">
              <small style={{color:'#ff5555', fontWeight:'bold', letterSpacing:'0.5px'}}>COMMON BEP (LOWER)</small>
              <h3 style={{color:'#ff5555', margin:'4px 0 0 0', fontSize:'18px', fontWeight:'900', fontFamily:'monospace'}}>
                ₹{commonBep.common_bep_lower?.toFixed(2)}
              </h3>
              <small style={{color:'#aaa', fontSize:'10px', display:'block', marginTop:'2px'}}>Straddle Breakdown Barrier</small>
            </div>
          </div>

          {/* Prev Day High Low */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-[#1e293b]/60 border border-white/10 rounded p-2 text-center">
              <p className="text-[9px] text-gray-400 font-semibold">PREV DAY HIGH</p>
              <p className="text-xs font-bold text-green-400 font-mono">₹{Number(prevDay.prev_high).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p className="text-[8px] text-gray-500">NIFTY</p>
            </div>
            <div className="bg-[#1e293b]/60 border border-white/10 rounded p-2 text-center">
              <p className="text-[9px] text-gray-400 font-semibold">PREV DAY LOW</p>
              <p className="text-xs font-bold text-red-400 font-mono">₹{Number(prevDay.prev_low).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p className="text-[8px] text-gray-500">NIFTY</p>
            </div>
            <div className="bg-[#1e293b]/60 border border-white/10 rounded p-2 text-center">
              <p className="text-[9px] text-gray-400 font-semibold">PREV CLOSE</p>
              <p className="text-xs font-bold text-white font-mono">₹{Number(prevDay.prev_close).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p className="text-[8px] text-gray-500">Support / Resistance</p>
            </div>
          </div>

          {/* ================================================================= */}
          {/* SPOT CHART + PIVOT TABLE SECTION (Exact User Specification)       */}
          {/* ================================================================= */}
          <div className="spot-pivot-section flex flex-col lg:flex-row gap-3 mt-3">
            
            {/* NIFTY SPOT - 5 Min Chart (flex: 2) */}
            <div className={`transition-all duration-200 ${
              expandedCard === 'OVERVIEW_SPOT'
                ? 'fixed inset-0 z-50 bg-[#071022]/98 p-4 md:p-6 backdrop-blur-xl flex flex-col overflow-y-auto'
                : 'flex-[2] bg-[#1e293b]/80 border border-white/10 rounded-lg p-3 shadow-md backdrop-blur-md'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    NIFTY SPOT - 5 Min
                  </h3>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-bold">
                    ₹{Number(marketData.spot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  {expandedCard === 'OVERVIEW_SPOT' && (
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                      BIG SCREEN MODE (Press ESC to exit)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-[#38bdf8] inline-block rounded" />
                      <span className="text-cyan-300">Spot</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-[#eab308] inline-block rounded" />
                      <span className="text-yellow-400 font-bold">Pivot (PP)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-[#ef4444] inline-block rounded" />
                      <span className="text-rose-400">R1-R3</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-[#22c55e] inline-block rounded" />
                      <span className="text-emerald-400">S1-S3</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedCard(expandedCard === 'OVERVIEW_SPOT' ? null : 'OVERVIEW_SPOT')}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
                    title={expandedCard === 'OVERVIEW_SPOT' ? "Minimize (Esc)" : "Maximize / Big Screen"}
                  >
                    {expandedCard === 'OVERVIEW_SPOT' ? (
                      <>
                        <Minimize2 className="w-3 h-3 text-cyan-400" />
                        <span className="hidden sm:inline">Minimize</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3 text-cyan-400" />
                        <span className="hidden sm:inline">Big Screen</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className={`w-full ${expandedCard === 'OVERVIEW_SPOT' ? 'flex-1 min-h-[520px]' : 'min-h-[280px]'}`}>
                <NiftySpotChart 
                  spotData={spotCandles.length > 0 ? spotCandles : spotData} 
                  pivotLevels={pivot} 
                  algoLevels={algoData}
                  height={expandedCard === 'OVERVIEW_SPOT' ? (typeof window !== 'undefined' ? Math.max(window.innerHeight - 190, 520) : 580) : 280}
                />
              </div>
            </div>

            {/* PIVOT TABLE (flex: 1) */}
            <div className="flex-1 bg-[#1e293b]/80 border border-white/10 rounded-lg p-3 shadow-md backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>PIVOT TABLE</span>
                  </h3>
                  <span className="text-[10px] bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 px-2 py-0.5 rounded font-mono font-bold">
                    PP: ₹{pivot.PP.toFixed(2)}
                  </span>
                </div>

                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-xs font-mono">
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-rose-500/10 transition">
                        <td className="py-1 px-3 font-bold text-rose-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>R3</span>
                        </td>
                        <td className="py-1 px-3 text-right text-white font-semibold">
                          ₹{pivot.R3.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="hover:bg-rose-500/10 transition">
                        <td className="py-1 px-3 font-bold text-rose-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>R2</span>
                        </td>
                        <td className="py-1 px-3 text-right text-white font-semibold">
                          ₹{pivot.R2.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="hover:bg-orange-500/10 transition">
                        <td className="py-1 px-3 font-bold text-orange-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          <span>R1</span>
                        </td>
                        <td className="py-1 px-3 text-right text-white font-semibold">
                          ₹{pivot.R1.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      {/* PIVOT ROW - HIGHLIGHTED YELLOW AS SPECIFIED */}
                      <tr style={{ background: 'rgba(234, 179, 8, 0.25)' }} className="border-y border-yellow-400/50">
                        <td className="py-1.5 px-3 text-yellow-300 flex items-center gap-1.5 font-black">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                          <span>PIVOT</span>
                        </td>
                        <td className="py-1.5 px-3 text-right text-yellow-200 font-black text-sm">
                          ₹{pivot.PP.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="hover:bg-emerald-500/10 transition">
                        <td className="py-1 px-3 font-bold text-teal-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                          <span>S1</span>
                        </td>
                        <td className="py-1 px-3 text-right text-white font-semibold">
                          ₹{pivot.S1.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="hover:bg-emerald-500/10 transition">
                        <td className="py-1 px-3 font-bold text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>S2</span>
                        </td>
                        <td className="py-1 px-3 text-right text-white font-semibold">
                          ₹{pivot.S2.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="hover:bg-emerald-500/10 transition">
                        <td className="py-1 px-3 font-bold text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>S3</span>
                        </td>
                        <td className="py-1 px-3 text-right text-white font-semibold">
                          ₹{pivot.S3.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 mt-2 border-t border-white/5 pt-1.5 flex items-center justify-between font-mono">
                <span>Floor Pivot Points</span>
                <span className="text-slate-500">H: {prevDay.prev_high} • L: {prevDay.prev_low}</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. POSITIONS TAB CONTENT (EXPANDED DETAILED)                          */}
      {/* ===================================================================== */}
      {activeTab === "POSITIONS" && (
        <div className="bg-[#111d36]/80 border border-green-500/20 rounded-lg p-3 space-y-3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>💼 LIVE POSITION & P&L - Detailed (Alice Blue Live)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Real-time active open positions synchronized with Alice Blue Antares v3
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-2.5 py-1 rounded font-bold font-mono">
                Total P&L: +₹{Number(positionsData.total_pnl).toLocaleString('en-IN')}
              </span>
              <button 
                onClick={fetchLivePositions}
                className="h-7 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 border border-white/10"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {exitNotice && (
            <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{exitNotice}</span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0b1324] border border-white/5 p-2 rounded">
              <span className="text-[9.5px] uppercase text-slate-400 font-semibold">TOTAL REALIZED / UNREALIZED</span>
              <p className="text-sm font-bold font-mono text-green-400 mt-0.5">+₹{Number(positionsData.total_pnl).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-[#0b1324] border border-white/5 p-2 rounded">
              <span className="text-[9.5px] uppercase text-slate-400 font-semibold">TODAY'S NET P&L</span>
              <p className="text-sm font-bold font-mono text-blue-400 mt-0.5">+₹{Number(positionsData.day_pnl).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-[#0b1324] border border-white/5 p-2 rounded">
              <span className="text-[9.5px] uppercase text-slate-400 font-semibold">ALLOCATED CAPITAL</span>
              <p className="text-sm font-bold font-mono text-white mt-0.5">₹1,00,000</p>
            </div>
            <div className="bg-[#0b1324] border border-white/5 p-2 rounded">
              <span className="text-[9.5px] uppercase text-slate-400 font-semibold">ACTIVE CONTRACTS</span>
              <p className="text-sm font-bold font-mono text-amber-300 mt-0.5">{positionsData.positions.length} Open</p>
            </div>
          </div>

          {/* Expanded Table */}
          <div className="overflow-x-auto rounded border border-white/10">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b1324] text-[10px] uppercase text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-2 px-3">SYMBOL</th>
                  <th className="py-2 px-3">QTY</th>
                  <th className="py-2 px-3">AVG PRICE</th>
                  <th className="py-2 px-3">LTP</th>
                  <th className="py-2 px-3 text-right">P&L (₹)</th>
                  <th className="py-2 px-3 text-right">P&L (%)</th>
                  <th className="py-2 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#0f1c35]/50">
                {positionsData.positions.map((pos, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/20 transition">
                    <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {pos.symbol}
                    </td>
                    <td className="py-2 px-3 text-slate-300">{pos.qty}</td>
                    <td className="py-2 px-3 text-slate-300">₹{Number(pos.avg).toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-200 font-semibold">₹{Number(pos.ltp).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-400">
                      +₹{Number(pos.pnl).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-400">
                      +{pos.pnl_percent || ((pos.pnl / (pos.qty * pos.avg)) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button 
                        onClick={() => handleExitAll()}
                        className="bg-rose-600/80 hover:bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded font-sans transition"
                      >
                        Exit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button 
              onClick={handleExitAll}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-md shadow flex items-center gap-1.5 transition"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Exit All Positions</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Orders executed via Alice Blue Antares RMS • Broker confirmation logged
            </span>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. CHARTS TAB CONTENT (NIFTY SPOT 5-MIN & DUAL MOMENTUM CANDLESTICK) */}
      {/* ===================================================================== */}
      {activeTab === "CHARTS" && (
        <div className="space-y-3">
          
          {/* Sub-Tabs Selector Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0f1c35]/90 p-2 rounded-lg border border-cyan-500/30 shadow-md">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setChartSubTab("SPOT")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                  chartSubTab === "SPOT"
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
                <span>NIFTY SPOT - 5 MIN</span>
                <span className="bg-cyan-950 text-cyan-300 text-[9px] px-1.5 py-0.2 rounded font-mono">
                  ₹{Number(marketData.spot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </button>

              <button
                onClick={() => setChartSubTab("DUAL_MOMENTUM")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                  chartSubTab === "DUAL_MOMENTUM"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-300" />
                <span>DUAL MOMENTUM - 5 MIN</span>
                <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.2 rounded font-mono">
                  ATM {algoData?.atm_strike || 23050}
                </span>
              </button>
            </div>

            {/* Quick timeframe / broker badge */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                Lightweight Charts v5.2
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                5-Min Candlesticks
              </span>
            </div>
          </div>

          {/* Sub-Tab 1: NIFTY SPOT - 5 MIN */}
          {chartSubTab === "SPOT" && (
            <div className="space-y-3">
              <div className={`transition-all duration-200 ${
                expandedCard === 'CHARTS_SPOT'
                  ? 'fixed inset-0 z-50 bg-[#071022]/98 p-4 md:p-6 backdrop-blur-xl flex flex-col overflow-y-auto'
                  : 'bg-[#1e293b]/90 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-md'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      NIFTY SPOT - 5 MIN (CANDLESTICK)
                    </h3>
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded font-mono font-bold">
                      ₹{Number(marketData.spot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {expandedCard === 'CHARTS_SPOT' && (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                        BIG SCREEN MODE (Press ESC to exit)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Pivot Quick Summary Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 rounded font-bold">
                        PP: {pivot.PP}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                        R1: {pivot.R1}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                        R2: {pivot.R2}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                        S1: {pivot.S1}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                        S2: {pivot.S2}
                      </span>
                    </div>

                    {/* Min/Max Big Screen Button */}
                    <button
                      onClick={() => setExpandedCard(expandedCard === 'CHARTS_SPOT' ? null : 'CHARTS_SPOT')}
                      className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold border border-white/15 shadow-sm"
                      title={expandedCard === 'CHARTS_SPOT' ? "Minimize (Esc)" : "Maximize / Big Screen View"}
                    >
                      {expandedCard === 'CHARTS_SPOT' ? (
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

                {/* Spot Candlestick Chart */}
                <div className={`w-full ${expandedCard === 'CHARTS_SPOT' ? 'flex-1 min-h-[520px]' : 'min-h-[380px]'}`}>
                  <NiftySpotChart 
                    spotData={spotCandles.length > 0 ? spotCandles : spotData} 
                    pivotLevels={pivot} 
                    algoLevels={algoData}
                    height={expandedCard === 'CHARTS_SPOT' ? (typeof window !== 'undefined' ? Math.max(window.innerHeight - 190, 520) : 580) : 380} 
                  />
                </div>
              </div>

              {/* Bottom Pivot Table & Prev Day Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* 1. Prev Day OHLC */}
                <div className="bg-[#1e293b]/80 border border-white/10 rounded-lg p-3 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 border-b border-white/10 pb-1.5">
                    Previous Day Reference
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center p-2 rounded bg-[#0b1324]">
                      <span className="text-slate-400 font-sans">High</span>
                      <span className="font-bold text-emerald-400">₹{Number(prevDay.prev_high).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-[#0b1324]">
                      <span className="text-slate-400 font-sans">Low</span>
                      <span className="font-bold text-rose-400">₹{Number(prevDay.prev_low).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-[#0b1324]">
                      <span className="text-slate-400 font-sans">Close</span>
                      <span className="font-bold text-white">₹{Number(prevDay.prev_close).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-2 pt-1 border-t border-white/5">
                    Formula: Floor Pivot Points with 3 Resistances & 3 Supports
                  </div>
                </div>

                {/* 2 & 3. Pivot Breakdown Full Table */}
                <div className="lg:col-span-2 bg-[#1e293b]/80 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      PIVOT BREAKDOWN & S/R LEVELS
                    </h4>
                    <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded font-mono font-bold">
                      CENTRAL PIVOT: ₹{pivot.PP.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20">
                      <div className="text-[10px] text-rose-400 font-sans font-bold">R3 (High + 2*(PP-Low))</div>
                      <div className="text-sm font-bold text-white mt-0.5">₹{pivot.R3}</div>
                    </div>
                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20">
                      <div className="text-[10px] text-rose-400 font-sans font-bold">R2 (PP + (High-Low))</div>
                      <div className="text-sm font-bold text-white mt-0.5">₹{pivot.R2}</div>
                    </div>
                    <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                      <div className="text-[10px] text-orange-400 font-sans font-bold">R1 (2*PP - Low)</div>
                      <div className="text-sm font-bold text-white mt-0.5">₹{pivot.R1}</div>
                    </div>
                    <div className="p-2 rounded bg-yellow-400/20 border border-yellow-400/40">
                      <div className="text-[10px] text-yellow-300 font-sans font-black">PIVOT PP ((H+L+C)/3)</div>
                      <div className="text-sm font-black text-yellow-300 mt-0.5">₹{pivot.PP}</div>
                    </div>
                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <div className="text-[10px] text-emerald-400 font-sans font-bold">S1 (2*PP - High)</div>
                      <div className="text-sm font-bold text-white mt-0.5">₹{pivot.S1}</div>
                    </div>
                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <div className="text-[10px] text-emerald-400 font-sans font-bold">S2 (PP - (High-Low))</div>
                      <div className="text-sm font-bold text-white mt-0.5">₹{pivot.S2}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: DUAL MOMENTUM (CROSSOVER & 5-MIN CANDLESTICKS) */}
          {chartSubTab === "DUAL_MOMENTUM" && (
            <div className="space-y-3">
              
              {/* 1. INTRADAY 5-MIN DUAL MOMENTUM CROSSOVER CHART (IMAGE 1) */}
              <div className={`transition-all duration-200 ${
                expandedCard === 'CHARTS_DUAL_CROSSOVER'
                  ? 'fixed inset-0 z-50 bg-[#071022]/98 p-4 md:p-6 backdrop-blur-xl flex flex-col overflow-y-auto'
                  : 'bg-[#1e293b]/90 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-md'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-1 bg-[#22c55e] inline-block rounded" />
                      <span className="font-bold text-emerald-400">CE Momentum</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-1 bg-[#ef4444] inline-block rounded" />
                      <span className="font-bold text-rose-400">PE Momentum</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-xs text-amber-300 font-mono">
                      <span className="border-b border-dashed border-amber-400 w-3 inline-block" />
                      <span>BEP Channel ({dynamicCeBep.toLocaleString('en-IN')} / {dynamicPeBep.toLocaleString('en-IN')})</span>
                    </div>
                    {expandedCard === 'CHARTS_DUAL_CROSSOVER' && (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                        BIG SCREEN MODE (Press ESC to exit)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-xs font-mono text-slate-300 font-bold">
                      Intraday 5-Min Dual Momentum
                    </div>

                    <button
                      onClick={() => setExpandedCard(expandedCard === 'CHARTS_DUAL_CROSSOVER' ? null : 'CHARTS_DUAL_CROSSOVER')}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition flex items-center gap-1 text-xs font-semibold border border-white/10"
                      title={expandedCard === 'CHARTS_DUAL_CROSSOVER' ? "Minimize (Esc)" : "Maximize / Big Screen"}
                    >
                      {expandedCard === 'CHARTS_DUAL_CROSSOVER' ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline">Minimize</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline">Big Screen</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className={`w-full relative select-none ${expandedCard === 'CHARTS_DUAL_CROSSOVER' ? 'flex-1 min-h-[500px]' : 'h-[160px]'}`}>
                  <svg 
                    viewBox={`0 0 ${chartW} ${chartH}`} 
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="ceGradCharts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="peGradCharts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Pivot Horizontal Grid Lines */}
                    <line x1={paddingX} y1={getY(0.70)} x2={chartW - paddingX} y2={getY(0.70)} stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x={paddingX - 4} y={getY(0.70) + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">R1</text>

                    <line x1={paddingX} y1={getY(0.48)} x2={chartW - paddingX} y2={getY(0.48)} stroke="#334155" strokeWidth="0.8" />
                    <text x={paddingX - 4} y={getY(0.48) + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">P</text>

                    <line x1={paddingX} y1={getY(0.25)} x2={chartW - paddingX} y2={getY(0.25)} stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x={paddingX - 4} y={getY(0.25) + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">S1</text>

                    {/* BEP Channel Lines */}
                    <line x1={paddingX} y1={getY(0.66)} x2={chartW - paddingX} y2={getY(0.66)} stroke="#eab308" strokeWidth="1.1" strokeDasharray="4,3" />
                    <text x={chartW - paddingX + 4} y={getY(0.66) + 3} fill="#eab308" fontSize="8" fontFamily="monospace">CE BEP ({dynamicCeBep.toLocaleString('en-IN')})</text>

                    <line x1={paddingX} y1={getY(0.33)} x2={chartW - paddingX} y2={getY(0.33)} stroke="#f97316" strokeWidth="1.1" strokeDasharray="4,3" />
                    <text x={chartW - paddingX + 4} y={getY(0.33) + 3} fill="#f97316" fontSize="8" fontFamily="monospace">PE BEP ({dynamicPeBep.toLocaleString('en-IN')})</text>

                    {/* CE & PE Area Fills */}
                    <polygon 
                      points={`${getX(0, momentumData.length)},${chartH - paddingY} ${cePoints} ${getX(momentumData.length - 1, momentumData.length)},${chartH - paddingY}`}
                      fill="url(#ceGradCharts)" 
                    />
                    <polygon 
                      points={`${getX(0, momentumData.length)},${chartH - paddingY} ${pePoints} ${getX(momentumData.length - 1, momentumData.length)},${chartH - paddingY}`}
                      fill="url(#peGradCharts)" 
                    />

                    {/* CE Momentum Line */}
                    <polyline fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={cePoints} />

                    {/* PE Momentum Line */}
                    <polyline fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={pePoints} />

                    {/* CE/PE Cross Markers */}
                    {markers.map((m, idx) => {
                      const xPos = getX(m.index, momentumData.length);
                      const isCe = m.type === 'CE';
                      const badgeColor = isCe ? '#22c55e' : '#ef4444';
                      return (
                        <g key={idx}>
                          <line x1={xPos} y1={paddingY} x2={xPos} y2={chartH - paddingY} stroke={badgeColor} strokeWidth="1.2" strokeDasharray="2,2" />
                          <rect x={xPos - 24} y={paddingY - 14} width="48" height="14" rx="3" fill={isCe ? '#14532d' : '#7f1d1d'} stroke={badgeColor} strokeWidth="0.8" />
                          <text x={xPos} y={paddingY - 3.5} textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                            {m.label}
                          </text>
                          <circle cx={xPos} cy={getY(isCe ? momentumData[m.index].ce : momentumData[m.index].pe)} r="3.5" fill={badgeColor} stroke="#ffffff" strokeWidth="1.2" />
                        </g>
                      );
                    })}

                    {/* X-Axis Time Labels */}
                    {['09:15', '10:00', '10:45', '11:30', '12:30', '13:15', '14:30', '15:30'].map((timeLabel, idx) => {
                      const foundIdx = momentumData.findIndex(d => d.time === timeLabel);
                      const x = foundIdx !== -1 ? getX(foundIdx, momentumData.length) : (paddingX + idx * 95);
                      return (
                        <text key={idx} x={x} y={chartH - 2} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                          {timeLabel}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* 2. STRADDLE COMMON BEP TRAP CALCULATION BOX */}
              <div style={{display:'flex', gap:'10px'}} className="flex-col sm:flex-row">
                <div style={{flex:1, background:'#1a1a2e', border:'2px solid #FFD700', padding:'10px', borderRadius:'8px'}} className="shadow-lg">
                  <small style={{color:'#FFD700', fontWeight:'bold', letterSpacing:'0.5px'}}>COMMON BEP (UPPER)</small>
                  <h3 style={{color:'#FFD700', margin:'4px 0 0 0', fontSize:'18px', fontWeight:'900', fontFamily:'monospace'}}>
                    ₹{commonBep.common_bep_upper?.toFixed(2)}
                  </h3>
                  <small style={{color:'#aaa', fontSize:'10px', display:'block', marginTop:'2px'}}>{commonBep.logic}</small>
                </div>
                <div style={{flex:1, background:'#1a1a2e', border:'2px solid #00ff88', padding:'10px', borderRadius:'8px'}} className="shadow-lg">
                  <small style={{color:'#00ff88', fontWeight:'bold'}}>
                    CE H:{commonBep.ce_high} L:{commonBep.ce_low} | PE H:{commonBep.pe_high} L:{commonBep.pe_low}
                  </small>
                  <h4 style={{color:'#fff', margin:'4px 0 0 0', fontSize:'16px', fontWeight:'bold'}}>
                    Combined: {commonBep.common_premium}
                  </h4>
                  <small style={{color:'#aaa', fontSize:'10px', display:'block', marginTop:'2px'}}>Market Maker Range</small>
                </div>
                <div style={{flex:1, background:'#1a1a2e', border:'2px solid #ff5555', padding:'10px', borderRadius:'8px'}} className="shadow-lg">
                  <small style={{color:'#ff5555', fontWeight:'bold', letterSpacing:'0.5px'}}>COMMON BEP (LOWER)</small>
                  <h3 style={{color:'#ff5555', margin:'4px 0 0 0', fontSize:'18px', fontWeight:'900', fontFamily:'monospace'}}>
                    ₹{commonBep.common_bep_lower?.toFixed(2)}
                  </h3>
                  <small style={{color:'#aaa', fontSize:'10px', display:'block', marginTop:'2px'}}>Straddle Breakdown Barrier</small>
                </div>
              </div>

              {/* 3. DUAL CE & PE 5-MIN CANDLESTICK CHARTS (IMAGE 2) */}
              <DualMomentumChart 
                ceData={dualCandleData?.ce_candles || []} 
                peData={dualCandleData?.pe_candles || []} 
                strike={algoData?.atm_strike || 23050}
                commonBep={commonBep}
                levels={dualCandleData?.levels || commonBep?.levels}
                markers={dualCandleData?.markers || []}
                isMaximized={expandedCard === 'CHARTS_DUAL_CANDLES'}
                onToggleMaximize={() => setExpandedCard(expandedCard === 'CHARTS_DUAL_CANDLES' ? null : 'CHARTS_DUAL_CANDLES')}
              />

              {/* 4. Strategy Rules & Crossover Indicators Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="bg-[#1e293b]/80 border border-white/10 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>CE Momentum Signal (Green)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Triggers when CE momentum crosses above PE momentum. Target: +30 to +40 pts, SL: 20 pts.
                  </p>
                </div>

                <div className="bg-[#1e293b]/80 border border-white/10 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>PE Momentum Signal (Red)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Triggers when PE momentum crosses above CE momentum. Target: +30 to +40 pts, SL: 20 pts.
                  </p>
                </div>

                <div className="bg-[#1e293b]/80 border border-white/10 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span>BEP Channel Filter</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Break-even points ({dynamicCeBep.toLocaleString('en-IN')} CE / {dynamicPeBep.toLocaleString('en-IN')} PE) confirm directional breakouts and trailing stops.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. STOCKS TAB CONTENT (EXPANDED WITH SMART SEARCH & REMOVE BUTTON)    */}
      {/* ===================================================================== */}
      {activeTab === "STOCKS" && (
        <div className="bg-[#111d36]/80 border border-white/10 rounded-lg p-3 space-y-3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>📈 STOCKS - Alice Blue NSE Live Watchlist</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono font-bold">
                  {stocksList.length} Stocks Active
                </span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Type any NSE stock to instantly preview & add • Click Remove to delete anytime
              </p>
            </div>

            {/* Smart Stock Search & Add Bar */}
            <div className="relative flex items-center gap-2" ref={searchContainerRef}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search NSE Stock (e.g. SBIN, TATA, RELIANCE)..." 
                  value={stockSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setStockSearch(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && stockSearch.trim()) {
                      handleAddStock(stockSearch);
                    }
                  }}
                  className="bg-[#0b1324] text-white text-xs pl-8 pr-7 py-1.5 rounded-md w-64 sm:w-72 placeholder:text-slate-400 border border-white/15 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-inner"
                />
                {stockSearch && (
                  <button 
                    onClick={() => setStockSearch("")}
                    className="absolute right-2 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Instant Suggestions Dropdown (Shows whenever user types) */}
                {isSearchFocused && trimmedSearch.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#0b1324] border border-blue-500/40 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-white/5">
                    
                    {matchingSuggestions.length > 0 ? (
                      matchingSuggestions.slice(0, 6).map((item, idx) => {
                        const inWatchlist = stocksList.some(s => s.symbol.toUpperCase() === item.symbol.toUpperCase());
                        return (
                          <div 
                            key={idx}
                            onClick={() => !inWatchlist && handleAddStock(item)}
                            className="p-2 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition group"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs">{item.symbol}</span>
                                <span className="text-[10px] text-slate-400 hidden sm:inline">{item.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Prev H/L: {item.hl} • Signal: {item.signal}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-right font-mono">
                                <div className="text-xs font-bold text-white">₹{item.ltp}</div>
                                <div className={`text-[10px] ${item.isGreen ? 'text-emerald-400' : item.isRed ? 'text-rose-400' : 'text-slate-400'}`}>
                                  {item.change}
                                </div>
                              </div>

                              {inWatchlist ? (
                                <span className="text-[10px] bg-white/10 text-slate-400 px-2 py-0.5 rounded font-sans">
                                  ✓ Added
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddStock(item);
                                  }}
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-2.5 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition"
                           onClick={() => handleAddStock(stockSearch)}>
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span>{stockSearch.toUpperCase()}</span>
                            <span className="text-[10px] text-slate-400">(NSE Stock)</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Click to add this custom ticker to live watchlist</p>
                        </div>
                        <button 
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 shadow"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    )}

                    {matchingSuggestions.length > 0 && !matchingSuggestions.some(s => s.symbol.toUpperCase() === stockSearch.trim().toUpperCase()) && (
                      <div 
                        onClick={() => handleAddStock(stockSearch)}
                        className="p-2 bg-blue-950/40 hover:bg-blue-900/60 cursor-pointer flex items-center justify-between text-blue-300 text-xs transition"
                      >
                        <span>Add custom symbol <strong>"{stockSearch.toUpperCase()}"</strong> to watchlist</span>
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleAddStock(stockSearch)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1 shadow transition flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* User notification toast */}
          {stockNotice && (
            <div className="p-2 bg-blue-500/15 border border-blue-500/30 rounded text-blue-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>{stockNotice}</span>
              </div>
              <button onClick={() => setStockNotice("")} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Full Expanded Watchlist Table */}
          <div className="overflow-x-auto rounded border border-white/10">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b1324] text-[10px] uppercase text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-2 px-3">STOCK</th>
                  <th className="py-2 px-3">LTP (₹)</th>
                  <th className="py-2 px-3">CHANGE</th>
                  <th className="py-2 px-3">PREV HIGH / LOW</th>
                  <th className="py-2 px-3">MOMENTUM</th>
                  <th className="py-2 px-3">SIGNAL</th>
                  <th className="py-2 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#0f1c35]/50">
                {filteredStocks.length > 0 ? (
                  filteredStocks.map((stk, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/20 transition group">
                      <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${stk.isGreen ? 'bg-emerald-400' : stk.isRed ? 'bg-rose-400' : 'bg-amber-400'}`} />
                        <div>
                          <div>{stk.symbol}</div>
                          {stk.name && <div className="text-[9px] text-slate-400 font-sans font-normal truncate max-w-[140px]">{stk.name}</div>}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-100 font-semibold">
                        ₹{Number(stk.ltp).toLocaleString('en-IN')}
                      </td>
                      <td className={`py-2 px-3 font-bold ${stk.isGreen ? 'text-emerald-400' : stk.isRed ? 'text-rose-400' : 'text-slate-300'}`}>
                        {stk.change}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{stk.hl}</td>
                      <td className={`py-2 px-3 ${stk.isGreen ? 'text-emerald-400' : stk.isRed ? 'text-rose-400' : 'text-slate-300'}`}>
                        {stk.mom}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          stk.isGreen 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : stk.isRed 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {stk.signal}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          <button 
                            onClick={() => alert(`Initiated scan for ${stk.symbol} on Alice Blue Antares.`)}
                            className="bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded transition shadow-sm"
                          >
                            Trade
                          </button>
                          
                          {/* REMOVE BUTTON TO DELETE FROM WATCHLIST */}
                          <button 
                            onClick={() => handleRemoveStock(stk.symbol)}
                            className="bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 hover:text-white text-[10px] font-semibold px-2 py-0.5 rounded transition flex items-center gap-1 shadow-sm"
                            title={`Remove ${stk.symbol} from watchlist`}
                          >
                            <Trash2 className="w-2.5 h-2.5 text-rose-400" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center bg-[#0b1324]/60">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-slate-300 text-xs">
                          No active stock in your watchlist matches <strong className="text-blue-400">"{stockSearch}"</strong>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Click below to immediately add it to your live tracking watchlist:
                        </p>
                        <button 
                          onClick={() => handleAddStock(stockSearch)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-md inline-flex items-center gap-1.5 shadow transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add "{stockSearch.toUpperCase()}" to Watchlist</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Watchlist is saved automatically • Synchronized with Alice Blue Antares feed</span>
            <span className="font-mono text-slate-500">{stocksList.length} items total</span>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. ANALYTICS TAB CONTENT                                              */}
      {/* ===================================================================== */}
      {activeTab === "ANALYTICS" && (
        <div className="bg-[#111d36]/80 border border-white/10 rounded-lg p-3 space-y-3">
          
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>📊 Yesterday Backtest, Win Rate & P&L Analytics</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Vino Algo ORB strategy performance breakdown with trade execution log
              </p>
            </div>
            <button 
              onClick={fetchBacktestData}
              disabled={loadingBacktest}
              className="h-7 px-2.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition"
            >
              <RotateCcw className={`w-3 h-3 ${loadingBacktest ? 'animate-spin' : ''}`} />
              <span>{loadingBacktest ? 'Refreshing...' : 'Re-run Analytics'}</span>
            </button>
          </div>

          {/* 4 Key Performance Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0b1324] border border-white/5 p-2.5 rounded text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">TOTAL TRADES</span>
              <div className="text-base font-mono font-black text-white mt-1">{backtestStats.total_trades}</div>
              <span className="text-[9px] text-slate-500">1 Intraday + 2 Breakouts</span>
            </div>

            <div className="bg-[#0b1324] border border-white/5 p-2.5 rounded text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">WIN RATE</span>
              <div className="text-base font-mono font-black text-emerald-400 mt-1">{backtestStats.win_rate}</div>
              <span className="text-[9px] text-slate-500">Benchmark: 60%+</span>
            </div>

            <div className="bg-[#0b1324] border border-white/5 p-2.5 rounded text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">WINS / LOSSES</span>
              <div className="text-base font-mono font-black text-white mt-1">{backtestStats.wins_losses}</div>
              <span className="text-[9px] text-slate-500">2 Target / 1 SL</span>
            </div>

            <div className="bg-[#0b1324] border border-white/5 p-2.5 rounded text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400">NET REALIZED P&L</span>
              <div className="text-base font-mono font-black text-emerald-400 mt-1">{backtestStats.net_profit}</div>
              <span className="text-[9px] text-slate-500">After SL & Target</span>
            </div>
          </div>

          {/* Performance Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-[#0b1324]/80 border border-white/5 p-2.5 rounded">
              <span className="text-[10px] uppercase font-bold text-slate-400">Risk-to-Reward Ratio</span>
              <p className="text-sm font-mono font-bold text-white mt-1">1 : 2.0</p>
              <p className="text-[10px] text-slate-500 mt-0.5">SL = 20 pts • Target = 40 pts</p>
            </div>
            <div className="bg-[#0b1324]/80 border border-white/5 p-2.5 rounded">
              <span className="text-[10px] uppercase font-bold text-slate-400">Max Trade Gain</span>
              <p className="text-sm font-mono font-bold text-emerald-400 mt-1">+₹1,500.00</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{algoData?.atm_strike || 23050} CE @ 09:21 AM</p>
            </div>
            <div className="bg-[#0b1324]/80 border border-white/5 p-2.5 rounded">
              <span className="text-[10px] uppercase font-bold text-slate-400">Max Drawdown</span>
              <p className="text-sm font-mono font-bold text-rose-400 mt-1">-₹500.00</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{algoData?.atm_strike || 23050} PE @ 10:45 AM</p>
            </div>
          </div>

          {/* Backtest Execution Table */}
          <div className="overflow-x-auto rounded border border-white/10">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b1324] text-[10px] uppercase text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-1.5 px-3">TIME</th>
                  <th className="py-1.5 px-3">TYPE</th>
                  <th className="py-1.5 px-3">STRIKE</th>
                  <th className="py-1.5 px-3">ENTRY</th>
                  <th className="py-1.5 px-3">EXIT</th>
                  <th className="py-1.5 px-3 text-right">P&L</th>
                  <th className="py-1.5 px-3 text-center">RESULT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#0f1c35]/50">
                {trades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-700/20 transition">
                    <td className="py-1.5 px-3 text-slate-400">{t.time}</td>
                    <td className="py-1.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        t.type.includes('CE') 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' 
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 font-semibold text-white">{t.strike}</td>
                    <td className="py-1.5 px-3 text-slate-300">₹{Number(t.entry).toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-slate-300">₹{Number(t.exit).toFixed(2)}</td>
                    <td className={`py-1.5 px-3 font-bold text-right ${t.isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnl}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        t.result === 'TARGET HIT'
                          ? 'text-emerald-400 border border-emerald-500/30 bg-emerald-500/10'
                          : 'text-rose-400 border border-rose-500/30 bg-rose-500/10'
                      }`}>
                        {t.result === 'TARGET HIT' ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-2.5 h-2.5 text-rose-400" />
                        )}
                        <span>{t.result}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. PROFILE & ACCOUNT TAB                                              */}
      {/* ===================================================================== */}
      {activeTab === "PROFILE" && (
        <div className="mt-2">
          <Profile onSwitchTab={setActiveTab} />
        </div>
      )}

    </div>
  );
}

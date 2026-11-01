import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertOctagon, RefreshCw, CheckCircle2, TrendingUp, TrendingDown, Lock, DollarSign } from 'lucide-react';

export default function Risk() {
  // Config Inputs
  const [maxLoss, setMaxLoss] = useState(2000);
  const [maxProfit, setMaxProfit] = useState(4000);
  const [maxTrades, setMaxTrades] = useState(3);

  // Live Risk Status from Backend
  const [riskStatus, setRiskStatus] = useState({
    daily_pnl: 0.0,
    max_loss: 2000.0,
    max_profit: 4000.0,
    trades_taken: 0,
    max_trades: 3,
    remaining_trades: 3,
    can_trade: true,
    risk_breached: false,
    reason: 'Risk checks passed. Order permitted.'
  });

  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // 1. Fetch Risk Status
  const fetchRiskStatus = async () => {
    try {
      const res = await fetch('/api/risk/status');
      if (res.ok) {
        const data = await res.json();
        setRiskStatus(data);
        setMaxLoss(data.max_loss);
        setMaxProfit(data.max_profit);
        setMaxTrades(data.max_trades);
      }
    } catch (err) {
      console.warn('Error fetching risk status:', err);
    }
  };

  useEffect(() => {
    fetchRiskStatus();
    const interval = setInterval(fetchRiskStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // 2. Save Risk Configuration
  const handleSaveRiskConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/risk/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_loss: parseFloat(maxLoss),
          max_profit: parseFloat(maxProfit),
          max_trades: parseInt(maxTrades)
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSaveMsg('✅ Risk limits updated and saved in memory.');
        fetchRiskStatus();
      } else {
        setSaveMsg(`❌ ${data.detail || 'Could not save risk settings.'}`);
      }
    } catch (err) {
      setSaveMsg(`❌ Error: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // 3. Emergency Stop / Kill Switch
  const handleEmergencyStop = async () => {
    if (!confirm('🚨 EMERGENCY STOP: Square off ALL open positions immediately and lock trading?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/squareoff/all', { method: 'POST' });
      const data = await res.json();
      alert(`Emergency Stop Executed: ${data.message}`);
      fetchRiskStatus();
    } catch (err) {
      alert(`Failed to execute emergency stop: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Progress metrics
  const pnl = riskStatus.daily_pnl;
  const isLoss = pnl < 0;
  const isProfit = pnl > 0;

  // Percentage of max loss consumed (0% to 100%)
  const lossPercent = isLoss ? Math.min(100, Math.round((Math.abs(pnl) / riskStatus.max_loss) * 100)) : 0;
  // Percentage of profit target achieved (0% to 100%)
  const profitPercent = isProfit ? Math.min(100, Math.round((pnl / riskStatus.max_profit) * 100)) : 0;

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-6 space-y-6">

      {/* Header Banner */}
      <div className="glass-panel p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Institutional Risk Manager</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 ${
              riskStatus.can_trade
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}>
              {riskStatus.can_trade ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              {riskStatus.can_trade ? 'TRADING ACTIVE' : 'RISK CUTOFF HIT'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Strict Capital Preservation Guard • Hard Stop Limits • Trade Limit Enforcer
          </p>
        </div>

        {/* Big Emergency Kill Switch Button */}
        <button
          onClick={handleEmergencyStop}
          disabled={loading}
          className="w-full md:w-auto bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold px-6 py-3 rounded-xl shadow-xl shadow-rose-900/30 flex items-center justify-center gap-2 text-sm transition transform hover:-translate-y-0.5"
        >
          <AlertOctagon className="w-5 h-5 animate-pulse" />
          <span>🚨 EMERGENCY STOP (KILL SWITCH)</span>
        </button>
      </div>

      {/* Main Split: Live Status & Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Live Risk Monitor Metrics (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📊 Real-Time Daily Risk Monitor</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">Updated every 2s</span>
          </div>

          {/* Today's P&L Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Today's Net Realized P&L</span>
              <div className={`font-mono text-3xl font-extrabold mt-1 ${isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-white'}`}>
                {pnl >= 0 ? '+' : ''}₹ {Number(pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex gap-4 text-center">
              <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Trades Taken</div>
                <div className="text-white font-mono font-bold text-lg">{riskStatus.trades_taken} / {riskStatus.max_trades}</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Remaining</div>
                <div className="text-blue-400 font-mono font-bold text-lg">{riskStatus.remaining_trades}</div>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4">
            
            {/* Daily Max Loss Buffer */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Daily Max Loss Buffer (Limit: ₹ {riskStatus.max_loss})
                </span>
                <span className="font-mono text-rose-400 font-bold">{lossPercent}% Consumed</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${lossPercent}%` }}
                />
              </div>
            </div>

            {/* Daily Profit Target */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Daily Profit Target (Goal: ₹ {riskStatus.max_profit})
                </span>
                <span className="font-mono text-emerald-400 font-bold">{profitPercent}% Achieved</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${profitPercent}%` }}
                />
              </div>
            </div>

          </div>

          {/* Current Risk Guard Status Notice */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            riskStatus.can_trade
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {riskStatus.can_trade ? (
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <Lock className="w-5 h-5 flex-shrink-0 text-rose-400" />
            )}
            <div>
              <div className="font-bold">{riskStatus.can_trade ? 'Risk Guard: ACTIVE & SAFE' : 'Risk Guard: TRADING LOCKED'}</div>
              <div className="text-[11px] opacity-90 mt-0.5">{riskStatus.reason}</div>
            </div>
          </div>
        </div>

        {/* Right Column: Risk Rule Inputs (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚙️ Risk Parameters</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">In-Memory Rule Guard</span>
          </div>

          <form onSubmit={handleSaveRiskConfig} className="space-y-4">
            
            {/* Daily Max Loss */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Daily Max Loss (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-xs text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min={100}
                  step={100}
                  value={maxLoss}
                  onChange={(e) => setMaxLoss(e.target.value)}
                  className="input-field pl-8 font-mono text-sm font-bold text-rose-400"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Auto halts all trading once daily loss hits this ceiling.
              </span>
            </div>

            {/* Daily Max Profit */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Daily Max Profit (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-xs text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min={100}
                  step={100}
                  value={maxProfit}
                  onChange={(e) => setMaxProfit(e.target.value)}
                  className="input-field pl-8 font-mono text-sm font-bold text-emerald-400"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Secures gains and stops further trading for the day.
              </span>
            </div>

            {/* Max Trades Per Day */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Max Trades Per Day
              </label>
              <input
                type="number"
                required
                min={1}
                max={20}
                value={maxTrades}
                onChange={(e) => setMaxTrades(e.target.value)}
                className="input-field font-mono text-sm font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Prevents over-trading during choppy market sessions.
              </span>
            </div>

            {/* Save Message */}
            {saveMsg && (
              <div className="text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                {saveMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={savingConfig}
              className="btn-primary !py-2.5 text-xs font-bold"
            >
              {savingConfig ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Rules...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update Risk Rules</span>
                </>
              )}
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}

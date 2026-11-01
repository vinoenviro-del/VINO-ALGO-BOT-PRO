import React, { useState, useEffect } from 'react';
import { Wallet, User, RefreshCw, IndianRupee, Layers, CheckCircle } from 'lucide-react';

export default function ProfileFunds() {
  const [profile, setProfile] = useState(null);
  const [funds, setFunds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profRes, fundsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/funds')
      ]);

      if (profRes.ok && fundsRes.ok) {
        const profData = await profRes.json();
        const fundsData = await fundsRes.json();
        setProfile(profData);
        setFunds(fundsData);
      } else {
        setError('Could not fetch account details.');
      }
    } catch (err) {
      setError('Connection to backend failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-[540px] w-full mx-auto px-4 py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
        <span>Loading Profile & Funds from Alice Blue...</span>
      </div>
    );
  }

  if (error || !profile || !funds) {
    return null;
  }

  return (
    <div className="max-w-[540px] w-full mx-auto px-4 mb-8 space-y-4">
      {/* Funds Card */}
      <div className="glass-panel p-5 relative overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Alice Blue Funds & Margin</span>
          </div>
          <button
            onClick={fetchData}
            title="Refresh funds"
            className="text-slate-400 hover:text-white transition p-1 rounded-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Available Cash</div>
            <div className="text-emerald-400 font-mono font-bold text-sm sm:text-base mt-0.5">
              ₹ {funds.available_cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Used Margin</div>
            <div className="text-amber-400 font-mono font-bold text-sm sm:text-base mt-0.5">
              ₹ {funds.used_margin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Balance</div>
            <div className="text-white font-mono font-bold text-sm sm:text-base mt-0.5">
              ₹ {funds.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          <User className="w-4 h-4 text-blue-400" />
          <span>Trader Profile</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Account Name</span>
            <span className="text-white font-semibold">{profile.user_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Client Code</span>
            <span className="font-mono text-blue-400 font-bold">{profile.client_id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Exchanges</span>
            <div className="flex gap-1.5 flex-wrap">
              {profile.exchanges.map((ex) => (
                <span key={ex} className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {ex}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Products</span>
            <div className="flex gap-1.5 flex-wrap">
              {profile.products.map((p) => (
                <span key={p} className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

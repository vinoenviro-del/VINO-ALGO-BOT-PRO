import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Key, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState('');
  const [isTotpCode, setIsTotpCode] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!clientId.trim()) {
      setErrorMsg('Please enter your Alice Blue Client ID.');
      return;
    }

    if (!password.trim() && !apiKey.trim()) {
      setErrorMsg('Please enter your Alice Blue Password or API Key.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        client_id: clientId.trim(),
        password: password.trim() || '',
        totp: totp.trim() || '',
        api_key: apiKey.trim() || ''
      };

      // Call backend directly on http://127.0.0.1:8000/api/alice-login with proxy fallback
      let res;
      try {
        res = await fetch('http://127.0.0.1:8000/api/alice-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (networkErr) {
        // Fallback to relative URL if direct call hit browser restriction
        res = await fetch('/api/alice-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setErrorMsg(errorData.message || errorData.detail || `Server error (${res.status}). Verify backend is running on port 8000.`);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.status === 'success' || data.success) {
        const token = data.token || 'mock_alice_token_123';
        const client = data.client || data.client_id || clientId.trim();
        
        setSuccessMsg(data.message || 'Connected (Mock) - Alice Blue Linked!');
        
        // Save token to localStorage and navigate to Dashboard
        localStorage.setItem('alice_token', token);
        localStorage.setItem('alice_client_id', client);

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(token, client);
          }
        }, 350);
      } else {
        setErrorMsg(data.message || data.detail || 'Login failed. Please check Client ID and Password.');
      }
    } catch (err) {
      setErrorMsg(`Connection error: ${err.message}. Please ensure backend is running at http://127.0.0.1:8000`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a0e1a] via-[#111827] to-[#1e293b] p-4 sm:p-6 font-sans">
      
      {/* Centered Glassmorphism Card */}
      <div className="max-w-md w-full bg-[#1e293b]/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-purple-600/30 border border-blue-500/30 text-2xl mb-3 shadow-lg shadow-blue-500/10">
            🐘
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            VINO ALGO BOT
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Connect to Alice Blue Antares live trading
          </p>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-3 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Client ID */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Client ID (User ID) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. 123456"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700/80 rounded-xl p-2.5 pl-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Alice Blue ANT password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700/80 rounded-xl p-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* TOTP Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isTotpCode ? '2FA TOTP Code' : 'TOTP Secret Key'}
              </label>
              <button
                type="button"
                onClick={() => setIsTotpCode(!isTotpCode)}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition"
              >
                {isTotpCode ? 'Use Secret Key' : 'Enter 6-digit code'}
              </button>
            </div>
            <div className="relative">
              <input
                type={isTotpCode ? 'text' : 'password'}
                maxLength={isTotpCode ? 6 : undefined}
                placeholder={isTotpCode ? 'e.g. 123456' : 'TOTP Secret Key for pyotp'}
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                className={`w-full bg-[#0f172a] border border-slate-700/80 rounded-xl p-2.5 pl-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                  isTotpCode ? 'font-mono tracking-widest' : ''
                }`}
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Developer API Key (Optional) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                API Key
              </label>
              <span className="text-[10px] text-slate-500">Optional</span>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="Alice Blue Developer API Key (optional)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700/80 rounded-xl p-2.5 pl-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Connect Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Connecting to Alice Blue...</span>
              </>
            ) : (
              <span>Connect to Alice Blue 🚀</span>
            )}
          </button>

        </form>

        <div className="mt-5 text-center text-[10px] text-slate-500 font-mono">
          VINO ALGO • Alice Blue Antares v3
        </div>

      </div>

    </div>
  );
}

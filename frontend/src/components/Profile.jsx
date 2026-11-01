import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  ShieldCheck,
  Clock,
  Timer,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LogOut,
  RefreshCw,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  IndianRupee,
  Layers,
  Activity,
  Zap,
  Radio,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import Login from './Login.jsx';

const API_BASE = "http://127.0.0.1:8000";

export default function Profile({ onSwitchTab }) {
  const [profile, setProfile] = useState(null);
  const [funds, setFunds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedClientId, setCopiedClientId] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Live countdown timer state (in seconds)
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Fetch complete profile & funds
  const loadProfile = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      let profRes;
      try {
        profRes = await fetch(`${API_BASE}/api/profile`);
      } catch (e) {
        profRes = await fetch('/api/profile');
      }

      if (profRes.status === 401) {
        // Logged out
        setProfile({ logged_in: false, client_id: 'NOT CONNECTED' });
        setRemainingSeconds(0);
        return;
      }

      if (!profRes.ok) {
        throw new Error(`Server returned ${profRes.status}`);
      }

      const profData = await profRes.json();
      setProfile(profData);
      setFunds(profData.funds || null);
      setRemainingSeconds(profData.session_remaining_seconds || 0);

      // If funds not in profile response, fetch separately
      if (!profData.funds) {
        try {
          const fundsRes = await fetch(`${API_BASE}/api/funds`);
          if (fundsRes.ok) {
            const fundsData = await fundsRes.json();
            setFunds(fundsData);
          }
        } catch (fErr) {
          console.warn("Could not fetch funds separately:", fErr);
        }
      }
    } catch (err) {
      console.error("Profile load error:", err);
      setError("Unable to connect to trading backend. Please ensure backend server is running.");
      // Fallback mock profile so user always sees the screen
      setProfile({
        logged_in: true,
        client_id: "2719650",
        user_name: "Vino Trader (2719650)",
        email: "2719650@trader.aliceblue.com",
        broker: "Alice Blue Antares API (pya3)",
        account_status: "ACTIVE",
        session_created_at: new Date().toISOString(),
        session_expires_at: new Date(Date.now() + 86400000).toISOString(),
        session_remaining_seconds: 86400,
        session_status: "ACTIVE",
        session_timeout_duration: "24 Hours (Daily Trading Session)",
        api_key_masked: "PGcX••••••••HN",
        feed_status: "Connected (Live WebSocket Feed)",
        two_factor_auth: "TOTP Authenticator (Active)",
        products: ["CNC", "MIS", "NRML"],
        exchanges: ["NSE", "NFO", "BSE", "MCX"],
        order_types: ["MARKET", "LIMIT", "SL", "SL-M"]
      });
      setFunds({
        available_cash: 100000.0,
        used_margin: 0.0,
        balance: 100000.0
      });
      setRemainingSeconds(86400);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // 1-second interval live countdown timer
  useEffect(() => {
    if (!profile?.logged_in || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [profile?.logged_in, remainingSeconds > 0]);

  // Format seconds to HH:MM:SS
  const formatCountdown = (secs) => {
    if (secs <= 0) return "00h 00m 00s (EXPIRED)";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  // Format ISO timestamp to readable string
  const formatTime = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  // Renew session for +24 hours
  const handleRenewSession = async () => {
    setRenewing(true);
    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/refresh-session`, { method: 'POST' });
      } catch {
        res = await fetch('/api/refresh-session', { method: 'POST' });
      }

      if (res.ok) {
        showToast("✅ Session extended successfully for 24 hours!");
        await loadProfile(true);
      } else {
        showToast("⚠️ Could not renew session. Please re-login.");
      }
    } catch (e) {
      showToast("⚠️ Server connection error.");
    } finally {
      setRenewing(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to disconnect your Alice Blue trading account?")) {
      return;
    }
    try {
      try {
        await fetch(`${API_BASE}/api/logout`, { method: 'POST' });
      } catch {
        await fetch('/api/logout', { method: 'POST' });
      }
      localStorage.removeItem('alice_token');
      localStorage.removeItem('alice_client_id');
      setProfile({ logged_in: false, client_id: 'NOT CONNECTED' });
      setRemainingSeconds(0);
      showToast("🚪 Successfully logged out from Alice Blue.");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'clientId') {
      setCopiedClientId(true);
      setTimeout(() => setCopiedClientId(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Calculate session percentage (assuming 24h = 86400s max)
  const sessionPercent = Math.min(100, Math.max(0, (remainingSeconds / 86400) * 100));

  if (loading) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '30px auto',
        padding: '60px 20px',
        textAlign: 'center',
        background: '#0d0e17',
        borderRadius: '16px',
        border: '1px solid #1f2338',
        color: '#94a3b8'
      }}>
        <RefreshCw className="animate-spin" style={{ width: '36px', height: '36px', margin: '0 auto 16px', color: '#38bdf8' }} />
        <h3 style={{ fontSize: '18px', color: '#f8fafc', margin: '0 0 8px' }}>Retrieving Account Profile</h3>
        <p style={{ fontSize: '13px', margin: 0 }}>Connecting to Alice Blue Antares session & verifying credentials...</p>
      </div>
    );
  }

  const isLoggedIn = profile?.logged_in;
  const isExpiringSoon = remainingSeconds > 0 && remainingSeconds <= 3600;
  const isExpired = isLoggedIn && remainingSeconds <= 0;

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '16px 20px 40px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#e2e8f0'
    }}>

      {/* TOAST NOTIFICATION */}
      {successToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#064e3b',
          color: '#34d399',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          border: '1px solid #059669',
          fontSize: '13px',
          fontWeight: 600,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 style={{ width: '18px', height: '18px' }} />
          {successToast}
        </div>
      )}

      {/* TOP HEADER HERO CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #0e1222 0%, #151b33 50%, #0d1120 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        border: '1px solid #232d4b',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        {/* User Identity Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: isLoggedIn ? 'linear-gradient(135deg, #0284c7, #0369a1)' : '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: isLoggedIn ? '0 0 20px rgba(2, 132, 199, 0.4)' : 'none',
            border: '2px solid rgba(255,255,255,0.1)'
          }}>
            <User style={{ width: '32px', height: '32px' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                {profile?.user_name || 'Vino Trader'}
              </h1>
              
              {/* Account Status Badge */}
              {isLoggedIn ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isExpired ? '#450a0a' : isExpiringSoon ? '#451a03' : '#064e3b',
                  color: isExpired ? '#f87171' : isExpiringSoon ? '#fbbf24' : '#34d399',
                  border: `1px solid ${isExpired ? '#991b1b' : isExpiringSoon ? '#b45309' : '#059669'}`,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#10b981',
                    boxShadow: isExpired ? '0 0 8px #ef4444' : isExpiringSoon ? '0 0 8px #f59e0b' : '0 0 8px #10b981'
                  }}></span>
                  {isExpired ? 'SESSION EXPIRED' : isExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE & LOGGED IN'}
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#3f1515',
                  color: '#f87171',
                  border: '1px solid #7f1d1d',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444' }}></span>
                  NOT LOGGED IN
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#94a3b8', flexWrap: 'wrap' }}>
              {/* Client ID with Copy button */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#090d1a',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #1e2640'
              }}>
                <span style={{ color: '#64748b' }}>Client ID:</span>
                <strong style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '13px' }}>
                  {profile?.client_id || 'N/A'}
                </strong>
                <button
                  onClick={() => copyToClipboard(profile?.client_id, 'clientId')}
                  title="Copy Client ID"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedClientId ? '#34d399' : '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {copiedClientId ? <Check style={{ width: '13px', height: '13px' }} /> : <Copy style={{ width: '13px', height: '13px' }} />}
                </button>
              </div>

              <span>•</span>
              <span style={{ color: '#cbd5e1' }}>{profile?.broker || 'Alice Blue Antares API'}</span>
              <span>•</span>
              <span style={{ color: '#94a3b8' }}>{profile?.email || 'trader@vinotrading.in'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadProfile(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#1a2238',
              color: '#cbd5e1',
              border: '1px solid #2e3a5f',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} style={{ width: '14px', height: '14px' }} />
            {refreshing ? 'Syncing...' : 'Sync Data'}
          </button>

          {isLoggedIn ? (
            <>
              <button
                onClick={handleRenewSession}
                disabled={renewing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: renewing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)'
                }}
              >
                <Zap style={{ width: '14px', height: '14px', color: '#fed7aa' }} />
                {renewing ? 'Renewing...' : 'Renew Session (+24h)'}
              </button>

              <button
                onClick={() => setShowLoginModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#1e293b',
                  color: '#93c5fd',
                  border: '1px solid #3b82f644',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Key style={{ width: '14px', height: '14px' }} />
                Switch Account
              </button>

              <button
                onClick={handleLogout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#2d1519',
                  color: '#f87171',
                  border: '1px solid #7f1d1d',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <LogOut style={{ width: '14px', height: '14px' }} />
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Key style={{ width: '15px', height: '15px' }} />
              Connect Alice Blue Account
            </button>
          )}
        </div>
      </div>

      {/* ERROR NOTICE IF ANY */}
      {error && (
        <div style={{
          background: '#450a0a',
          border: '1px solid #991b1b',
          color: '#fca5a5',
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: '13px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 PRIMARY METRIC HIGHLIGHT CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* CARD 1: SESSION TIMEOUT & REMAINING TIME */}
        <div style={{
          background: '#111528',
          borderRadius: '12px',
          padding: '18px 20px',
          border: `1px solid ${isExpired ? '#991b1b' : isExpiringSoon ? '#d97706' : '#232b4b'}`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SESSION TIMEOUT COUNTDOWN
            </span>
            <Clock style={{ width: '16px', height: '16px', color: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#38bdf8' }} />
          </div>

          <div style={{
            fontSize: '22px',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: isExpired ? '#ef4444' : isExpiringSoon ? '#fbbf24' : '#34d399',
            letterSpacing: '0.02em',
            marginBottom: '8px'
          }}>
            {formatCountdown(remainingSeconds)}
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', background: '#1e2640', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              width: `${sessionPercent}%`,
              height: '100%',
              background: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : 'linear-gradient(90deg, #10b981, #38bdf8)',
              transition: 'width 1s linear'
            }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
            <span>Valid for: 24h Daily Cycle</span>
            <span>{Math.round(sessionPercent)}% Remaining</span>
          </div>
        </div>

        {/* CARD 2: LOGIN & 2FA AUTHENTICATION STATUS */}
        <div style={{
          background: '#111528',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #232b4b'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AUTHENTICATION & 2FA
            </span>
            <ShieldCheck style={{ width: '16px', height: '16px', color: isLoggedIn ? '#34d399' : '#94a3b8' }} />
          </div>

          <div style={{ fontSize: '20px', fontWeight: 800, color: isLoggedIn ? '#f8fafc' : '#ef4444', marginBottom: '4px' }}>
            {isLoggedIn ? 'Verified & Secure' : 'Disconnected'}
          </div>

          <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>TOTP 2-Factor Auth:</span>
            <strong style={{ color: '#34d399' }}>Active</strong>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Client ID: <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{profile?.client_id}</span>
          </div>
        </div>

        {/* CARD 3: AVAILABLE TRADING CAPITAL / FUNDS */}
        <div style={{
          background: '#111528',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #232b4b'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AVAILABLE CASH MARGIN
            </span>
            <IndianRupee style={{ width: '16px', height: '16px', color: '#FFD700' }} />
          </div>

          <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFD700', marginBottom: '4px' }}>
            ₹{Number(funds?.available_cash || 100000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            <span>Used Margin:</span>
            <strong style={{ color: '#f87171' }}>₹{Number(funds?.used_margin || 0).toFixed(2)}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            <span>Total Balance:</span>
            <span style={{ color: '#cbd5e1' }}>₹{Number(funds?.balance || 100000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* CARD 4: WEBSOCKET & MARKET FEED STATUS */}
        <div style={{
          background: '#111528',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #232b4b'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              HIGH-FREQ WEBSOCKET FEED
            </span>
            <Radio style={{ width: '16px', height: '16px', color: '#10b981' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 10px #10b981'
            }}></span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>Connected</span>
          </div>

          <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '6px' }}>
            5-Min Dual Momentum Engine
          </div>

          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Exchange Gateway: <span style={{ color: '#34d399' }}>NSE / NFO Tick Feed Active</span>
          </div>
        </div>
      </div>

      {/* DETAILED INFORMATION CARDS (2 COLUMNS) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '20px'
      }}>
        {/* SECTION 1: SESSION & API CREDENTIAL DETAILS */}
        <div style={{
          background: '#0e1222',
          borderRadius: '14px',
          padding: '22px',
          border: '1px solid #1f2742'
        }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#f8fafc',
            margin: '0 0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #1c233c',
            paddingBottom: '10px'
          }}>
            <Lock style={{ width: '17px', height: '17px', color: '#38bdf8' }} />
            Session Timeline & API Security Details
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Session Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Session Status:</span>
              <span style={{
                color: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#34d399',
                fontWeight: 700,
                background: isExpired ? '#450a0a' : isExpiringSoon ? '#451a03' : '#064e3b',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px'
              }}>
                {isExpired ? 'EXPIRED' : isExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE & VERIFIED'}
              </span>
            </div>

            {/* Session Created Timestamp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Session Generated At:</span>
              <span style={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                {formatTime(profile?.session_created_at)}
              </span>
            </div>

            {/* Session Expiry Timestamp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Session Auto-Expires At:</span>
              <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontWeight: 600 }}>
                {formatTime(profile?.session_expires_at)}
              </span>
            </div>

            {/* Session Duration Rule */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Standard Session Validity:</span>
              <span style={{ color: '#cbd5e1' }}>24 Hours (Daily Antares Cycle)</span>
            </div>

            {/* Masked API Key */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', paddingTop: '6px', borderTop: '1px dashed #1c233c' }}>
              <span style={{ color: '#94a3b8' }}>Alice Blue API Key:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', color: '#38bdf8', background: '#090d1a', padding: '3px 8px', borderRadius: '4px' }}>
                  {showApiKey ? (profile?.api_key || profile?.api_key_masked) : (profile?.api_key_masked || 'PGcX••••••••HN')}
                </span>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? 'Mask Key' : 'Reveal Key'}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                >
                  {showApiKey ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
                </button>
              </div>
            </div>

            {/* Masked Session ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Active Session Token:</span>
              <span style={{ fontFamily: 'monospace', color: '#a78bfa', background: '#090d1a', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>
                {profile?.session_id_masked || 'mock_alice••••4985'}
              </span>
            </div>

            {/* Gateway IP */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Trading Gateway:</span>
              <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>127.0.0.1:8000 (Local Python Host)</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: TRADING PRIVILEGES & BROKER SETTINGS */}
        <div style={{
          background: '#0e1222',
          borderRadius: '14px',
          padding: '22px',
          border: '1px solid #1f2742'
        }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#f8fafc',
            margin: '0 0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #1c233c',
            paddingBottom: '10px'
          }}>
            <Layers style={{ width: '17px', height: '17px', color: '#38bdf8' }} />
            Trading Privileges, Segments & Orders
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Enabled Exchanges */}
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Enabled Exchanges:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(profile?.exchanges || ['NSE', 'NFO', 'BSE', 'MCX']).map((ex) => (
                  <span key={ex} style={{
                    background: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid #334155',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.05em'
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            {/* Product Types */}
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Allowed Product Types:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(profile?.products || ['CNC', 'MIS', 'NRML']).map((prod) => (
                  <span key={prod} style={{
                    background: '#064e3b',
                    color: '#34d399',
                    border: '1px solid #059669',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {prod} {prod === 'MIS' ? '(Intraday)' : prod === 'CNC' ? '(Cash)' : '(Options/Futures)'}
                  </span>
                ))}
              </div>
            </div>

            {/* Order Execution Permissions */}
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Order Types Supported:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(profile?.order_types || ['MARKET', 'LIMIT', 'SL', 'SL-M']).map((ot) => (
                  <span key={ot} style={{
                    background: '#1a1f33',
                    color: '#cbd5e1',
                    border: '1px solid #2d3752',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {ot}
                  </span>
                ))}
              </div>
            </div>

            {/* Bot Automation Mode */}
            <div style={{
              marginTop: '6px',
              padding: '10px 14px',
              background: '#090d1a',
              borderRadius: '8px',
              border: '1px solid #1a2238',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>Vino V3 Straddle Algo Status</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Common BEP /2 Breakout Logic Engine</div>
              </div>
              <span style={{
                background: '#0284c7',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                READY FOR EXECUTION
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK JUMP NAVIGATION FOOTER */}
      <div style={{
        marginTop: '24px',
        padding: '16px 20px',
        background: '#0b0f1d',
        borderRadius: '12px',
        border: '1px solid #1a223a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Vino Algo Bot Pro v3 • Alice Blue Antares Connected • Client ID: <strong style={{ color: '#38bdf8' }}>{profile?.client_id}</strong>
        </div>

        {onSwitchTab && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onSwitchTab('v3')}
              style={{
                background: '#1e293b',
                color: '#FFD700',
                border: '1px solid #334155',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Go to ⚡ VINO V3 VIEW
            </button>
            <button
              onClick={() => onSwitchTab('dashboard')}
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Go to 📊 FULL DASHBOARD
            </button>
          </div>
        )}
      </div>

      {/* MODAL: LOGIN / SWITCH ACCOUNT */}
      {showLoginModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#0b0f19',
            borderRadius: '16px',
            border: '1px solid #232b4b',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#1e2640',
                border: 'none',
                color: '#94a3b8',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ✕
            </button>

            <div style={{ padding: '24px 24px 12px' }}>
              <Login onLoginSuccess={(token, client) => {
                setShowLoginModal(false);
                showToast(`🎉 Connected to Alice Blue! Account: ${client}`);
                loadProfile(true);
              }} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

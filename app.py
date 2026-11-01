"""
================================================================================
Vino Nifty 50 + Stocks Combo Bot - Web Dashboard & Localhost Server
================================================================================
A self-contained web server and live trading terminal for http://localhost:5000.
Requires NO external web dependencies (uses Python's built-in http.server with Threading).

Features:
  - Real-time Dashboard with live Nifty 50 Spot LTP and 5-min High/Low tracker
  - Start / Stop Bot background process with 1-click
  - Paper Trading Toggle (Instant simulation vs live broker execution)
  - Alice Blue Connection Diagnostic & Session Validator
  - Live Position & P&L Card with Trailing Stop Loss Progress
  - Manual Breakout Signal Simulator (Test CE / PE in Paper Mode)
  - Emergency 1-Click Square-Off
  - Strategy Settings Editor (Updates config & .env)
  - Real-time Live Log Viewer streaming logs/trades.log
================================================================================
"""

import sys
import os

# Ensure safe UTF-8 encoding on Windows console
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import json
import time
import socket
import logging
import threading
from pathlib import Path
from datetime import datetime, date
from typing import Dict, Any, Optional, Tuple
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Ensure local directory is in python path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import config
import bot
from bot import VinoNiftyBot, StateManager

# ==============================================================================
# GLOBAL BOT WORKER CONTROLLER
# ==============================================================================
class BotController:
    """Manages the background execution of the trading bot."""
    def __init__(self):
        self.bot_instance: Optional[VinoNiftyBot] = None
        self.bot_thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()
        self.state_mgr = StateManager()

    def is_running(self) -> bool:
        return (
            self.bot_instance is not None
            and getattr(self.bot_instance, "is_running", False)
            and self.bot_thread is not None
            and self.bot_thread.is_alive()
        )

    def start(self) -> Tuple[bool, str]:
        with self.lock:
            if self.is_running():
                return False, "Bot is already running."

            try:
                # Reload config in case .env was modified
                if hasattr(config, "load_dotenv"):
                    config.load_dotenv(dotenv_path=config.ENV_PATH, override=True)

                self.bot_instance = VinoNiftyBot()
                self.bot_thread = threading.Thread(
                    target=self._run_bot_worker,
                    name="VinoBotWorkerThread",
                    daemon=True
                )
                self.bot_thread.start()
                return True, "Trading bot started successfully."
            except Exception as e:
                return False, f"Failed to start bot: {e}"

    def _run_bot_worker(self):
        try:
            if self.bot_instance:
                self.bot_instance.run()
        except Exception as e:
            bot.logger.error(f"[BotController] Unhandled worker exception: {e}")
        finally:
            if self.bot_instance:
                self.bot_instance.is_running = False

    def stop(self) -> Tuple[bool, str]:
        with self.lock:
            if not self.is_running():
                return False, "Bot is not running."

            try:
                if self.bot_instance:
                    self.bot_instance.is_running = False
                    self.bot_instance.shutdown()
                return True, "Trading bot stopped successfully."
            except Exception as e:
                return False, f"Error stopping bot: {e}"

    def get_status(self) -> Dict[str, Any]:
        """Gathers unified status from running bot or persisted state."""
        state = self.state_mgr.load_state()

        running = self.is_running()
        active_pos = None
        nifty_ltp = 0.0
        ws_status = "Disconnected"

        if running and self.bot_instance:
            state = self.bot_instance.state_mgr.state
            if self.bot_instance.index_instrument:
                nifty_ltp = self.bot_instance.feed.get_ltp(self.bot_instance.index_instrument)
            ws_status = "Connected" if self.bot_instance.feed.ws_active else "Polling"

            # Check if active position has live LTP
            if state.get("active_position"):
                pos = state["active_position"]
                pos_inst = pos.get("instrument")
                if pos_inst:
                    cur_opt_ltp = self.bot_instance.feed.get_ltp(pos_inst, default_price=pos["entry_price"])
                else:
                    cur_opt_ltp = pos.get("entry_price", 150.0)

                pnl_pts = cur_opt_ltp - pos["entry_price"]
                pnl_inr = pnl_pts * pos["quantity"]
                active_pos = {
                    **pos,
                    "current_ltp": cur_opt_ltp,
                    "pnl_points": round(pnl_pts, 2),
                    "pnl_rupees": round(pnl_inr, 2)
                }

        # If not running or no active position live quote, use stored active position
        if not active_pos and state.get("active_position"):
            pos = state["active_position"]
            cur_opt_ltp = pos.get("highest_ltp_seen", pos.get("entry_price", 150.0))
            pnl_pts = cur_opt_ltp - pos["entry_price"]
            pnl_inr = pnl_pts * pos["quantity"]
            active_pos = {
                **pos,
                "current_ltp": cur_opt_ltp,
                "pnl_points": round(pnl_pts, 2),
                "pnl_rupees": round(pnl_inr, 2)
            }

        # Calculate Total Closed P&L for today
        closed_trades = state.get("closed_trades", [])
        total_pnl_rupees = sum(t.get("pnl_rupees", 0.0) for t in closed_trades)
        total_pnl_pts = sum(t.get("pnl_points", 0.0) for t in closed_trades)

        if active_pos:
            total_pnl_rupees += active_pos["pnl_rupees"]
            total_pnl_pts += active_pos["pnl_points"]

        now_str = datetime.now().strftime("%H:%M:%S")

        # Determine Market Phase
        if now_str < config.MARKET_OPEN_TIME:
            market_phase = "PRE-MARKET (Waiting for 09:15 AM)"
        elif config.MARKET_OPEN_TIME <= now_str < config.RANGE_END_TIME:
            market_phase = "RANGE CAPTURE (09:15 - 09:20 AM)"
        elif config.RANGE_END_TIME <= now_str < config.TRADE_CUTOFF_TIME:
            market_phase = "BREAKOUT SCANNING (09:20 AM - 03:00 PM)"
        elif config.TRADE_CUTOFF_TIME <= now_str < config.SQUARE_OFF_TIME:
            market_phase = "POSITION MONITORING (Cutoff Passed)"
        else:
            market_phase = "MARKET CLOSED (Square-off Passed)"

        return {
            "status": "RUNNING" if running else "STOPPED",
            "is_running": running,
            "market_phase": market_phase,
            "current_time": now_str,
            "current_date": date.today().isoformat(),
            "paper_trade": config.PAPER_TRADE,
            "ws_status": ws_status,
            "nifty_ltp": nifty_ltp if nifty_ltp > 0 else (state.get("range_high") or 24500.0),
            "range_captured": state.get("range_captured", False),
            "range_high": state.get("range_high"),
            "range_low": state.get("range_low"),
            "trade_taken_today": state.get("trade_taken_today", False),
            "active_position": active_pos,
            "closed_trades": closed_trades,
            "total_pnl_rupees": round(total_pnl_rupees, 2),
            "total_pnl_points": round(total_pnl_pts, 2),
            "config": {
                "bot_name": config.BOT_NAME,
                "stop_loss_points": config.STOP_LOSS_POINTS,
                "target_points": config.TARGET_POINTS,
                "trailing_sl_activation": config.TRAILING_SL_ACTIVATION,
                "nifty_lots": config.NIFTY_LOTS,
                "nifty_lot_size": config.NIFTY_LOT_SIZE,
                "user_id": config.ALICE_USER_ID,
                "has_api_key": bool(config.ALICE_API_KEY)
            }
        }

    def emergency_exit(self) -> Tuple[bool, str]:
        """Manually exits any active position."""
        if not self.is_running() or not self.bot_instance:
            # Fallback: Close in state directly
            state = self.state_mgr.load_state()
            active = state.get("active_position")
            if not active:
                return False, "No active trade to exit."
            exit_ltp = active.get("current_sl", active.get("entry_price", 150.0))
            self.state_mgr.record_exit({
                "exit_price": exit_ltp,
                "exit_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "exit_reason": "MANUAL_WEB_EXIT",
                "status": "MANUALLY_CLOSED",
                "pnl_points": round(exit_ltp - active["entry_price"], 2),
                "pnl_rupees": round((exit_ltp - active["entry_price"]) * active["quantity"], 2)
            })
            return True, "Active trade closed manually."

        # Bot is running: call exit_trade
        active = self.bot_instance.state_mgr.state.get("active_position")
        if not active:
            return False, "No active trade to exit."

        opt_ltp = self.bot_instance.feed.get_ltp(active["instrument"], default_price=active["entry_price"])
        self.bot_instance.exit_trade(active, opt_ltp, reason="MANUAL_WEB_EXIT")
        return True, "Manual exit order executed successfully."

    def simulate_signal(self, is_call: bool) -> Tuple[bool, str]:
        """Allows testing trade execution with simulated breakout."""
        if not self.is_running() or not self.bot_instance:
            return False, "Please START the bot first to test trade execution."

        state = self.bot_instance.state_mgr.state
        if state.get("active_position"):
            return False, "Cannot simulate: Trade already active. Square off first."

        # Temporarily reset trade_taken_today for test simulation
        state["trade_taken_today"] = False

        spot = 24550.0
        if state.get("range_high"):
            spot = (state["range_high"] + 5.0) if is_call else (state["range_low"] - 5.0)

        self.bot_instance.execute_trade_signal(is_call=is_call, spot_price=spot)
        return True, f"Simulated {'BUY ATM CE (Call)' if is_call else 'BUY ATM PE (Put)'} executed."

    def reset_state(self) -> Tuple[bool, str]:
        today_str = date.today().isoformat()
        default_state = {
            "date": today_str,
            "range_captured": False,
            "range_high": None,
            "range_low": None,
            "trade_taken_today": False,
            "active_position": None,
            "closed_trades": []
        }
        self.state_mgr.save_state(default_state)
        if self.bot_instance:
            self.bot_instance.state_mgr.state = default_state
        return True, "Daily state and range reset successfully."

# Initialize singleton controller
controller = BotController()


# ==============================================================================
# HTML / CSS / JS SINGLE-PAGE APPLICATION DASHBOARD
# ==============================================================================
DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vino Nifty 50 + Stocks Combo Bot - Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-body: #0a0d14;
            --bg-card: #121824;
            --bg-card-subtle: #182234;
            --border: #1e293b;
            --border-highlight: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent-green: #10b981;
            --accent-green-glow: rgba(16, 185, 129, 0.2);
            --accent-red: #f43f5e;
            --accent-red-glow: rgba(244, 63, 94, 0.2);
            --accent-blue: #3b82f6;
            --accent-amber: #f59e0b;
            --accent-purple: #8b5cf6;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-body);
            color: var(--text-main);
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }

        /* Top Navbar */
        header {
            background: rgba(18, 24, 36, 0.85);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
            padding: 14px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 50;
        }

        .brand-box {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #2563eb, #10b981);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 0 15px rgba(37, 99, 235, 0.35);
        }

        .brand-title {
            font-size: 17px;
            font-weight: 800;
            letter-spacing: -0.3px;
            background: linear-gradient(to right, #ffffff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .brand-sub {
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 500;
        }

        .header-center {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-pill.running {
            background: var(--accent-green-glow);
            color: var(--accent-green);
            border: 1px solid var(--accent-green);
        }

        .status-pill.stopped {
            background: var(--accent-red-glow);
            color: var(--accent-red);
            border: 1px solid var(--accent-red);
        }

        .mode-pill {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .mode-pill.paper {
            background: rgba(245, 158, 11, 0.15);
            color: var(--accent-amber);
            border: 1px solid var(--accent-amber);
        }

        .mode-pill.paper:hover {
            background: rgba(245, 158, 11, 0.25);
        }

        .mode-pill.live {
            background: var(--accent-red-glow);
            color: var(--accent-red);
            border: 1px solid var(--accent-red);
        }

        .clock-badge {
            font-family: 'JetBrains Mono', monospace;
            background: var(--bg-card-subtle);
            border: 1px solid var(--border);
            padding: 5px 12px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            color: #cbd5e1;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 8px 18px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
        }

        .btn-start {
            background: linear-gradient(135deg, #059669, #10b981);
            color: #ffffff;
            box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
        }

        .btn-start:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);
        }

        .btn-stop {
            background: linear-gradient(135deg, #e11d48, #f43f5e);
            color: #ffffff;
            box-shadow: 0 2px 10px rgba(244, 63, 94, 0.3);
        }

        .btn-stop:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(244, 63, 94, 0.45);
        }

        .btn-subtle {
            background: var(--bg-card-subtle);
            border: 1px solid var(--border);
            color: var(--text-main);
        }

        .btn-subtle:hover {
            background: var(--border);
            border-color: var(--border-highlight);
        }

        /* Container */
        .dashboard-container {
            flex: 1;
            max-width: 1560px;
            width: 100%;
            margin: 0 auto;
            padding: 24px 28px;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        /* KPI Cards Grid */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
        }

        .kpi-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--border-highlight);
        }

        .kpi-card.green::before { background: var(--accent-green); }
        .kpi-card.blue::before { background: var(--accent-blue); }
        .kpi-card.amber::before { background: var(--accent-amber); }
        .kpi-card.purple::before { background: var(--accent-purple); }

        .kpi-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .kpi-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 28px;
            font-weight: 700;
            color: var(--text-main);
            letter-spacing: -0.5px;
        }

        .kpi-sub {
            font-size: 12px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* Main Workspace Split */
        .workspace-split {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 20px;
        }

        @media (max-width: 1080px) {
            .workspace-split {
                grid-template-columns: 1fr;
            }
        }

        /* Card container */
        .panel {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 22px;
            display: flex;
            flex-direction: column;
            gap: 18px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
            padding-bottom: 12px;
        }

        .panel-title {
            font-size: 15px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Visual Range Bar */
        .range-box {
            background: var(--bg-card-subtle);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .range-bar-track {
            position: relative;
            height: 12px;
            background: #1e293b;
            border-radius: 6px;
            overflow: hidden;
            margin: 10px 0;
        }

        .range-bar-fill {
            position: absolute;
            left: 20%;
            width: 60%;
            height: 100%;
            background: linear-gradient(to right, #0284c7, #3b82f6);
            border-radius: 4px;
        }

        .range-marker-needle {
            position: absolute;
            top: -4px;
            bottom: -4px;
            width: 4px;
            background: #ffffff;
            border-radius: 2px;
            box-shadow: 0 0 10px #ffffff;
            transition: left 0.3s ease;
        }

        .range-values-row {
            display: flex;
            justify-content: space-between;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
        }

        /* Active Position Card */
        .position-box {
            background: linear-gradient(145deg, #131c2e, #0e1624);
            border: 1px solid #1e3a5f;
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            position: relative;
        }

        .position-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            border: 1px solid #3b82f6;
        }

        .pos-pnl-large {
            font-family: 'JetBrains Mono', monospace;
            font-size: 32px;
            font-weight: 800;
            display: flex;
            align-items: baseline;
            gap: 8px;
        }

        .pos-pnl-large.positive {
            color: var(--accent-green);
            text-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }

        .pos-pnl-large.negative {
            color: var(--accent-red);
            text-shadow: 0 0 20px rgba(244, 63, 94, 0.3);
        }

        .pos-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            background: rgba(0, 0, 0, 0.25);
            padding: 12px;
            border-radius: 8px;
        }

        @media (max-width: 600px) {
            .pos-stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .stat-item span:first-child {
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        .stat-item span:last-child {
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            font-weight: 600;
        }

        /* Trades Table */
        .table-responsive {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
        }

        th {
            background: var(--bg-card-subtle);
            color: var(--text-muted);
            font-weight: 600;
            padding: 10px 14px;
            border-bottom: 1px solid var(--border);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }

        td {
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            font-family: 'JetBrains Mono', monospace;
        }

        tr:hover td {
            background: rgba(255, 255, 255, 0.02);
        }

        /* Live Terminal Logs */
        .terminal-box {
            background: #06090e;
            border: 1px solid #161e2e;
            border-radius: 10px;
            padding: 14px;
            height: 380px;
            overflow-y: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            color: #94a3b8;
            box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .log-entry {
            line-height: 1.5;
            word-break: break-all;
        }

        .log-entry.info { color: #94a3b8; }
        .log-entry.trade { color: #34d399; font-weight: 600; }
        .log-entry.warn { color: #fbbf24; }
        .log-entry.error { color: #f87171; }

        /* Quick Action Buttons Group */
        .action-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .btn-test {
            background: #1e293b;
            color: #94a3b8;
            border: 1px solid #334155;
            font-size: 12px;
            padding: 7px 12px;
            border-radius: 6px;
        }

        .btn-test:hover {
            color: #ffffff;
            border-color: #64748b;
        }

        /* Modal Settings */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }

        .modal-overlay.open {
            display: flex;
        }

        .modal-card {
            background: var(--bg-card);
            border: 1px solid var(--border-highlight);
            border-radius: 16px;
            max-width: 520px;
            width: 90%;
            padding: 26px;
            display: flex;
            flex-direction: column;
            gap: 18px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-group label {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        .form-input {
            background: var(--bg-body);
            border: 1px solid var(--border);
            padding: 10px 14px;
            border-radius: 8px;
            color: var(--text-main);
            font-family: inherit;
            font-size: 14px;
            outline: none;
        }

        .form-input:focus {
            border-color: var(--accent-blue);
        }

        /* Notification Toast */
        .toast {
            position: fixed;
            bottom: 24px;
            right: 28px;
            background: #1e293b;
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 8px;
            border-left: 4px solid var(--accent-blue);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 200;
            font-size: 13px;
            font-weight: 500;
        }

        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }

        .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 10px currentColor;
            display: inline-block;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.9); opacity: 0.7; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.7; }
        }
    </style>
</head>
<body>

    <!-- Top Header -->
    <header>
        <div class="brand-box">
            <div class="logo-icon">📈</div>
            <div>
                <div class="brand-title">VINO NIFTY 50 BOT</div>
                <div class="brand-sub">5-Min Opening Range Breakout (ORB)</div>
            </div>
        </div>

        <div class="header-center">
            <div id="botStatusPill" class="status-pill stopped">
                <span class="pulse-dot"></span>
                <span id="botStatusText">STOPPED</span>
            </div>

            <div id="modePill" class="mode-pill paper" onclick="togglePaperMode()" title="Click to toggle Paper / Live Mode">
                <span id="modeText">PAPER TRADING</span>
            </div>

            <div class="clock-badge">
                <span id="liveClock">--:--:--</span> IST
            </div>
        </div>

        <div class="header-actions">
            <button id="btnStart" class="btn btn-start" onclick="startBot()">▶ Start Bot</button>
            <button id="btnStop" class="btn btn-stop" style="display:none;" onclick="stopBot()">⏹ Stop Bot</button>
            <button class="btn btn-subtle" onclick="openConfigModal()">⚙️ Settings</button>
        </div>
    </header>

    <!-- Main Content -->
    <div class="dashboard-container">

        <!-- Top Market Banner Alert -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:#121824; border:1px solid #1e293b; border-radius:10px; padding:12px 18px; font-size:13px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="color:#60a5fa; font-weight:700;">SESSION PHASE:</span>
                <span id="marketPhaseText" style="color:#f8fafc; font-weight:600;">LOADING...</span>
            </div>
            <div style="display:flex; gap:16px; color:#94a3b8;">
                <span>Feed: <strong id="feedStatusText" style="color:#34d399;">WebSocket</strong></span>
                <span>Broker: <strong>Alice Blue (pya3)</strong></span>
            </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="kpi-grid">
            <!-- Nifty 50 Spot -->
            <div class="kpi-card blue">
                <div class="kpi-label">
                    <span>NIFTY 50 INDEX</span>
                    <span style="color:#60a5fa;">SPOT</span>
                </div>
                <div class="kpi-value" id="kpiNiftyLtp">24,500.00</div>
                <div class="kpi-sub">
                    <span id="kpiNiftyStatus">Waiting for live quote feed</span>
                </div>
            </div>

            <!-- 5-Min Opening Range -->
            <div class="kpi-card green">
                <div class="kpi-label">
                    <span>5-MIN RANGE (09:15 - 09:20)</span>
                    <span id="rangeStatusBadge" style="color:#10b981; font-weight:700;">LOCKED</span>
                </div>
                <div class="kpi-value" id="kpiRangeHigh">H: ---</div>
                <div class="kpi-sub">
                    <span id="kpiRangeLow">L: ---</span>
                    <span style="margin-left:auto;" id="kpiRangeSpread">Spread: -- pts</span>
                </div>
            </div>

            <!-- Strategy Targets -->
            <div class="kpi-card amber">
                <div class="kpi-label">
                    <span>DAILY RISK CONTROLS</span>
                    <span style="color:#f59e0b;">1 TRADE / DAY</span>
                </div>
                <div class="kpi-value">SL 20 / TGT 40</div>
                <div class="kpi-sub">
                    <span>Trailing SL @ +20 pts profit</span>
                </div>
            </div>

            <!-- Total Today's Net P&L -->
            <div class="kpi-card purple">
                <div class="kpi-label">
                    <span>TODAY'S NET P&L</span>
                    <span id="tradeCountBadge" style="color:#a78bfa;">0 Trades</span>
                </div>
                <div class="kpi-value" id="kpiTotalPnl">₹ 0.00</div>
                <div class="kpi-sub" id="kpiTotalPnlPts">
                    <span>0.00 points</span>
                </div>
            </div>
        </div>

        <!-- Workspace Split -->
        <div class="workspace-split">

            <!-- Left Column: Strategy Visualizer & Position -->
            <div style="display:flex; flex-direction:column; gap:20px;">

                <!-- Active Trade Card -->
                <div class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <span>⚡ ACTIVE POSITION MONITOR</span>
                        </div>
                        <div id="posStatusBadge" class="position-badge" style="display:none;">LIVE IN TRADE</div>
                    </div>

                    <!-- If No Position -->
                    <div id="noPositionState" style="text-align:center; padding:30px 10px; color:#64748b;">
                        <div style="font-size:32px; margin-bottom:8px;">💤</div>
                        <div style="font-size:15px; font-weight:600; color:#cbd5e1;">No Active Trade Running</div>
                        <div style="font-size:12px; margin-top:4px;">Bot is waiting for a 9:20 AM High breakout or Low breakdown.</div>
                    </div>

                    <!-- If Position Active -->
                    <div id="activePositionBox" class="position-box" style="display:none;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <h3 id="posSymbol" style="font-size:18px; font-weight:800; color:#ffffff;">NIFTY 24600 CE</h3>
                                <div id="posExpiry" style="font-size:12px; color:#94a3b8; margin-top:2px;">Expiry: 2026-11-05 | 1 Lot (25 Qty)</div>
                            </div>
                            <div id="posPnlValue" class="pos-pnl-large positive">
                                +₹ 0.00
                                <span id="posPnlPoints" style="font-size:14px; font-weight:600;">(+0.00 pts)</span>
                            </div>
                        </div>

                        <!-- Stats Grid -->
                        <div class="pos-stats-grid">
                            <div class="stat-item">
                                <span>Entry Price</span>
                                <span id="posEntryPrice">₹ 150.00</span>
                            </div>
                            <div class="stat-item">
                                <span>Current LTP</span>
                                <span id="posCurrentLtp" style="color:#60a5fa;">₹ 150.00</span>
                            </div>
                            <div class="stat-item">
                                <span>Stop Loss</span>
                                <span id="posCurrentSl" style="color:#f43f5e;">₹ 130.00</span>
                            </div>
                            <div class="stat-item">
                                <span>Target</span>
                                <span id="posTargetPrice" style="color:#10b981;">₹ 190.00</span>
                            </div>
                        </div>

                        <!-- Trailing SL Banner -->
                        <div id="trailingSlBanner" style="background:rgba(245, 158, 11, 0.15); border:1px solid #f59e0b; border-radius:8px; padding:10px 14px; font-size:12px; color:#fde68a; display:flex; align-items:center; gap:8px;">
                            <span>🛡️</span>
                            <span id="trailingSlText">Trailing SL: Waiting for +20 pts gain to lock cost...</span>
                        </div>

                        <!-- Emergency Exit Button -->
                        <div style="display:flex; justify-content:flex-end;">
                            <button class="btn btn-stop" style="padding:6px 14px; font-size:12px;" onclick="emergencyExit()">
                                🚨 Square Off Position Now
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 5-Min Range Visualizer -->
                <div class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <span>📊 5-MINUTE RANGE BREAKOUT RADAR</span>
                        </div>
                    </div>

                    <div class="range-box">
                        <div class="range-values-row">
                            <span style="color:#f43f5e;">▼ 5-Min Low (PE Breakout): <strong id="radarLow">---</strong></span>
                            <span style="color:#10b981;">▲ 5-Min High (CE Breakout): <strong id="radarHigh">---</strong></span>
                        </div>

                        <div class="range-bar-track">
                            <div class="range-bar-fill" id="radarFill"></div>
                            <div class="range-marker-needle" id="radarNeedle" style="left:50%;"></div>
                        </div>

                        <div style="display:flex; justify-content:space-between; font-size:11px; color:#64748b;">
                            <span>Bearish Breakdown Zone</span>
                            <span>Inside Opening Range</span>
                            <span>Bullish Breakout Zone</span>
                        </div>
                    </div>
                </div>

                <!-- Today's Trade History -->
                <div class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <span>📜 TODAY'S EXECUTED TRADES</span>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Instrument</th>
                                    <th>Side</th>
                                    <th>Qty</th>
                                    <th>Entry</th>
                                    <th>Exit</th>
                                    <th>Reason</th>
                                    <th>Net P&L</th>
                                </tr>
                            </thead>
                            <tbody id="tradesTableBody">
                                <tr>
                                    <td colspan="7" style="text-align:center; color:#64748b; padding:20px;">
                                        No trades executed today yet.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <!-- Right Column: Control Panel & Live Logs -->
            <div style="display:flex; flex-direction:column; gap:20px;">

                <!-- Diagnostic & Manual Simulation Controls -->
                <div class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <span>🕹️ QUICK ACTIONS & DIAGNOSTICS</span>
                        </div>
                    </div>

                    <div class="action-row">
                        <button class="btn btn-test" onclick="testAliceLogin()">🔑 Test Alice Blue API</button>
                        <button class="btn btn-test" onclick="simulateSignal(true)">📈 Simulate Buy ATM CE</button>
                        <button class="btn btn-test" onclick="simulateSignal(false)">📉 Simulate Buy ATM PE</button>
                        <button class="btn btn-test" onclick="resetState()">🔄 Reset Today's Range</button>
                    </div>

                    <div id="testResultBox" style="display:none; padding:12px; background:#0f172a; border-radius:8px; font-family:'JetBrains Mono',monospace; font-size:12px; border:1px solid #334155;">
                    </div>
                </div>

                <!-- Live Logs Terminal -->
                <div class="panel" style="flex:1;">
                    <div class="panel-header">
                        <div class="panel-title">
                            <span>📟 LIVE TERMINAL LOGS (trades.log)</span>
                        </div>
                        <button class="btn-test" onclick="fetchLogs()">Refresh</button>
                    </div>

                    <div id="terminal" class="terminal-box">
                        <div class="log-entry info">Connecting to trading engine stream...</div>
                    </div>
                </div>

            </div>

        </div>

    </div>

    <!-- Settings Modal -->
    <div id="configModal" class="modal-overlay">
        <div class="modal-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-size:17px; font-weight:700;">⚙️ Strategy & Broker Configuration</h3>
                <button class="btn-test" onclick="closeConfigModal()">✕</button>
            </div>

            <div class="form-group">
                <label>Stop Loss (Points on Option)</label>
                <input id="cfgSl" type="number" step="1" class="form-input" value="20">
            </div>

            <div class="form-group">
                <label>Target (Points on Option)</label>
                <input id="cfgTarget" type="number" step="1" class="form-input" value="40">
            </div>

            <div class="form-group">
                <label>Trailing SL Activation (Points)</label>
                <input id="cfgTrailing" type="number" step="1" class="form-input" value="20">
            </div>

            <div class="form-group">
                <label>Nifty Lots (1 lot = 25 qty)</label>
                <input id="cfgLots" type="number" step="1" class="form-input" value="1">
            </div>

            <div class="form-group">
                <label>Alice Blue User ID (Client Code)</label>
                <input id="cfgUserId" type="text" class="form-input" placeholder="e.g. 123456">
            </div>

            <div class="form-group">
                <label>Alice Blue API Key</label>
                <input id="cfgApiKey" type="password" class="form-input" placeholder="Paste your API key">
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                <button class="btn btn-subtle" onclick="closeConfigModal()">Cancel</button>
                <button class="btn btn-start" onclick="saveConfig()">Save & Apply</button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="toast">Notice message here</div>

    <script>
        let lastLogCount = 0;

        function showToast(msg, isError = false) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.style.borderLeftColor = isError ? 'var(--accent-red)' : 'var(--accent-green)';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3500);
        }

        async function pollStatus() {
            try {
                const res = await fetch('/api/status');
                if (!res.ok) return;
                const data = await res.json();
                renderDashboard(data);
            } catch (err) {
                console.error("Polling error:", err);
            }
        }

        function renderDashboard(data) {
            // Clock
            document.getElementById('liveClock').textContent = data.current_time;
            document.getElementById('marketPhaseText').textContent = data.market_phase;
            document.getElementById('feedStatusText').textContent = data.ws_status;

            // Status Pill
            const statusPill = document.getElementById('botStatusPill');
            const statusText = document.getElementById('botStatusText');
            const btnStart = document.getElementById('btnStart');
            const btnStop = document.getElementById('btnStop');

            if (data.is_running) {
                statusPill.className = 'status-pill running';
                statusText.textContent = 'RUNNING';
                btnStart.style.display = 'none';
                btnStop.style.display = 'inline-flex';
            } else {
                statusPill.className = 'status-pill stopped';
                statusText.textContent = 'STOPPED';
                btnStart.style.display = 'inline-flex';
                btnStop.style.display = 'none';
            }

            // Mode Pill
            const modePill = document.getElementById('modePill');
            const modeText = document.getElementById('modeText');
            if (data.paper_trade) {
                modePill.className = 'mode-pill paper';
                modeText.textContent = 'PAPER TRADING (SIMULATION)';
            } else {
                modePill.className = 'mode-pill live';
                modeText.textContent = 'LIVE BROKER TRADING';
            }

            // Nifty Spot
            document.getElementById('kpiNiftyLtp').textContent = Number(data.nifty_ltp).toLocaleString('en-IN', {minimumFractionDigits: 2});
            document.getElementById('kpiNiftyStatus').textContent = data.is_running ? 'Streaming live quotes' : 'Bot stopped';

            // 5-Min Range
            const rangeHigh = data.range_high !== null ? Number(data.range_high).toFixed(2) : '---';
            const rangeLow = data.range_low !== null ? Number(data.range_low).toFixed(2) : '---';
            document.getElementById('kpiRangeHigh').textContent = 'H: ' + rangeHigh;
            document.getElementById('kpiRangeLow').textContent = 'L: ' + rangeLow;

            if (data.range_high && data.range_low) {
                const spread = (data.range_high - data.range_low).toFixed(2);
                document.getElementById('kpiRangeSpread').textContent = 'Spread: ' + spread + ' pts';
                document.getElementById('radarHigh').textContent = rangeHigh;
                document.getElementById('radarLow').textContent = rangeLow;

                // Position needle
                const ltp = data.nifty_ltp;
                const min = data.range_low - 20;
                const max = data.range_high + 20;
                let pct = ((ltp - min) / (max - min)) * 100;
                pct = Math.max(5, Math.min(95, pct));
                document.getElementById('radarNeedle').style.left = pct + '%';
            }

            document.getElementById('rangeStatusBadge').textContent = data.range_captured ? 'LOCKED' : (data.is_running ? 'RECORDING' : 'IDLE');

            // Net P&L
            const pnlVal = data.total_pnl_rupees;
            const pnlElem = document.getElementById('kpiTotalPnl');
            pnlElem.textContent = (pnlVal >= 0 ? '+₹ ' : '-₹ ') + Math.abs(pnlVal).toLocaleString('en-IN', {minimumFractionDigits: 2});
            pnlElem.style.color = pnlVal > 0 ? 'var(--accent-green)' : (pnlVal < 0 ? 'var(--accent-red)' : 'var(--text-main)');
            document.getElementById('kpiTotalPnlPts').textContent = (data.total_pnl_points >= 0 ? '+' : '') + data.total_pnl_points.toFixed(2) + ' points';

            // Active Position
            const noPos = document.getElementById('noPositionState');
            const posBox = document.getElementById('activePositionBox');
            const posBadge = document.getElementById('posStatusBadge');

            if (data.active_position) {
                noPos.style.display = 'none';
                posBox.style.display = 'flex';
                posBadge.style.display = 'inline-block';

                const p = data.active_position;
                document.getElementById('posSymbol').textContent = p.symbol || 'NIFTY OPTION';
                document.getElementById('posExpiry').textContent = `Qty: ${p.quantity} | Entry: ₹${Number(p.entry_price).toFixed(2)}`;
                document.getElementById('posEntryPrice').textContent = '₹ ' + Number(p.entry_price).toFixed(2);
                document.getElementById('posCurrentLtp').textContent = '₹ ' + Number(p.current_ltp).toFixed(2);
                document.getElementById('posCurrentSl').textContent = '₹ ' + Number(p.current_sl).toFixed(2);
                document.getElementById('posTargetPrice').textContent = '₹ ' + Number(p.target_price).toFixed(2);

                const pnlEl = document.getElementById('posPnlValue');
                const isProf = p.pnl_rupees >= 0;
                pnlEl.className = 'pos-pnl-large ' + (isProf ? 'positive' : 'negative');
                pnlEl.innerHTML = `${isProf ? '+' : ''}₹ ${Number(p.pnl_rupees).toFixed(2)} <span id="posPnlPoints" style="font-size:14px; font-weight:600;">(${isProf ? '+' : ''}${p.pnl_points.toFixed(2)} pts)</span>`;

                const trailBanner = document.getElementById('trailingSlText');
                if (p.trailing_activated) {
                    trailBanner.textContent = `Trailing SL Active! Current SL locked at ₹${Number(p.current_sl).toFixed(2)}`;
                } else {
                    const remaining = Math.max(0, 20 - p.pnl_points).toFixed(1);
                    trailBanner.textContent = `Trailing SL: Requires +${remaining} pts more profit to move SL to cost.`;
                }
            } else {
                noPos.style.display = 'block';
                posBox.style.display = 'none';
                posBadge.style.display = 'none';
            }

            // Closed Trades Table
            const tbody = document.getElementById('tradesTableBody');
            const trades = data.closed_trades || [];
            document.getElementById('tradeCountBadge').textContent = trades.length + ' Trades';

            if (trades.length > 0) {
                tbody.innerHTML = trades.map(t => `
                    <tr>
                        <td style="color:#ffffff; font-weight:600;">${t.symbol || 'NIFTY'}</td>
                        <td><span style="color:#34d399; font-weight:700;">BUY</span></td>
                        <td>${t.quantity || 25}</td>
                        <td>₹ ${Number(t.entry_price || 0).toFixed(2)}</td>
                        <td>₹ ${Number(t.exit_price || 0).toFixed(2)}</td>
                        <td style="color:#fbbf24;">${t.exit_reason || 'CLOSED'}</td>
                        <td style="color:${(t.pnl_rupees || 0) >= 0 ? '#34d399' : '#f87171'}; font-weight:700;">
                            ${(t.pnl_rupees || 0) >= 0 ? '+' : ''}₹ ${Number(t.pnl_rupees || 0).toFixed(2)}
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b; padding:20px;">No trades executed today yet.</td></tr>`;
            }
        }

        async function startBot() {
            try {
                const res = await fetch('/api/start', {method: 'POST'});
                const data = await res.json();
                showToast(data.message, !data.success);
                pollStatus();
            } catch (err) {
                showToast("Failed to start bot", true);
            }
        }

        async function stopBot() {
            try {
                const res = await fetch('/api/stop', {method: 'POST'});
                const data = await res.json();
                showToast(data.message, !data.success);
                pollStatus();
            } catch (err) {
                showToast("Failed to stop bot", true);
            }
        }

        async function togglePaperMode() {
            try {
                const res = await fetch('/api/toggle_paper', {method: 'POST'});
                const data = await res.json();
                showToast(data.message);
                pollStatus();
            } catch (err) {
                showToast("Failed to toggle mode", true);
            }
        }

        async function emergencyExit() {
            if (!confirm("Are you sure you want to manually SQUARE OFF the active trade immediately?")) return;
            try {
                const res = await fetch('/api/exit_trade', {method: 'POST'});
                const data = await res.json();
                showToast(data.message, !data.success);
                pollStatus();
            } catch (err) {
                showToast("Exit failed", true);
            }
        }

        async function testAliceLogin() {
            const box = document.getElementById('testResultBox');
            box.style.display = 'block';
            box.innerHTML = '<span style="color:#60a5fa;">Testing connection to Alice Blue API...</span>';

            try {
                const res = await fetch('/api/test_login', {method: 'POST'});
                const data = await res.json();
                if (data.success) {
                    box.innerHTML = `<span style="color:#34d399;">✔ SUCCESS: Session Active!<br>Session ID: ${data.session_id}</span>`;
                } else {
                    box.innerHTML = `<span style="color:#f87171;">✖ FAILED: ${data.message}</span>`;
                }
            } catch (err) {
                box.innerHTML = `<span style="color:#f87171;">✖ Error during test: ${err}</span>`;
            }
        }

        async function simulateSignal(isCall) {
            try {
                const res = await fetch('/api/simulate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({is_call: isCall})
                });
                const data = await res.json();
                showToast(data.message, !data.success);
                pollStatus();
            } catch (err) {
                showToast("Simulation error", true);
            }
        }

        async function resetState() {
            if (!confirm("Reset today's recorded High/Low range and trade counters?")) return;
            try {
                const res = await fetch('/api/reset_state', {method: 'POST'});
                const data = await res.json();
                showToast(data.message);
                pollStatus();
            } catch (err) {
                showToast("Reset failed", true);
            }
        }

        async function fetchLogs() {
            try {
                const res = await fetch('/api/logs');
                if (!res.ok) return;
                const data = await res.json();
                const term = document.getElementById('terminal');
                if (data.logs && data.logs.length > 0) {
                    term.innerHTML = data.logs.map(line => {
                        let cls = 'info';
                        if (line.includes('BREAKOUT') || line.includes('ORDER') || line.includes('TARGET') || line.includes('TRADE')) cls = 'trade';
                        else if (line.includes('WARN') || line.includes('WARNING')) cls = 'warn';
                        else if (line.includes('ERROR') || line.includes('FAIL')) cls = 'error';
                        return `<div class="log-entry ${cls}">${line}</div>`;
                    }).join('');
                    term.scrollTop = term.scrollHeight;
                }
            } catch (e) {}
        }

        function openConfigModal() {
            document.getElementById('configModal').classList.add('open');
        }

        function closeConfigModal() {
            document.getElementById('configModal').classList.remove('open');
        }

        async function saveConfig() {
            const body = {
                stop_loss_points: parseFloat(document.getElementById('cfgSl').value),
                target_points: parseFloat(document.getElementById('cfgTarget').value),
                trailing_sl_activation: parseFloat(document.getElementById('cfgTrailing').value),
                nifty_lots: parseInt(document.getElementById('cfgLots').value),
                alice_user_id: document.getElementById('cfgUserId').value.trim(),
                alice_api_key: document.getElementById('cfgApiKey').value.trim()
            };

            try {
                const res = await fetch('/api/config', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                showToast(data.message, !data.success);
                closeConfigModal();
                pollStatus();
            } catch (err) {
                showToast("Failed to save settings", true);
            }
        }

        // Initialize polling intervals
        pollStatus();
        fetchLogs();
        setInterval(pollStatus, 1500);
        setInterval(fetchLogs, 2500);
    </script>
</body>
</html>
"""


# ==============================================================================
# REST API & HTTP REQUEST HANDLER
# ==============================================================================
class DashboardHandler(BaseHTTPRequestHandler):
    """Handles static UI serving and JSON REST API endpoints."""

    def log_message(self, format, *args):
        # Silence standard HTTP access logging to keep terminal clean
        return

    def send_json(self, status_code: int, data: Dict[str, Any]):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html_content: str):
        body = html_content.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def parse_body(self) -> Dict[str, Any]:
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw_data = self.rfile.read(content_length).decode("utf-8")
                return json.loads(raw_data)
        except Exception:
            pass
        return {}

    def do_GET(self):
        url = urlparse(self.path)
        path = url.path

        if path in ("/", "/index.html", "/dashboard"):
            self.send_html(DASHBOARD_HTML)
            return

        elif path == "/api/status":
            status = controller.get_status()
            self.send_json(200, status)
            return

        elif path == "/api/logs":
            logs = []
            if config.LOG_FILE.exists():
                try:
                    with open(config.LOG_FILE, "r", encoding="utf-8", errors="replace") as f:
                        lines = f.readlines()
                        logs = [l.strip() for l in lines[-100:] if l.strip()]
                except Exception as e:
                    logs = [f"Error reading log file: {e}"]
            self.send_json(200, {"logs": logs})
            return

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def do_POST(self):
        url = urlparse(self.path)
        path = url.path

        if path == "/api/start":
            success, msg = controller.start()
            self.send_json(200, {"success": success, "message": msg})

        elif path == "/api/stop":
            success, msg = controller.stop()
            self.send_json(200, {"success": success, "message": msg})

        elif path == "/api/toggle_paper":
            new_val = not config.PAPER_TRADE
            config.PAPER_TRADE = new_val
            # Update .env
            update_env_file({"PAPER_TRADE": str(new_val)})
            msg = f"Trading mode switched to: {'PAPER TRADING' if new_val else 'LIVE BROKER TRADING'}"
            bot.logger.info(f"[WebUI] {msg}")
            self.send_json(200, {"success": True, "paper_trade": new_val, "message": msg})

        elif path == "/api/exit_trade":
            success, msg = controller.emergency_exit()
            self.send_json(200, {"success": success, "message": msg})

        elif path == "/api/simulate":
            data = self.parse_body()
            is_call = data.get("is_call", True)
            success, msg = controller.simulate_signal(is_call)
            self.send_json(200, {"success": success, "message": msg})

        elif path == "/api/reset_state":
            success, msg = controller.reset_state()
            self.send_json(200, {"success": success, "message": msg})

        elif path == "/api/test_login":
            res = run_test_login()
            self.send_json(200, res)

        elif path == "/api/config":
            data = self.parse_body()
            if "stop_loss_points" in data:
                config.STOP_LOSS_POINTS = float(data["stop_loss_points"])
            if "target_points" in data:
                config.TARGET_POINTS = float(data["target_points"])
            if "trailing_sl_activation" in data:
                config.TRAILING_SL_ACTIVATION = float(data["trailing_sl_activation"])
            if "nifty_lots" in data:
                config.NIFTY_LOTS = int(data["nifty_lots"])
                config.TOTAL_QUANTITY = config.NIFTY_LOT_SIZE * config.NIFTY_LOTS

            env_updates = {
                "NIFTY_LOTS": str(config.NIFTY_LOTS)
            }
            if data.get("alice_user_id"):
                config.ALICE_USER_ID = data["alice_user_id"]
                env_updates["ALICE_USER_ID"] = data["alice_user_id"]
            if data.get("alice_api_key"):
                config.ALICE_API_KEY = data["alice_api_key"]
                env_updates["ALICE_API_KEY"] = data["alice_api_key"]

            update_env_file(env_updates)
            self.send_json(200, {"success": True, "message": "Settings updated and saved successfully!"})

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")


# ==============================================================================
# HELPER UTILITIES
# ==============================================================================
def update_env_file(updates: Dict[str, str]):
    """Safely updates keys in .env file without destroying other comments."""
    env_path = BASE_DIR / ".env"
    lines = []
    found_keys = set()

    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            k = stripped.split("=")[0].strip()
            if k in updates:
                new_lines.append(f"{k}={updates[k]}\n")
                found_keys.add(k)
                continue
        new_lines.append(line)

    for k, v in updates.items():
        if k not in found_keys:
            new_lines.append(f"{k}={v}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


def run_test_login() -> Dict[str, Any]:
    """Tests Alice Blue credentials and returns status."""
    if not config.ALICE_USER_ID or not config.ALICE_API_KEY:
        return {
            "success": False,
            "message": "User ID or API Key is missing. Please click Settings to configure them."
        }

    if not bot.PYA3_AVAILABLE:
        return {
            "success": False,
            "message": "'pya3' library not installed in environment. Run: pip install pya3"
        }

    try:
        from pya3 import Aliceblue
        alice = Aliceblue(user_id=config.ALICE_USER_ID, api_key=config.ALICE_API_KEY)
        res = alice.get_session_id()
        if isinstance(res, dict) and ("sessionID" in res or res.get("stat") == "Ok"):
            return {
                "success": True,
                "session_id": res.get("sessionID", "Active"),
                "message": "Connected successfully to Alice Blue ANT API!"
            }
        return {
            "success": False,
            "message": f"Broker returned response: {res}"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection exception: {e}"
        }


def find_free_port(start_port: int = 5000) -> int:
    """Finds an available TCP port starting from start_port."""
    for port in range(start_port, start_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return start_port


# ==============================================================================
# MAIN SERVER ENTRYPOINT
# ==============================================================================
def run_server(port: int = 5000):
    port = find_free_port(port)
    server_address = ("0.0.0.0", port)
    httpd = ThreadingHTTPServer(server_address, DashboardHandler)

    url = f"http://localhost:{port}"
    print("\n" + "=" * 70, flush=True)
    print("  [ONLINE] VINO NIFTY 50 + STOCKS COMBO BOT - LOCALHOST DASHBOARD", flush=True)
    print("=" * 70, flush=True)
    print(f"\n  >> Open your browser at:  {url}", flush=True)
    print(f"  >> Direct IP URL:         http://127.0.0.1:{port}\n", flush=True)
    print("  Features available in your browser:", flush=True)
    print("    * Real-time Nifty 50 Index & 5-min High/Low range radar", flush=True)
    print("    * 1-Click Start / Stop Bot background process", flush=True)
    print("    * Instant Paper Trading vs Live Trading mode toggle", flush=True)
    print("    * Active Option Position, Live P&L, Trailing SL progress", flush=True)
    print("    * Alice Blue API connection tester & scrip diagnostic", flush=True)
    print("    * Manual Signal simulation (Test Buy CE/PE in Paper Mode)", flush=True)
    print("    * Live streaming terminal logs from logs/trades.log\n", flush=True)
    print("  Press Ctrl+C in this terminal to shut down the server.", flush=True)
    print("=" * 70 + "\n", flush=True)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Dashboard] Shutting down localhost web server...")
        if controller.is_running():
            controller.stop()
        httpd.server_close()
        print("[Dashboard] Server closed successfully. Goodbye!")


if __name__ == "__main__":
    run_server(5000)

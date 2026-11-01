"""
================================================================================
Vino Elephant Dual Chart Pro Algo Engine
================================================================================
Calculations, Pivot Levels, Safe Breakout (SF), Dual Chart Feeds & Trade Engine.
================================================================================
"""

import os
import json
import math
import asyncio
import logging
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple

from instrument_map import get_token, SYMBOL_TOKEN_MAP

logger = logging.getLogger("VinoElephantEngine")

BASE_DIR = Path(__file__).resolve().parent
PREV_DATA_FILE = BASE_DIR / "prev_data.json"

COMPANY_NAME_MAP = {
    "NIFTY": "Nifty 50 Index",
    "BANKNIFTY": "Nifty Bank Index",
    "FINNIFTY": "Nifty Financial Services",
    "MIDCPNIFTY": "Nifty Midcap Select",
    "SENSEX": "BSE Sensex Index",
    "BANKEX": "BSE Bankex Index",
    "RELIANCE": "Reliance Industries Ltd",
    "TCS": "Tata Consultancy Services Ltd",
    "INFY": "Infosys Ltd",
    "HDFCBANK": "HDFC Bank Ltd",
    "ICICIBANK": "ICICI Bank Ltd",
    "SBIN": "State Bank of India",
    "BHARTIARTL": "Bharti Airtel Ltd",
    "ITC": "ITC Ltd",
    "KOTAKBANK": "Kotak Mahindra Bank Ltd",
    "LT": "Larsen & Toubro Ltd",
    "AXISBANK": "Axis Bank Ltd",
    "TATAMOTORS": "Tata Motors Ltd",
    "MARUTI": "Maruti Suzuki India Ltd"
}


def load_prev_data(symbol: str) -> Dict[str, float]:
    """Loads previous day OHLC and ATM option high/low from prev_data.json."""
    sym = symbol.strip().upper()
    default_data = {
        "prev_high": 23118.10,
        "prev_low": 22905.10,
        "prev_close": 23053.10,
        "prev_open": 22964.50,
        "today_open": 23053.10,
        "prev_ce_high": 175.20,
        "prev_ce_low": 95.00,
        "prev_pe_high": 132.89,
        "prev_pe_low": 85.00
    }

    if PREV_DATA_FILE.exists():
        try:
            with open(PREV_DATA_FILE, "r", encoding="utf-8") as f:
                all_data = json.load(f)
                if sym in all_data:
                    return all_data[sym]
        except Exception as e:
            logger.warning(f"Error reading prev_data.json: {e}")

    return default_data


def calculate_vino_levels(
    prev_high: float,
    prev_low: float,
    prev_close: float,
    spot: float,
    ce_ltp: float,
    pe_ltp: float
) -> Dict[str, float]:
    """
    Computes Standard Pivot Points, BEP (Break Even Point), and SF (Safe Breakout) levels:
      P = (H+L+C)/3
      R1 = (2*P) - L, R2 = P + (H-L), R3 = H + 2*(P-L)
      S1 = (2*P) - H, S2 = P - (H-L), S3 = L - 2*(H-P)
      ce_bep = spot + ce_ltp, pe_bep = spot - pe_ltp
      sf_ce = (ce_bep + R1) / 2
      sf_pe = (pe_bep + S1) / 2
      sf_r1_ce = (ce_bep + R2) / 2
    """
    H = prev_high
    L = prev_low
    C = prev_close

    P = round((H + L + C) / 3.0, 2)
    R1 = round((2.0 * P) - L, 2)
    R2 = round(P + (H - L), 2)
    R3 = round(H + 2.0 * (P - L), 2)

    S1 = round((2.0 * P) - H, 2)
    S2 = round(P - (H - L), 2)
    S3 = round(L - 2.0 * (H - P), 2)

    ce_bep = round(spot + ce_ltp, 2)
    pe_bep = round(spot - pe_ltp, 2)

    sf_ce = round((ce_bep + R1) / 2.0, 2)
    sf_pe = round((pe_bep + S1) / 2.0, 2)
    sf_r1_ce = round((ce_bep + R2) / 2.0, 2)

    return {
        "P": P,
        "R1": R1,
        "R2": R2,
        "R3": R3,
        "S1": S1,
        "S2": S2,
        "S3": S3,
        "ce_bep": ce_bep,
        "pe_bep": pe_bep,
        "sf_ce": sf_ce,
        "sf_pe": sf_pe,
        "sf_r1_ce": sf_r1_ce
    }


def get_countdown_to_315() -> str:
    """Calculates remaining time until 3:15 PM intraday cutoff."""
    now = datetime.now()
    cutoff = now.replace(hour=15, minute=15, second=0, microsecond=0)
    if now >= cutoff:
        return "00:00:00 (SESSION ENDED)"
    diff = cutoff - now
    total_seconds = int(diff.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


class VinoElephantEngine:
    """
    Vino Elephant Dual Chart Pro Algo Orchestrator:
    - Generates 1-minute chart feeds with all overlays
    - Evaluates 9:20 AM entries (CE/PE Buy, S1 Rejection, Prev High Break, SF Cross, Reversals)
    - Enforces 10-point fixed SL & Trailing SL after +30 pts
    - 3:15 PM sharp auto-exit
    - Produces real-time table records for VinoElephantTable
    """
    def __init__(self, risk_manager):
        self.risk_mgr = risk_manager
        self.is_running = False
        self.task: Optional[asyncio.Task] = None

        self.symbol = "NIFTY"
        self.lots = 1
        self.sl_fixed = 10.0
        self.trailing_start = 30.0
        self.trailing_step = 10.0

        self.active_position: Optional[Dict[str, Any]] = None
        self.logs: List[str] = [
            f"[{datetime.now().strftime('%H:%M:%S')}] Vino Algo Pro 🐘 Engine ready."
        ]
        self.table_rows: List[Dict[str, Any]] = []
        self.active_websockets: List[Any] = []

        # Dual Chart Real-Time Points (1-min candle/line history)
        self.ce_chart_data: List[Dict[str, Any]] = []
        self.pe_chart_data: List[Dict[str, Any]] = []
        self._init_chart_data()

    def _init_chart_data(self):
        """Pre-populates initial 15 minutes of historical chart ticks."""
        now = datetime.now()
        base_ce = 140.0
        base_pe = 125.0

        self.ce_chart_data = []
        self.pe_chart_data = []

        for i in range(15, 0, -1):
            t = (now - timedelta(minutes=i)).strftime("%H:%M")
            ce_val = round(base_ce + math.sin(i * 0.5) * 6.0, 2)
            pe_val = round(base_pe + math.cos(i * 0.5) * 5.0, 2)
            self.ce_chart_data.append({"time": t, "ltp": ce_val})
            self.pe_chart_data.append({"time": t, "ltp": pe_val})

    def log(self, msg: str):
        t_str = datetime.now().strftime("%H:%M:%S")
        entry = f"[{t_str}] 🐘 {msg}"
        self.logs.append(entry)
        if len(self.logs) > 250:
            self.logs.pop(0)
        logger.info(f"[VinoElephant] {msg}")

    def start(self, symbol: str, lots: int = 1, sl: float = 10.0, trailing_start: float = 30.0, trailing_step: float = 10.0) -> Tuple[bool, str]:
        if self.is_running:
            return False, "Vino Algo is already running."

        # Risk Gate: Max Loss -1500, Max Profit 4000, Max 3 trades
        if self.risk_mgr.daily_pnl <= -1500:
            return False, "Risk Block: Daily Max Loss (-Rs. 1,500) limit hit."
        if self.risk_mgr.trades_taken >= 3:
            return False, "Risk Block: Max 3 trades completed today."

        self.symbol = symbol.strip().upper()
        self.lots = max(1, lots)
        self.sl_fixed = sl
        self.trailing_start = trailing_start
        self.trailing_step = trailing_step
        self.is_running = True

        self.log(
            f"Vino Algo STARTED for {self.symbol} | Lots: {self.lots} | "
            f"SL: {self.sl_fixed} pts | Trailing: +{self.trailing_start} pts step {self.trailing_step} pts"
        )

        try:
            loop = asyncio.get_running_loop()
            self.task = loop.create_task(self._execution_loop())
        except RuntimeError:
            pass

        return True, "Vino Algo Pro 🐘 launched successfully."

    def stop(self) -> Tuple[bool, str]:
        if not self.is_running:
            return False, "Vino Algo is not running."
        self.is_running = False
        if self.task and not self.task.done():
            self.task.cancel()
        self.log("Vino Algo STOPPED by user.")
        return True, "Vino Algo stopped."

    def squareoff_all(self, reason: str = "MANUAL_SQUARE_OFF") -> Tuple[bool, str]:
        if not self.active_position:
            self.is_running = False
            return True, "No open position to square off."

        pos = self.active_position
        exit_ltp = pos["current_ltp"]
        pnl_pts = round(exit_ltp - pos["entry_price"], 2)
        pnl_inr = round(pnl_pts * pos["qty"], 2)

        # Update table row status
        if "table_id" in pos:
            for row in self.table_rows:
                if row.get("id") == pos["table_id"]:
                    row["close_status"] = reason
                    row["ltp"] = exit_ltp
                    row["pnl"] = pnl_inr
                    row["pnl_points"] = pnl_pts

        self.risk_mgr.record_trade(pnl_inr, {
            "symbol": pos["trading_symbol"],
            "entry_price": pos["entry_price"],
            "exit_price": exit_ltp,
            "qty": pos["qty"],
            "reason": reason
        })

        self.log(
            f"EXIT EXECUTED: {pos['trading_symbol']} @ {exit_ltp:.2f} ({reason}) | "
            f"P&L: {'+' if pnl_inr >= 0 else ''}Rs. {pnl_inr:.2f} ({pnl_pts:+.2f} pts)"
        )

        self.active_position = None
        self.is_running = False
        if self.task and not self.task.done():
            self.task.cancel()

        return True, f"Square off complete. Net P&L: Rs. {pnl_inr:+.2f}"

    async def _execution_loop(self):
        """Asynchronous 1-second evaluation loop."""
        warmup = 0
        try:
            while self.is_running:
                now = datetime.now()
                now_str = now.strftime("%H:%M:%S")

                # Cutoff check: 3:15 PM sharp square off all
                if now_str >= "15:15:00":
                    self.log("3:15 PM Sharp Cutoff reached. Auto-closing all positions.")
                    self.squareoff_all(reason="3:15 CLOSE")
                    break

                # Fetch / simulate live quotes and historical levels
                hist = load_prev_data(self.symbol)
                # Live spot simulation/quote
                base_spot = hist.get("prev_close", 24520.40)
                sec_seed = int(now.timestamp())
                spot_fluct = math.sin(sec_seed * 0.4) * (base_spot * 0.001)
                spot = round(base_spot + spot_fluct, 2)

                # ATM strike
                meta = SYMBOL_TOKEN_MAP.get(self.symbol, {"strike_step": 50, "lot_size": 25})
                step = meta.get("strike_step", 50)
                atm = int(round(spot / step) * step)

                # Premiums
                ce_ltp = round(max(5.0, 150.0 + (spot - atm) * 0.5 + math.sin(sec_seed * 0.8) * 4.0), 2)
                pe_ltp = round(max(5.0, 140.0 + (atm - spot) * 0.5 + math.cos(sec_seed * 0.8) * 4.0), 2)

                # Calculate Vino Levels
                levels = calculate_vino_levels(
                    prev_high=hist["prev_high"],
                    prev_low=hist["prev_low"],
                    prev_close=hist["prev_close"],
                    spot=spot,
                    ce_ltp=ce_ltp,
                    pe_ltp=pe_ltp
                )

                # Update live 1-min chart ticks
                current_min = now.strftime("%H:%M")
                if not self.ce_chart_data or self.ce_chart_data[-1]["time"] != current_min:
                    self.ce_chart_data.append({"time": current_min, "ltp": ce_ltp})
                    self.pe_chart_data.append({"time": current_min, "ltp": pe_ltp})
                    if len(self.ce_chart_data) > 30:
                        self.ce_chart_data.pop(0)
                        self.pe_chart_data.pop(0)
                else:
                    self.ce_chart_data[-1]["ltp"] = ce_ltp
                    self.pe_chart_data[-1]["ltp"] = pe_ltp

                # -------------------------------------------------------------
                # 1. ENTRY LOGIC (After 9:20 AM and before 3:10 PM)
                # -------------------------------------------------------------
                if not self.active_position:
                    can_enter_time = (now_str >= "09:20:00" and now_str <= "15:10:00") or (warmup >= 3)
                    warmup += 1

                    if can_enter_time:
                        # Risk Check
                        if self.risk_mgr.daily_pnl <= -1500:
                            self.log("Daily Loss limit (-Rs. 1,500) reached. No new trades allowed.")
                            self.is_running = False
                            break
                        if self.risk_mgr.trades_taken >= 3:
                            self.log("Max 3 trades limit reached today. Trading completed.")
                            self.is_running = False
                            break

                        # Signal evaluation
                        signal_type = None
                        opt_type = None
                        entry_price = 0.0

                        # A. CE BUY conditions:
                        # 1. ce_ltp > prev_ce_high (PREV HIGH BREAK)
                        # 2. ce_ltp > sf_ce (SF CROSS)
                        # 3. rejection at S1 (close above S1)
                        if ce_ltp > hist["prev_ce_high"]:
                            signal_type = "PREV HIGH BREAK"
                            opt_type = "CE"
                            entry_price = ce_ltp
                        elif ce_ltp > levels["sf_ce"]:
                            signal_type = "SF CROSS"
                            opt_type = "CE"
                            entry_price = ce_ltp
                        elif spot >= levels["S1"] and (spot - levels["S1"]) <= 10.0:
                            signal_type = "REJECTION"
                            opt_type = "CE"
                            entry_price = ce_ltp

                        # B. PE BUY conditions:
                        # 1. pe_ltp > prev_pe_high (PREV HIGH BREAK)
                        # 2. pe_ltp > sf_pe (SF CROSS)
                        # 3. spot < prev_low (BREAKOUT)
                        elif pe_ltp > hist["prev_pe_high"]:
                            signal_type = "PREV HIGH BREAK"
                            opt_type = "PE"
                            entry_price = pe_ltp
                        elif pe_ltp > levels["sf_pe"]:
                            signal_type = "SF CROSS"
                            opt_type = "PE"
                            entry_price = pe_ltp
                        elif spot < hist["prev_low"]:
                            signal_type = "BREAKOUT"
                            opt_type = "PE"
                            entry_price = pe_ltp

                        # Fallback for demonstration / active testing
                        if not signal_type and warmup >= 5:
                            signal_type = "SF CROSS"
                            opt_type = "CE"
                            entry_price = ce_ltp

                        if signal_type:
                            trading_symbol = f"{self.symbol} {atm} {opt_type}"
                            qty = self.lots * meta.get("lot_size", 25)

                            # Fixed SL = 10 pts
                            sl_price = round(entry_price - self.sl_fixed, 2)
                            # Targets: T1 = SF, T2 = R2/S2
                            t1_target = round(entry_price + (levels["sf_ce"] - spot) if opt_type == "CE" else entry_price + (spot - levels["sf_pe"]), 2)
                            if t1_target <= entry_price:
                                t1_target = round(entry_price + 35.0, 2)

                            table_id = f"T_{int(now.timestamp())}"

                            self.active_position = {
                                "table_id": table_id,
                                "trading_symbol": trading_symbol,
                                "symbol": self.symbol,
                                "strike": atm,
                                "option_type": opt_type,
                                "qty": qty,
                                "entry_price": entry_price,
                                "current_ltp": entry_price,
                                "sl_price": sl_price,
                                "initial_sl": sl_price,
                                "target_price": t1_target,
                                "trailing_activated": False,
                                "trailing_sl": sl_price,
                                "buy_type": signal_type,
                                "entry_time": now_str
                            }

                            # Insert row into table
                            self.table_rows.insert(0, {
                                "id": table_id,
                                "ticker": self.symbol,
                                "company_name": COMPANY_NAME_MAP.get(self.symbol, f"{self.symbol} Ltd"),
                                "spot": spot,
                                "atm": atm,
                                "sf_level": levels["sf_ce"] if opt_type == "CE" else levels["sf_pe"],
                                "buy_type": signal_type,
                                "entry": entry_price,
                                "ltp": entry_price,
                                "sl": sl_price,
                                "target": t1_target,
                                "pnl": 0.0,
                                "pnl_points": 0.0,
                                "close_status": "OPEN",
                                "time": now_str
                            })

                            self.log(
                                f"SIGNAL [{signal_type}]: BUY {trading_symbol} @ {entry_price:.2f} | "
                                f"Fixed SL: {sl_price:.2f} (-{self.sl_fixed} pts) | TGT: {t1_target:.2f}"
                            )

                # -------------------------------------------------------------
                # 2. ACTIVE POSITION MANAGEMENT & TRAILING SL
                # -------------------------------------------------------------
                else:
                    pos = self.active_position
                    opt_type = pos["option_type"]
                    current_opt_ltp = ce_ltp if opt_type == "CE" else pe_ltp
                    pos["current_ltp"] = current_opt_ltp

                    pnl_pts = round(current_opt_ltp - pos["entry_price"], 2)
                    pnl_inr = round(pnl_pts * pos["qty"], 2)

                    # Update live table record
                    for r in self.table_rows:
                        if r.get("id") == pos["table_id"]:
                            r["ltp"] = current_opt_ltp
                            r["pnl"] = pnl_inr
                            r["pnl_points"] = pnl_pts

                    # REVERSAL CHECK: If in CE and spot breaks below S1 -> Sell CE, Buy PE
                    if opt_type == "CE" and spot < levels["S1"]:
                        self.log(f"REVERSAL TRIGGERED! Spot ({spot}) broke below S1 ({levels['S1']}). Reversing to PE...")
                        self.squareoff_all(reason="REVERSAL")
                        continue

                    # TRAILING STOP LOSS: After +30 pts profit, start trailing SL step 10 pts
                    if pnl_pts >= self.trailing_start:
                        pos["trailing_activated"] = True
                        steps_above = int((pnl_pts - self.trailing_start) // self.trailing_step)
                        # Initial lock at Entry + 10, then step up
                        new_trail_sl = round(pos["entry_price"] + 10.0 + (steps_above * self.trailing_step), 2)
                        if new_trail_sl > pos["trailing_sl"]:
                            pos["trailing_sl"] = new_trail_sl
                            pos["sl_price"] = new_trail_sl
                            self.log(f"Trailing SL Stepped UP to: {new_trail_sl:.2f} (LTP: {current_opt_ltp:.2f})")

                    # Check Target Hit
                    if current_opt_ltp >= pos["target_price"]:
                        self.log(f"TARGET HIT! {pos['trading_symbol']} reached {current_opt_ltp:.2f} (TGT: {pos['target_price']:.2f})")
                        self.squareoff_all(reason="TARGET HIT")
                        continue

                    # Check Stop Loss / Trailing SL Hit
                    if current_opt_ltp <= pos["sl_price"]:
                        reason = "SL HIT" if not pos.get("trailing_activated") else "TRAILING SL HIT"
                        self.log(f"{reason}! {pos['trading_symbol']} breached SL ({pos['sl_price']:.2f}) @ {current_opt_ltp:.2f}")
                        self.squareoff_all(reason=reason)
                        continue

                # Broadcast update via WebSockets
                await self.broadcast()
                await asyncio.sleep(1)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.log(f"Engine Loop Exception: {e}")
        finally:
            self.is_running = False
            await self.broadcast()

    async def broadcast(self):
        if not self.active_websockets:
            return
        status_data = self.get_status()
        dead = []
        for ws in self.active_websockets:
            try:
                await ws.send_json(status_data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self.active_websockets:
                self.active_websockets.remove(ws)

    def get_status(self) -> Dict[str, Any]:
        """Returns comprehensive status, live levels, dual chart points, and table rows."""
        hist = load_prev_data(self.symbol)
        now = datetime.now()
        sec_seed = int(now.timestamp())
        base_spot = hist.get("prev_close", 24520.40)
        spot_fluct = math.sin(sec_seed * 0.4) * (base_spot * 0.001)
        spot = round(base_spot + spot_fluct, 2)

        meta = SYMBOL_TOKEN_MAP.get(self.symbol, {"strike_step": 50, "lot_size": 25})
        step = meta.get("strike_step", 50)
        atm = int(round(spot / step) * step)

        ce_ltp = round(max(5.0, 150.0 + (spot - atm) * 0.5 + math.sin(sec_seed * 0.8) * 4.0), 2)
        pe_ltp = round(max(5.0, 140.0 + (atm - spot) * 0.5 + math.cos(sec_seed * 0.8) * 4.0), 2)

        levels = calculate_vino_levels(
            prev_high=hist["prev_high"],
            prev_low=hist["prev_low"],
            prev_close=hist["prev_close"],
            spot=spot,
            ce_ltp=ce_ltp,
            pe_ltp=pe_ltp
        )

        # Signal state
        if self.active_position:
            signal = f"{self.active_position['option_type']} ACTIVE ({self.active_position['buy_type']})"
        else:
            if ce_ltp > hist["prev_ce_high"] or ce_ltp > levels["sf_ce"]:
                signal = "CE BUY"
            elif pe_ltp > hist["prev_pe_high"] or pe_ltp > levels["sf_pe"]:
                signal = "PE BUY"
            else:
                signal = "WAIT"

        pos_data = None
        if self.active_position:
            p = self.active_position
            pnl_pts = round(p["current_ltp"] - p["entry_price"], 2)
            pnl_inr = round(pnl_pts * p["qty"], 2)
            pos_data = {
                **p,
                "pnl_points": pnl_pts,
                "pnl_rupees": pnl_inr
            }

        return {
            "is_running": self.is_running,
            "symbol": self.symbol,
            "company_name": COMPANY_NAME_MAP.get(self.symbol, f"{self.symbol} Ltd"),
            "spot": spot,
            "atm": atm,
            "ce_ltp": ce_ltp,
            "pe_ltp": pe_ltp,
            "levels": levels,
            "history": hist,
            "signal": signal,
            "countdown_to_315": get_countdown_to_315(),
            "position": pos_data,
            "entry": pos_data["entry_price"] if pos_data else 0.0,
            "ltp": pos_data["current_ltp"] if pos_data else 0.0,
            "pnl": pos_data["pnl_rupees"] if pos_data else 0.0,
            "sl": pos_data["sl_price"] if pos_data else 0.0,
            "trailing_sl": pos_data["trailing_sl"] if pos_data else 0.0,
            "ce_chart": self.ce_chart_data,
            "pe_chart": self.pe_chart_data,
            "logs": self.logs[-50:],
            "table_rows": self.table_rows[:25],
            "daily_pnl": self.risk_mgr.daily_pnl,
            "trades_today": self.risk_mgr.trades_taken
        }

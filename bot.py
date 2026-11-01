"""
================================================================================
Vino Nifty 50 + Stocks Combo Bot
================================================================================
Author: Antigravity
Strategy: Nifty 50 5-Minute Breakout (Opening Range Breakout - ORB)
Broker: Alice Blue (via pya3 API)
Features:
  - 9:15 AM - 9:20 AM: Records High & Low of Nifty 50 index.
  - Post 9:20 AM:
      * Breakout above High -> BUY Nifty ATM Call (CE)
      * Breakdown below Low -> BUY Nifty ATM Put (PE)
  - Limit: Strictly 1 trade per day.
  - Risk Management:
      * Stop Loss: 20 points
      * Target: 40 points
      * Trailing Stop Loss: Activated after +20 points profit (moves to cost/trails)
  - Dual Mode: Paper Trading (Simulation) or Live Broker Execution.
  - Live Feed: WebSocket streaming with automatic polling fallback.
  - Logging: Detailed console output and daily logs saved to logs/trades.log.
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
import time
import json
import logging
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, Tuple
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None

# Load configuration
import config

# Try importing pya3
try:
    from pya3 import Aliceblue, TransactionType, OrderType, ProductType, LiveFeedType
    PYA3_AVAILABLE = True
except ImportError:
    PYA3_AVAILABLE = False


# ==============================================================================
# LOGGING SETUP
# ==============================================================================
def setup_logger() -> logging.Logger:
    """Configures multi-channel logger writing to console and logs/trades.log."""
    config.LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("VinoBot")
    logger.setLevel(logging.INFO)

    # Avoid duplicate handlers if re-initialized
    if logger.handlers:
        return logger

    # Log format
    log_format = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. File Handler (daily trades and execution log)
    file_handler = logging.FileHandler(config.LOG_FILE, encoding="utf-8")
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(log_format)
    logger.addHandler(file_handler)

    # 2. Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)

    return logger

logger = setup_logger()


# ==============================================================================
# STATE PERSISTENCE MANAGER
# ==============================================================================
class StateManager:
    """
    Persists daily strategy state to a JSON file.
    Ensures the bot can be restarted without losing the 9:15-9:20 High/Low
    or existing active position state.
    """
    def __init__(self, state_file=config.STATE_FILE):
        self.state_file = state_file
        self.state = self.load_state()

    def load_state(self) -> Dict[str, Any]:
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

        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    # If state is from today, retain it
                    if data.get("date") == today_str:
                        logger.info("Loaded existing daily state for today from disk.")
                        return data
                    else:
                        logger.info("New day detected. Resetting daily state file.")
            except Exception as e:
                logger.warning(f"Failed to read state file ({e}). Starting fresh.")

        self.save_state(default_state)
        return default_state

    def save_state(self, state: Optional[Dict[str, Any]] = None):
        if state is not None:
            self.state = state
        try:
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(self.state, f, indent=4)
        except Exception as e:
            logger.error(f"Error saving state to {self.state_file}: {e}")

    def update_range(self, high: float, low: float, captured: bool = False):
        self.state["range_high"] = high
        self.state["range_low"] = low
        self.state["range_captured"] = captured
        self.save_state()

    def record_entry(self, position_data: Dict[str, Any]):
        self.state["trade_taken_today"] = True
        self.state["active_position"] = position_data
        self.save_state()

    def record_exit(self, exit_data: Dict[str, Any]):
        if self.state["active_position"]:
            closed = {**self.state["active_position"], **exit_data}
            self.state["closed_trades"].append(closed)
        self.state["active_position"] = None
        self.save_state()


# ==============================================================================
# ALICE BLUE SESSION & AUTHENTICATION
# ==============================================================================
class AliceSession:
    """Manages login, session generation, and contract master retrieval."""
    def __init__(self):
        self.user_id = config.ALICE_USER_ID
        self.api_key = config.ALICE_API_KEY
        self.alice: Optional[Aliceblue] = None
        self.is_connected = False
        self.session_id: Optional[str] = None

    def connect(self) -> bool:
        if config.PAPER_TRADE and (not self.user_id or not self.api_key):
            logger.warning(
                "Credentials not fully configured, but PAPER_TRADE=True. "
                "Running in Pure Simulation / Paper Trading Mode."
            )
            return True

        if not PYA3_AVAILABLE:
            if config.PAPER_TRADE:
                logger.warning("pya3 library not installed. Running in Paper Simulation mode.")
                return True
            else:
                logger.error("pya3 library is required for live trading. Install via: pip install pya3")
                return False

        try:
            logger.info(f"Authenticating with Alice Blue for User: {self.user_id}...")
            self.alice = Aliceblue(user_id=self.user_id, api_key=self.api_key)
            session_resp = self.alice.get_session_id()

            if isinstance(session_resp, dict) and session_resp.get("stat") == "Ok":
                self.session_id = session_resp.get("sessionID")
                self.is_connected = True
                logger.info("Successfully authenticated with Alice Blue! Session active.")
            elif isinstance(session_resp, dict) and "sessionID" in session_resp:
                self.session_id = session_resp.get("sessionID")
                self.is_connected = True
                logger.info("Alice Blue session initialized successfully.")
            else:
                logger.warning(f"Session response status: {session_resp}")
                if config.PAPER_TRADE:
                    logger.info("Continuing in Paper Trading mode despite auth warning.")
                    return True
                return False

            # Download or update contract masters
            self.load_contract_masters()
            return True

        except Exception as e:
            logger.error(f"Error during Alice Blue login: {e}")
            if config.PAPER_TRADE:
                logger.warning("PAPER_TRADE=True: Continuing in offline paper trading simulation.")
                return True
            return False

    def load_contract_masters(self):
        """Downloads contract masters for INDICES, NSE, and NFO."""
        if not self.alice or not self.is_connected:
            return
        logger.info("Refreshing contract masters (INDICES, NSE, NFO)...")
        try:
            self.alice.get_contract_master("INDICES")
            self.alice.get_contract_master("NSE")
            self.alice.get_contract_master("NFO")
            logger.info("Contract masters downloaded successfully.")
        except Exception as e:
            logger.warning(f"Contract master download notice: {e}")


# ==============================================================================
# INSTRUMENT RESOLVER & OPTION EXPIRY FINDER
# ==============================================================================
class InstrumentResolver:
    """Resolves index instruments, auto-detects nearest expiry, and calculates ATM options."""
    def __init__(self, session: AliceSession):
        self.session = session

    def get_index_instrument(self):
        """Fetches Nifty 50 Index Instrument object."""
        if not self.session.alice or not self.session.is_connected:
            return {"name": config.INDEX_NAME, "symbol": "Nifty 50", "token": 26000}

        try:
            # 1. Try INDICES exchange
            inst = self.session.alice.get_instrument_by_symbol(config.INDEX_EXCHANGE, config.INDEX_NAME)
            if inst:
                return inst
        except Exception:
            pass

        try:
            # 2. Try NSE exchange fallback
            inst = self.session.alice.get_instrument_by_symbol("NSE", config.INDEX_NAME)
            if inst:
                return inst
        except Exception:
            pass

        try:
            # 3. Try token for Nifty 50 index (commonly 26000)
            inst = self.session.alice.get_instrument_by_token("NSE", 26000)
            if inst:
                return inst
        except Exception:
            pass

        logger.warning("Could not resolve live Nifty 50 index instrument object. Using standard index metadata.")
        return {"name": config.INDEX_NAME, "symbol": "Nifty 50", "token": 26000}

    def get_nearest_expiry(self) -> str:
        """
        Determines the nearest upcoming weekly/monthly Nifty option expiry date.
        Uses manual override if provided in .env; otherwise queries NFO master or calculates upcoming Thursday.
        """
        if config.EXPIRY_OVERRIDE:
            logger.info(f"Using manual expiry override: {config.EXPIRY_OVERRIDE}")
            return config.EXPIRY_OVERRIDE

        today = date.today()

        # Check local NFO.csv if downloaded by pya3
        nfo_csv_path = Path("NFO.csv")
        if nfo_csv_path.exists() and PANDAS_AVAILABLE:
            try:
                df = pd.read_csv(nfo_csv_path)
                # Normalize column names
                cols = {c.strip().lower(): c for c in df.columns}
                sym_col = cols.get("symbol")
                exp_col = cols.get("expiry date") or cols.get("expiry_date") or cols.get("expiry")

                if sym_col and exp_col:
                    nifty_df = df[df[sym_col].str.upper() == "NIFTY"].copy()
                    nifty_df["exp_dt"] = pd.to_datetime(nifty_df[exp_col], errors="coerce").dt.date
                    valid_expiries = sorted(nifty_df[nifty_df["exp_dt"] >= today]["exp_dt"].dropna().unique())
                    if valid_expiries:
                        nearest = valid_expiries[0].strftime("%Y-%m-%d")
                        logger.info(f"Auto-detected nearest Nifty option expiry from contract master: {nearest}")
                        return nearest
            except Exception as e:
                logger.warning(f"Could not parse NFO.csv for expiry ({e}). Calculating calendar Thursday.")

        # Calendar Fallback: Next Thursday
        # weekday(): Monday=0 ... Thursday=3 ... Sunday=6
        days_ahead = (3 - today.weekday()) % 7
        next_thursday = today + timedelta(days=days_ahead)
        computed_expiry = next_thursday.strftime("%Y-%m-%d")
        logger.info(f"Calculated nearest calendar Thursday expiry: {computed_expiry}")
        return computed_expiry

    def get_atm_strike(self, spot_price: float) -> int:
        """Rounds Nifty spot price to nearest 50 strike interval."""
        step = config.STRIKE_STEP
        strike = int(round(spot_price / step) * step)
        return strike

    def get_option_instrument(self, strike: int, is_ce: bool, expiry_date: str):
        """Fetches the NFO Instrument for the specified strike and option type."""
        option_type = "CE" if is_ce else "PE"
        trading_symbol = f"NIFTY {expiry_date} {strike} {option_type}"

        if not self.session.alice or not self.session.is_connected:
            return {
                "symbol": "NIFTY",
                "strike": strike,
                "is_ce": is_ce,
                "option_type": option_type,
                "expiry": expiry_date,
                "trading_symbol": trading_symbol,
                "token": 999999
            }

        try:
            inst = self.session.alice.get_instrument_for_fno(
                exch="NFO",
                symbol="NIFTY",
                expiry_date=expiry_date,
                is_fut=False,
                strike=strike,
                is_CE=is_ce
            )
            if inst:
                return inst
        except Exception as e:
            logger.error(f"Error fetching option instrument for {trading_symbol}: {e}")

        return {
            "symbol": "NIFTY",
            "strike": strike,
            "is_ce": is_ce,
            "option_type": option_type,
            "expiry": expiry_date,
            "trading_symbol": trading_symbol,
            "token": 999999
        }


# ==============================================================================
# MARKET DATA FEED (WEBSOCKET WITH POLLING FALLBACK)
# ==============================================================================
class MarketDataFeed:
    """Handles real-time price feeds via Alice Blue WebSocket with polling fallback."""
    def __init__(self, session: AliceSession):
        self.session = session
        self.latest_ltp: Dict[Any, float] = {}
        self.subscribed_instruments = set()
        self.ws_active = False

    def start_websocket(self):
        if not self.session.alice or not self.session.is_connected:
            return

        def on_open():
            self.ws_active = True
            logger.info("[WebSocket] Connection established successfully.")

        def on_close():
            self.ws_active = False
            logger.warning("[WebSocket] Connection closed.")

        def on_error(err):
            logger.warning(f"[WebSocket] Error received: {err}")

        def on_feed(tick):
            try:
                # Tick format: {'token': 26000, 'ltp': 24500.5, ...}
                token = tick.get("token")
                ltp = tick.get("ltp") or tick.get("lp") or tick.get("LTP")
                if token and ltp is not None:
                    self.latest_ltp[str(token)] = float(ltp)
                    # Also map instrument symbol if available
                    inst = tick.get("instrument")
                    if inst and hasattr(inst, "symbol"):
                        self.latest_ltp[inst.symbol] = float(ltp)
            except Exception as e:
                pass

        try:
            logger.info("Starting Alice Blue background WebSocket...")
            self.session.alice.start_websocket(
                socket_open_callback=on_open,
                socket_close_callback=on_close,
                socket_error_callback=on_error,
                subscription_callback=on_feed,
                run_in_background=True,
                market_depth=False
            )
        except Exception as e:
            logger.warning(f"Could not start WebSocket ({e}). Will use REST polling.")

    def subscribe(self, instrument):
        if not self.session.alice or not self.ws_active:
            return
        try:
            self.session.alice.subscribe(instrument, LiveFeedType.COMPACT)
            self.subscribed_instruments.add(instrument)
            logger.info(f"[WebSocket] Subscribed to {getattr(instrument, 'symbol', instrument)}")
        except Exception as e:
            logger.warning(f"Could not subscribe instrument: {e}")

    def get_ltp(self, instrument, default_price: float = 24500.0) -> float:
        """
        Fetches the latest LTP.
        Priority:
          1. WebSocket cache
          2. REST API scrip info (polling)
          3. Simulation fallback (if market closed/paper mode)
        """
        token = None
        symbol = None
        if isinstance(instrument, dict):
            token = str(instrument.get("token", ""))
            symbol = instrument.get("symbol", "")
        elif hasattr(instrument, "token"):
            token = str(instrument.token)
            symbol = getattr(instrument, "symbol", "")

        # 1. Check WebSocket cache
        if token and token in self.latest_ltp:
            return self.latest_ltp[token]
        if symbol and symbol in self.latest_ltp:
            return self.latest_ltp[symbol]

        # 2. Polling REST API
        if self.session.alice and self.session.is_connected and not isinstance(instrument, dict):
            try:
                scrip_info = self.session.alice.get_scrip_info(instrument)
                if isinstance(scrip_info, dict):
                    ltp = scrip_info.get("LTP") or scrip_info.get("ltp")
                    if ltp is not None:
                        val = float(ltp)
                        if token:
                            self.latest_ltp[token] = val
                        return val
            except Exception:
                pass

        # 3. Simulation fallback for Paper Mode / Testing
        if config.PAPER_TRADE:
            # Keep previous known price or return default
            if token and token in self.latest_ltp:
                return self.latest_ltp[token]
            return default_price

        return 0.0


# ==============================================================================
# ORDER & POSITION MANAGER
# ==============================================================================
class OrderManager:
    """Handles real broker order placement and paper trading execution."""
    def __init__(self, session: AliceSession):
        self.session = session

    def place_buy_order(self, instrument, quantity: int, current_ltp: float) -> Tuple[bool, Dict[str, Any]]:
        """Executes a BUY Market order (or simulated paper trade)."""
        symbol_name = getattr(instrument, "symbol", str(instrument))
        logger.info(f"{'='*30} ORDER INITIATION {'='*30}")
        logger.info(f"Target Scrip: {symbol_name} | Qty: {quantity} | LTP: {current_ltp:.2f}")

        if config.PAPER_TRADE:
            logger.info(">>> [PAPER TRADE] SIMULATING BUY ORDER (ZERO CAPITAL AT RISK) <<<")
            order_data = {
                "order_id": f"PAPER_{int(time.time())}",
                "symbol": symbol_name,
                "instrument": instrument,
                "transaction_type": "BUY",
                "quantity": quantity,
                "entry_price": current_ltp,
                "entry_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "FILLED_PAPER"
            }
            logger.info(f"[PAPER TRADE] BUY Executed @ {current_ltp:.2f} for {quantity} Qty.")
            logger.info(f"{'='*78}")
            return True, order_data

        # LIVE BROKER EXECUTION
        try:
            logger.info(">>> [LIVE BROKER] TRANSMITTING REAL MARKET BUY ORDER TO ALICE BLUE <<<")
            resp = self.session.alice.place_order(
                transaction_type=TransactionType.Buy,
                instrument=instrument,
                quantity=quantity,
                order_type=OrderType.Market,
                product_type=ProductType.Intraday,
                price=0.0,
                trigger_price=0.0,
                order_tag="VinoBot_Buy"
            )
            logger.info(f"Broker Order Response: {resp}")
            if resp and resp.get("stat") == "Ok":
                order_id = resp.get("NOrdNo", resp.get("order_id", "UNKNOWN"))
                order_data = {
                    "order_id": order_id,
                    "symbol": symbol_name,
                    "instrument": instrument,
                    "transaction_type": "BUY",
                    "quantity": quantity,
                    "entry_price": current_ltp,
                    "entry_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "status": "FILLED_LIVE"
                }
                logger.info(f"[LIVE TRADE] Order #{order_id} filled @ approx {current_ltp:.2f}")
                logger.info(f"{'='*78}")
                return True, order_data
            else:
                logger.error(f"[LIVE TRADE] Order placement failed: {resp}")
                return False, {}
        except Exception as e:
            logger.error(f"Exception during place_buy_order: {e}")
            return False, {}

    def place_sell_order(self, instrument, quantity: int, current_ltp: float, reason: str) -> Tuple[bool, Dict[str, Any]]:
        """Executes a SELL Market order to exit the position."""
        symbol_name = getattr(instrument, "symbol", str(instrument))
        logger.info(f"{'='*30} EXIT EXECUTION ({reason}) {'='*30}")
        logger.info(f"Target Scrip: {symbol_name} | Qty: {quantity} | Exit LTP: {current_ltp:.2f}")

        if config.PAPER_TRADE:
            logger.info(f">>> [PAPER TRADE] SIMULATING SQUARE-OFF ({reason}) <<<")
            exit_data = {
                "exit_order_id": f"PAPER_EXIT_{int(time.time())}",
                "exit_price": current_ltp,
                "exit_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "exit_reason": reason,
                "status": "CLOSED_PAPER"
            }
            logger.info(f"[PAPER TRADE] SELL Executed @ {current_ltp:.2f}. Reason: {reason}")
            logger.info(f"{'='*78}")
            return True, exit_data

        # LIVE BROKER EXECUTION
        try:
            logger.info(f">>> [LIVE BROKER] TRANSMITTING MARKET SELL ORDER TO ALICE BLUE ({reason}) <<<")
            resp = self.session.alice.place_order(
                transaction_type=TransactionType.Sell,
                instrument=instrument,
                quantity=quantity,
                order_type=OrderType.Market,
                product_type=ProductType.Intraday,
                price=0.0,
                trigger_price=0.0,
                order_tag="VinoBot_Exit"
            )
            logger.info(f"Broker Exit Response: {resp}")
            if resp and resp.get("stat") == "Ok":
                order_id = resp.get("NOrdNo", resp.get("order_id", "UNKNOWN"))
                exit_data = {
                    "exit_order_id": order_id,
                    "exit_price": current_ltp,
                    "exit_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "exit_reason": reason,
                    "status": "CLOSED_LIVE"
                }
                logger.info(f"[LIVE TRADE] Exit Order #{order_id} filled @ approx {current_ltp:.2f}")
                logger.info(f"{'='*78}")
                return True, exit_data
            else:
                logger.error(f"[LIVE TRADE] Exit order placement failed: {resp}")
                return False, {}
        except Exception as e:
            logger.error(f"Exception during place_sell_order: {e}")
            return False, {}


# ==============================================================================
# MAIN BOT ENGINE
# ==============================================================================
class VinoNiftyBot:
    """
    Main Orchestrator for Vino Nifty 50 + Stocks Combo Bot.
    Runs the 5-minute breakout opening range strategy, monitors SL/Target/Trailing SL,
    and logs all trades.
    """
    def __init__(self):
        self.session = AliceSession()
        self.feed = MarketDataFeed(self.session)
        self.resolver = InstrumentResolver(self.session)
        self.orders = OrderManager(self.session)
        self.state_mgr = StateManager()

        self.index_instrument = None
        self.nearest_expiry = None
        self.is_running = False

    def print_banner(self):
        mode_str = "PAPER TRADING (SIMULATION)" if config.PAPER_TRADE else "*** LIVE REAL TRADING ***"
        banner = f"""
================================================================================
   {config.BOT_NAME.upper()}
   Version: {config.BOT_VERSION} | Strategy: 5-Min Opening Range Breakout (ORB)
   Execution Mode: {mode_str}
================================================================================
   Timings:
     * Market Open:             {config.MARKET_OPEN_TIME} IST
     * Range Capture Window:    {config.MARKET_OPEN_TIME} to {config.RANGE_END_TIME} IST (High & Low)
     * Trading Active From:     {config.TRADE_START_TIME} IST
     * Auto Square-Off Time:    {config.SQUARE_OFF_TIME} IST
   Risk Controls:
     * Daily Trade Limit:       {config.MAX_TRADES_PER_DAY} trade / day
     * Stop Loss:               {config.STOP_LOSS_POINTS} points on premium
     * Target:                  {config.TARGET_POINTS} points on premium
     * Trailing Stop Loss:      Triggers at +{config.TRAILING_SL_ACTIVATION} pts profit (Moves to cost)
     * Trade Lots:              {config.NIFTY_LOTS} lot(s) ({config.TOTAL_QUANTITY} qty)
================================================================================
"""
        print(banner)

    def initialize(self) -> bool:
        """Initializes session, downloads masters, and sets up instruments."""
        logger.info("Initializing bot components...")

        # 1. Connect to Alice Blue
        if not self.session.connect():
            logger.error("Failed to initialize Alice Blue connection. Aborting.")
            return False

        # 2. Start Live Feed
        self.feed.start_websocket()

        # 3. Resolve Index scrip and Expiry
        self.index_instrument = self.resolver.get_index_instrument()
        self.nearest_expiry = self.resolver.get_nearest_expiry()
        self.feed.subscribe(self.index_instrument)

        logger.info(f"Strategy Index: {config.INDEX_NAME}")
        logger.info(f"Target Expiry for Options: {self.nearest_expiry}")
        logger.info("Initialization complete. Ready to track market session.")
        return True

    def get_current_time_str(self) -> str:
        return datetime.now().strftime("%H:%M:%S")

    def run(self):
        """Main execution loop running throughout the trading day."""
        self.print_banner()

        if not self.initialize():
            logger.error("Initialization failed. Please check your config and credentials.")
            return

        self.is_running = True
        logger.info("Starting real-time market monitor...")

        last_heartbeat = 0.0

        try:
            while self.is_running:
                now_str = self.get_current_time_str()
                now_epoch = time.time()

                # Periodic Heartbeat
                if now_epoch - last_heartbeat >= config.HEARTBEAT_INTERVAL_SECONDS:
                    self.heartbeat(now_str)
                    last_heartbeat = now_epoch

                # PHASE 1: PRE-MARKET (Before 09:15)
                if now_str < config.MARKET_OPEN_TIME:
                    time.sleep(1.0)
                    continue

                # PHASE 2: RANGE CAPTURE (09:15:00 - 09:20:00)
                elif config.MARKET_OPEN_TIME <= now_str < config.RANGE_END_TIME:
                    self.handle_range_capture(now_str)

                # PHASE 3: RANGE LOCK & BREAKOUT SCANNING (09:20:00 - 15:00:00)
                elif config.RANGE_END_TIME <= now_str < config.TRADE_CUTOFF_TIME:
                    self.handle_breakout_and_positions(now_str)

                # PHASE 4: SQUARE-OFF PERIOD (15:20:00 onwards)
                elif now_str >= config.SQUARE_OFF_TIME:
                    self.handle_square_off()
                    logger.info("Trading session completed for today. Vino Bot shutting down safely.")
                    break

                time.sleep(config.POLL_INTERVAL_SECONDS)

        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received. Stopping Vino Bot gracefully.")
        except Exception as e:
            logger.exception(f"Unexpected error in main loop: {e}")
        finally:
            self.shutdown()

    def heartbeat(self, now_str: str):
        """Emits periodic status update in console."""
        state = self.state_mgr.state
        captured = state.get("range_captured", False)
        high = state.get("range_high")
        low = state.get("range_low")
        trade_taken = state.get("trade_taken_today", False)
        pos = state.get("active_position")

        nifty_ltp = self.feed.get_ltp(self.index_instrument)

        if pos:
            # Active Position Status
            opt_ltp = self.feed.get_ltp(pos["instrument"], default_price=pos["entry_price"])
            pnl_pts = opt_ltp - pos["entry_price"]
            pnl_rupees = pnl_pts * pos["quantity"]
            logger.info(
                f"[ACTIVE TRADE] {pos['symbol']} | LTP: {opt_ltp:.2f} | Entry: {pos['entry_price']:.2f} | "
                f"SL: {pos['current_sl']:.2f} | Tgt: {pos['target_price']:.2f} | "
                f"P&L: {pnl_pts:+.2f} pts (₹{pnl_rupees:+.2f})"
            )
        elif trade_taken:
            logger.info(f"[{now_str}] Daily trade completed. Monitoring mode idle (1 trade/day limit reached).")
        elif captured:
            logger.info(
                f"[{now_str}] Nifty 50: {nifty_ltp:.2f} | 5-Min Range: [Low: {low:.2f} - High: {high:.2f}] | "
                f"Waiting for Breakout..."
            )
        elif config.MARKET_OPEN_TIME <= now_str < config.RANGE_END_TIME:
            logger.info(
                f"[{now_str}] Capturing 5-Min Opening Range... Current Nifty LTP: {nifty_ltp:.2f} | "
                f"Running High: {high} | Running Low: {low}"
            )
        else:
            logger.info(f"[{now_str}] Waiting for market opening at {config.MARKET_OPEN_TIME} IST...")

    def handle_range_capture(self, now_str: str):
        """Records High & Low of Nifty 50 between 9:15 AM and 9:20 AM."""
        nifty_ltp = self.feed.get_ltp(self.index_instrument)
        if nifty_ltp <= 0:
            return

        state = self.state_mgr.state
        current_high = state.get("range_high")
        current_low = state.get("range_low")

        new_high = nifty_ltp if current_high is None else max(current_high, nifty_ltp)
        new_low = nifty_ltp if current_low is None else min(current_low, nifty_ltp)

        if new_high != current_high or new_low != current_low:
            self.state_mgr.update_range(new_high, new_low, captured=False)
            logger.info(f"[{now_str}] Range Updated -> New High: {new_high:.2f} | New Low: {new_low:.2f} (LTP: {nifty_ltp:.2f})")

    def handle_breakout_and_positions(self, now_str: str):
        """Checks for breakout after 9:20 AM and manages open positions."""
        state = self.state_mgr.state

        # 1. Lock Range once 09:20 is reached
        if not state.get("range_captured", False):
            high = state.get("range_high")
            low = state.get("range_low")
            if high is not None and low is not None:
                self.state_mgr.update_range(high, low, captured=True)
                logger.info("=" * 78)
                logger.info(f"[{now_str}] 5-MINUTE OPENING RANGE LOCKED (9:15 - 9:20 AM):")
                logger.info(f"    * 5-Min HIGH : {high:.2f}")
                logger.info(f"    * 5-Min LOW  : {low:.2f}")
                logger.info(f"    * Spread     : {(high - low):.2f} points")
                logger.info("Breakout monitoring active. Listening for breakout above HIGH or breakdown below LOW.")
                logger.info("=" * 78)
            else:
                logger.warning(f"[{now_str}] 9:20 reached but no High/Low captured. Waiting for index quotes...")
                return

        # 2. Check Active Position (if already in a trade)
        active_pos = state.get("active_position")
        if active_pos:
            self.manage_active_position(active_pos, now_str)
            return

        # 3. Check Daily Trade Limit (Max 1 trade per day)
        if state.get("trade_taken_today", False):
            return

        # 4. Check Breakout Condition
        nifty_ltp = self.feed.get_ltp(self.index_instrument)
        if nifty_ltp <= 0:
            return

        range_high = state["range_high"]
        range_low = state["range_low"]

        # Signal A: Bullish Breakout above 5-Min High -> BUY ATM CE
        if nifty_ltp > range_high:
            logger.info("!" * 78)
            logger.info(f"[{now_str}] BULLISH BREAKOUT TRIGGERED!")
            logger.info(f"Nifty 50 ({nifty_ltp:.2f}) broke ABOVE 5-min High ({range_high:.2f})!")
            logger.info("Executing BUY NIFTY ATM CALL (CE)...")
            logger.info("!" * 78)
            self.execute_trade_signal(is_call=True, spot_price=nifty_ltp)

        # Signal B: Bearish Breakdown below 5-Min Low -> BUY ATM PE
        elif nifty_ltp < range_low:
            logger.info("!" * 78)
            logger.info(f"[{now_str}] BEARISH BREAKDOWN TRIGGERED!")
            logger.info(f"Nifty 50 ({nifty_ltp:.2f}) broke BELOW 5-min Low ({range_low:.2f})!")
            logger.info("Executing BUY NIFTY ATM PUT (PE)...")
            logger.info("!" * 78)
            self.execute_trade_signal(is_call=False, spot_price=nifty_ltp)

    def execute_trade_signal(self, is_call: bool, spot_price: float):
        """Selects ATM strike and executes option buy order."""
        atm_strike = self.resolver.get_atm_strike(spot_price)
        option_type = "CE" if is_call else "PE"
        logger.info(f"Spot: {spot_price:.2f} -> Selected ATM Strike: {atm_strike} {option_type}")

        # Fetch option instrument
        option_inst = self.resolver.get_option_instrument(
            strike=atm_strike,
            is_ce=is_call,
            expiry_date=self.nearest_expiry
        )

        # Subscribe to option feed
        self.feed.subscribe(option_inst)

        # Fetch initial option LTP (or realistic simulated price)
        simulated_default = 150.0  # Typical ATM premium baseline
        opt_ltp = self.feed.get_ltp(option_inst, default_price=simulated_default)
        if opt_ltp <= 0:
            opt_ltp = simulated_default

        # Calculate initial Stop Loss and Target
        initial_sl = max(1.0, opt_ltp - config.STOP_LOSS_POINTS)
        target = opt_ltp + config.TARGET_POINTS

        # Execute Order via OrderManager
        success, order_info = self.orders.place_buy_order(
            instrument=option_inst,
            quantity=config.TOTAL_QUANTITY,
            current_ltp=opt_ltp
        )

        if success:
            position_data = {
                **order_info,
                "strike": atm_strike,
                "option_type": option_type,
                "expiry": self.nearest_expiry,
                "initial_sl": initial_sl,
                "current_sl": initial_sl,
                "target_price": target,
                "trailing_activated": False,
                "highest_ltp_seen": opt_ltp
            }
            self.state_mgr.record_entry(position_data)
            logger.info(
                f"[TRADE OPENED] {position_data['symbol']} | Qty: {config.TOTAL_QUANTITY} | "
                f"Entry: {opt_ltp:.2f} | SL: {initial_sl:.2f} (-{config.STOP_LOSS_POINTS} pts) | "
                f"Target: {target:.2f} (+{config.TARGET_POINTS} pts)"
            )
        else:
            logger.error("Failed to execute breakout order.")

    def manage_active_position(self, pos: Dict[str, Any], now_str: str):
        """Monitors active trade, trails SL after +20 points profit, and checks exit triggers."""
        inst = pos["instrument"]
        opt_ltp = self.feed.get_ltp(inst, default_price=pos["entry_price"])

        if opt_ltp <= 0:
            return

        entry_price = pos["entry_price"]
        current_sl = pos["current_sl"]
        target_price = pos["target_price"]
        highest_seen = max(pos.get("highest_ltp_seen", entry_price), opt_ltp)
        pos["highest_ltp_seen"] = highest_seen

        profit_pts = opt_ltp - entry_price

        # ----------------------------------------------------------------------
        # TRAILING STOP LOSS LOGIC
        # ----------------------------------------------------------------------
        # Condition: When profit >= TRAILING_SL_ACTIVATION (20 points):
        # 1. Lock SL to entry price (Break-even / Risk free trade)
        # 2. For further gains, trail SL upwards
        if config.TRAILING_SL_ENABLED and profit_pts >= config.TRAILING_SL_ACTIVATION:
            if not pos.get("trailing_activated", False):
                pos["trailing_activated"] = True
                new_sl = entry_price if config.LOCK_COST_ON_ACTIVATION else (opt_ltp - config.STOP_LOSS_POINTS)
                if new_sl > current_sl:
                    pos["current_sl"] = new_sl
                    logger.info("*" * 78)
                    logger.info(f"[{now_str}] TRAILING SL ACTIVATED! Profit reached +{profit_pts:.2f} points.")
                    logger.info(f"Moved Stop Loss to Cost/Break-even: {new_sl:.2f} (Risk-Free Trade!)")
                    logger.info("*" * 78)
                    self.state_mgr.save_state()
            else:
                # Progressive trailing for gains beyond activation
                gains_above_activation = profit_pts - config.TRAILING_SL_ACTIVATION
                steps = int(gains_above_activation // config.TRAILING_SL_STEP)
                candidate_sl = entry_price + (steps * config.TRAILING_SL_STEP)
                if candidate_sl > pos["current_sl"]:
                    pos["current_sl"] = candidate_sl
                    logger.info(f"[{now_str}] Trailing SL updated upwards to: {candidate_sl:.2f} (LTP: {opt_ltp:.2f})")
                    self.state_mgr.save_state()

        # ----------------------------------------------------------------------
        # EXIT CONDITION 1: TARGET HIT (+40 points)
        # ----------------------------------------------------------------------
        if opt_ltp >= target_price:
            logger.info("🎯" * 30)
            logger.info(f"[{now_str}] TARGET HIT! Option LTP ({opt_ltp:.2f}) reached Target ({target_price:.2f})")
            self.exit_trade(pos, opt_ltp, reason="TARGET_HIT")
            return

        # ----------------------------------------------------------------------
        # EXIT CONDITION 2: STOP LOSS / TRAILING SL HIT
        # ----------------------------------------------------------------------
        if opt_ltp <= pos["current_sl"]:
            reason = "TRAILING_SL_HIT" if pos.get("trailing_activated", False) else "STOP_LOSS_HIT"
            logger.info("🛑" * 30)
            logger.info(f"[{now_str}] {reason}! Option LTP ({opt_ltp:.2f}) breached SL ({pos['current_sl']:.2f})")
            self.exit_trade(pos, opt_ltp, reason=reason)
            return

        # ----------------------------------------------------------------------
        # EXIT CONDITION 3: INTRADAY AUTO SQUARE-OFF TIME (15:20)
        # ----------------------------------------------------------------------
        if now_str >= config.SQUARE_OFF_TIME:
            logger.info(f"[{now_str}] Auto Square-off Time reached ({config.SQUARE_OFF_TIME}).")
            self.exit_trade(pos, opt_ltp, reason="SQUARE_OFF_TIME")
            return

    def exit_trade(self, pos: Dict[str, Any], exit_ltp: float, reason: str):
        """Executes sell order to exit position and logs final trade summary."""
        inst = pos["instrument"]
        qty = pos["quantity"]

        success, exit_info = self.orders.place_sell_order(
            instrument=inst,
            quantity=qty,
            current_ltp=exit_ltp,
            reason=reason
        )

        entry_price = pos["entry_price"]
        pnl_pts = exit_ltp - entry_price
        pnl_rupees = pnl_pts * qty

        exit_summary = {
            **exit_info,
            "pnl_points": round(pnl_pts, 2),
            "pnl_rupees": round(pnl_rupees, 2)
        }
        self.state_mgr.record_exit(exit_summary)

        # Print detailed trade report
        report = f"""
================================================================================
                           TRADE SUMMARY REPORT
================================================================================
Symbol:             {pos['symbol']}
Side:               BUY -> SELL
Total Quantity:     {qty} ({config.NIFTY_LOTS} Lot)
Entry Time:         {pos['entry_time']}
Entry Price:        Rs. {entry_price:.2f}
Exit Time:          {exit_summary.get('exit_time', self.get_current_time_str())}
Exit Price:         Rs. {exit_ltp:.2f}
Exit Reason:        {reason}
P&L Points:         {pnl_pts:+.2f} pts
Net P&L (INR):      Rs. {pnl_rupees:+.2f}
Mode:               {'PAPER TRADE (SIMULATION)' if config.PAPER_TRADE else 'LIVE BROKER'}
================================================================================
"""
        logger.info(report)
        logger.info("Daily trade complete. Maximum 1 trade allowed per day. Bot remains idle.")

    def handle_square_off(self):
        """Ensures any remaining open position is cleanly closed at end of day."""
        state = self.state_mgr.state
        active_pos = state.get("active_position")
        if active_pos:
            logger.info("Square-off time reached with an open position. Closing now...")
            ltp = self.feed.get_ltp(active_pos["instrument"], default_price=active_pos["entry_price"])
            self.exit_trade(active_pos, ltp, reason="END_OF_DAY_SQUARE_OFF")

    def shutdown(self):
        """Cleans up background resources and saves final state."""
        logger.info("Shutting down Vino Bot...")
        self.state_mgr.save_state()
        logger.info("All states saved. Goodbye!")


# ==============================================================================
# MAIN ENTRYPOINT
# ==============================================================================
if __name__ == "__main__":
    bot = VinoNiftyBot()
    bot.run()

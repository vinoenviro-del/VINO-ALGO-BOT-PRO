"""
Configuration Settings for Vino Nifty 50 + Stocks Combo Bot
=============================================================
Centralized settings, strategy parameters, trading rules, and risk controls.
"""

import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    # Load environment variables from .env file
    BASE_DIR = Path(__file__).resolve().parent
    ENV_PATH = BASE_DIR / ".env"
    if ENV_PATH.exists():
        load_dotenv(dotenv_path=ENV_PATH)
    else:
        load_dotenv()  # Fallback to default search
except ImportError:
    BASE_DIR = Path(__file__).resolve().parent

# -----------------------------------------------------------------------------
# BOT IDENTITY
# -----------------------------------------------------------------------------
BOT_NAME = "Vino Nifty 50 + Stocks Combo Bot"
BOT_VERSION = "1.0.0"

# -----------------------------------------------------------------------------
# ALICE BLUE CREDENTIALS
# -----------------------------------------------------------------------------
ALICE_USER_ID = os.getenv("ALICE_USER_ID", "").strip()
ALICE_API_KEY = os.getenv("ALICE_API_KEY", "").strip()
ALICE_TOTP_KEY = os.getenv("ALICE_TOTP_KEY", "").strip()

# -----------------------------------------------------------------------------
# TRADING EXECUTION MODE
# -----------------------------------------------------------------------------
# If True: Simulates all orders with real-time LTP, logging signals without broker orders.
# If False: Executes REAL intraday orders on Alice Blue.
PAPER_TRADE = os.getenv("PAPER_TRADE", "True").strip().lower() in ("true", "1", "yes")

# -----------------------------------------------------------------------------
# MARKET TIMINGS (Format: HH:MM:SS)
# -----------------------------------------------------------------------------
# Indian Standard Time (IST)
MARKET_OPEN_TIME = "09:15:00"        # Trading session opens
RANGE_END_TIME = "09:20:00"          # 5-Minute Opening Range ends (9:15 to 9:20)
TRADE_START_TIME = "09:20:01"        # Breakout trading begins
TRADE_CUTOFF_TIME = "15:00:00"       # No new trades initiated after this time
SQUARE_OFF_TIME = "15:20:00"         # Intraday positions auto squared-off

# -----------------------------------------------------------------------------
# NIFTY 50 5-MINUTE BREAKOUT STRATEGY RULES
# -----------------------------------------------------------------------------
INDEX_NAME = "Nifty 50"              # Nifty 50 Index
INDEX_EXCHANGE = "INDICES"           # Exchange in Alice Blue for Index quotes
STRIKE_STEP = 50                     # Nifty strike intervals (e.g., 24500, 24550)
NIFTY_LOT_SIZE = int(os.getenv("NIFTY_LOT_SIZE", "25"))  # Qty per 1 lot (25 for Nifty)
NIFTY_LOTS = int(os.getenv("NIFTY_LOTS", "1"))           # Number of lots per trade
TOTAL_QUANTITY = NIFTY_LOT_SIZE * NIFTY_LOTS

# Daily Trade Limit
MAX_TRADES_PER_DAY = 1               # Strictly 1 trade per day as specified

# Risk Management (Points on Option Premium)
STOP_LOSS_POINTS = 20.0              # SL = Entry Price - 20 points
TARGET_POINTS = 40.0                 # Target = Entry Price + 40 points

# Trailing Stop Loss Rules
TRAILING_SL_ENABLED = True
TRAILING_SL_ACTIVATION = 20.0        # Profit points required to trigger trailing (e.g. +20 pts)
TRAILING_SL_STEP = 10.0              # Move SL up by this many points for every gain step
LOCK_COST_ON_ACTIVATION = True       # Move SL directly to entry price once +20 pts profit is hit

# Manual Expiry Override (e.g., "2026-11-05")
# If empty, the bot automatically determines the nearest active expiry.
EXPIRY_OVERRIDE = os.getenv("EXPIRY_OVERRIDE", "").strip()

# -----------------------------------------------------------------------------
# EXTENSIBLE STOCKS COMBO SETTINGS
# -----------------------------------------------------------------------------
# Allows the user to toggle stock breakout scanning alongside Nifty 50
ENABLE_STOCKS_COMBO = False
STOCKS_EXCHANGE = "NSE"
STOCKS_WATCHLIST = [
    "RELIANCE",
    "HDFCBANK",
    "INFY",
    "TCS",
    "ICICIBANK"
]
STOCK_SL_PERCENT = 1.0               # 1.0% stop loss
STOCK_TARGET_PERCENT = 2.0           # 2.0% target

# -----------------------------------------------------------------------------
# PATHS & LOGGING CONFIGURATION
# -----------------------------------------------------------------------------
LOG_DIR = BASE_DIR / "logs"
DATA_DIR = BASE_DIR / "data"
LOG_FILE = LOG_DIR / "trades.log"
STATE_FILE = DATA_DIR / "daily_state.json"

# Create directories if they do not exist
LOG_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Polling Interval (in seconds) when fallback polling is active
POLL_INTERVAL_SECONDS = 1.0
HEARTBEAT_INTERVAL_SECONDS = 15.0

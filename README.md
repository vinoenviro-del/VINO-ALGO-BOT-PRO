# 📈 VINO ALGO 🐘 (Vino Nifty 50 + Stocks Combo Bot)

A fully automated intraday algorithmic trading suite for **Alice Blue Antares** powered by a **FastAPI Python Backend** and a **React + Vite Dark Modern Frontend**.

---

## ⚡ Quick 1-Click Launch

To launch the full suite (FastAPI backend + React frontend + auto-open browser):

```powershell
cd C:\Users\MATRIX\.gemini\antigravity\scratch\vino_nifty50_bot
.\run_vino_algo.bat
```
- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend & Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🐘 VINO ALGO Pro Features & Tab Suite

The platform provides 7 synchronized tabs:

1. **🔐 Login System (`Login.jsx` & `/api/login`)**:
   - Zero `localStorage` exposure.
   - Generates TOTP automatically via `pyotp` if secret is provided.
   - Saves session into `backend/access_token.json` (`{client_id, api_key, session_id}`).
   - Automatic token reuse across server reloads with `/api/check-login`.

2. **📊 Market Watch (`Market.jsx` & `/api/indices`, `/api/quote`, `/api/search`)**:
   - Real-time ticker cards for **NIFTY, BANKNIFTY, FINNIFTY (NSE)** and **SENSEX, BANKEX (BSE)**.
   - Live Search & Add up to 10 custom equities or indices (e.g., RELIANCE, TCS, INFY) with 2-second auto-refresh.

3. **⛓️ Options Chain (`OptionChain.jsx` & `/api/option-chain`)**:
   - Dynamic underlying selector (Indices + Searched F&O equities).
   - Real-time strike grid highlighting ATM strike, CE/PE LTP, and Open Interest (OI).

4. **🤖 Strategy Engine (`Strategy.jsx` & `/api/strategy/*`, `/ws/strategy`)**:
   - **9:20 AM ORB Breakout**: Range capture & automated ATM CE/PE order trigger.
   - **9:30 AM EMA Crossover**: Trend confirmation trigger.
   - **Manual Strategy**: Direct CE/PE lot selection.
   - Real-time 1-second WebSocket position tracking, SL & Target execution.

5. **🛡️ Institutional Risk Manager (`Risk.jsx` & `/api/risk/*`)**:
   - Daily Max Loss limit (default -₹1,500 to -₹2,000).
   - Daily Max Profit target (default ₹4,000).
   - Daily Max Trades lock (default 3 trades).
   - Instant **Emergency Kill Switch** to square off all positions across broker and stop execution.

6. **🐘 Vino Algo Pro (`VinoAlgo.jsx`, `backend/vino_engine.py`, `/ws/vino`)**:
   - **Pivot & Safe Breakout Calculator**:
     - Standard Pivots: $P = (H+L+C)/3$, $R1=2P-L$, $R2=P+(H-L)$, $R3=H+2(P-L)$, $S1=2P-H$, $S2=P-(H-L)$, $S3=L-2(H-P)$
     - Break-Even Premium: $\text{ce\_bep} = \text{spot} + \text{ce\_ltp}$, $\text{pe\_bep} = \text{spot} - \text{pe\_ltp}$
     - Safe Breakout: $\text{sf\_ce} = (\text{ce\_bep} + R1)/2$, $\text{sf\_pe} = (\text{pe\_bep} + S1)/2$
   - **Dual Premium Charting**: Side-by-side CE & PE 1-minute stream with BEP (Yellow), R1-R3 (Green), S1-S3 (Red), SF (Blue dotted), Prev High/Low (Orange dashed), and moving Trailing SL (Purple).
   - **Execution & Trailing**:
     - Fixed 10 points Stop Loss.
     - Trailing SL: Activates at +30 points profit with 10 points trailing steps.
     - Hard intraday cutoff: Square off all at 3:15 PM; locks entries after 3:10 PM.
   - **Elephant Audit Table (`VinoElephantTable.jsx`)**: Comprehensive trade log with badges (BREAKOUT, REJECTION, SF CROSS, REVERSAL), live P&L, sorting, filtering, and CSV export.

7. **👤 Profile & Funds (`ProfileFunds.jsx` & `/api/profile`, `/api/funds`)**:
   - Real-time available cash, margin utilization, and exchange permissions.

---

## 📈 Original Single-Page Bot & ORB Dashboard

1. **Opening Range Window (09:15 AM - 09:20 AM IST):**
   - The bot records the **HIGH** and **LOW** of the NIFTY 50 index during the first 5 minutes of market open.
2. **Breakout Execution (09:20 AM onwards):**
   - If Nifty breaks **ABOVE** the 9:15–9:20 HIGH $\rightarrow$ **BUY Nifty ATM Call Option (CE)**.
   - If Nifty breaks **BELOW** the 9:15–9:20 LOW $\rightarrow$ **BUY Nifty ATM Put Option (PE)**.
3. **Execution Limit:**
   - **Strictly 1 trade per day**. Once a trade is executed, the bot locks further entries until the next day.
4. **Risk Management & Exits:**
   - **Stop Loss:** `20 points` on option premium.
   - **Target:** `40 points` on option premium (1:2 Risk-Reward).
   - **Trailing Stop Loss:** Once the trade reaches `+20 points` profit, the Stop Loss is moved directly to entry price (breakeven / risk-free trade). As the profit grows further, the stop loss trails upward.
   - **Intraday Auto Square-Off:** Any open position is automatically closed at `15:20:00 IST`.

---

## 🌐 Localhost Web Dashboard (`http://localhost:5000`)

The bot now features a full-featured real-time **Localhost Web Dashboard** accessible directly in your web browser!

### To launch the Localhost Dashboard:
```powershell
python app.py
```
*(Or simply double-click `run_dashboard.bat`)*

Then open your browser at:
👉 **[http://localhost:5000](http://localhost:5000)**

### Dashboard Features:
- 🟢 **1-Click Start / Stop Bot**: Runs the trading bot safely in a background daemon thread.
- 🟡 **Paper Trading Toggle**: Instant switch between Paper Simulation and Live Broker execution.
- ⚡ **Real-time Nifty 50 Spot & 5-Min Range Radar**: Live High, Low, and breakout threshold indicators.
- 🎯 **Active Trade Card**: Real-time option P&L (₹), Stop Loss, Target, and Trailing SL progress.
- 🚨 **Emergency 1-Click Square-Off**: Instantly close active trades on demand.
- 🔑 **Alice Blue API Tester**: Validate session tokens directly from the UI.
- 📈 **Simulation Controls**: Test Buy ATM CE / PE breakout signals even on weekends/off-market hours.
- ⚙️ **In-Browser Settings Editor**: Update Stop Loss, Target, Lots, and API keys without editing code.
- 📟 **Live Terminal Streaming**: Real-time log monitoring from `logs/trades.log`.

---

## 📁 Project Structure

```text
vino_nifty50_bot/
│
├── app.py               # Localhost Web Dashboard & REST API server (http://localhost:5000)
├── run_dashboard.bat    # 1-Click Windows shortcut to launch dashboard and open browser
├── bot.py               # Main bot orchestrator and execution engine
├── config.py            # Central strategy settings, timers, SL/Target parameters
├── test_login.py        # Diagnostic script to test Alice Blue API credentials
├── requirements.txt     # Python package dependencies (pya3, dotenv, pandas, etc.)
├── .env.example         # Template for Alice Blue API credentials
├── .env                 # Your secret credentials file (create from .env.example)
├── logs/                # Daily execution and trade logs
│   └── trades.log       # Log file with real-time timestamps and P&L reports
└── data/                # State persistence directory
    └── daily_state.json # Saves daily high/low & position state across reboots
```

---

## 🚀 Laptop Setup & Installation Guide

### Step 1: Clone or Navigate to the Project Directory
Open PowerShell or Command Prompt on your laptop:

```powershell
cd C:\Users\MATRIX\.gemini\antigravity\scratch\vino_nifty50_bot
```

### Step 2: (Recommended) Create and Activate a Virtual Environment
```powershell
# Create virtual environment
python -m venv venv

# Activate on Windows PowerShell:
.\venv\Scripts\Activate.ps1

# (If running standard cmd.exe):
# .\venv\Scripts\activate.bat
```

### Step 3: Install Required Dependencies
```powershell
pip install -r requirements.txt
```

---

## 🔑 Alice Blue Credentials Setup

1. Copy `.env.example` to create your own `.env` file:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Open `.env` in a text editor (Notepad, VS Code, etc.).
3. Retrieve your credentials:
   - Log into [Alice Blue ANT Web](https://ant.aliceblueonline.com/).
   - Go to your profile $\rightarrow$ **Apps / API**.
   - Generate your **API Key** (Developer Key).
4. Update the `.env` file:
   ```env
   ALICE_USER_ID=YOUR_USER_ID
   ALICE_API_KEY=YOUR_API_KEY
   PAPER_TRADE=True
   NIFTY_LOTS=1
   EXPIRY_OVERRIDE=
   ```

> [!TIP]
> **Keep `PAPER_TRADE=True` first!** This lets you test the bot with live market data and simulated order fills with zero financial risk.

---

## 🧪 Testing Your Connection Before Market Open

Before trading starts, verify your credentials in 5 seconds by running:

```powershell
python test_login.py
```

If your credentials are valid, you will see:
```text
=================================================================
 [SUCCESS] LOGIN SUCCESSFUL! Alice Blue Session Active.
 Session ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
=================================================================
```

---

## 💻 Running the Trading Bot

Launch the main bot:

```powershell
python bot.py
```

### Expected Behavior Timeline:
- **09:00 - 09:15 AM:** Bot waits for market opening.
- **09:15 - 09:20 AM:** Bot streams Nifty 50 ticks and records the 5-minute High & Low.
- **09:20 AM:** Range locks (e.g., `High: 24580.00`, `Low: 24510.00`).
- **Post 09:20 AM:** If Nifty crosses above 24580.00 $\rightarrow$ Bot automatically calculates ATM Strike (e.g., `24600 CE`) and executes BUY.
- **In Position:** Real-time P&L updates in console every few seconds.
- **When Profit hits +20 pts:** Trailing Stop Loss locks to entry price (Risk-free trade).
- **Exit:** When Target (+40 pts) or SL is touched, the bot exits cleanly and records the complete trade report in `logs/trades.log`.

---

## ⚙️ Configuration Reference (`config.py`)

All settings can be customized in [`config.py`](file:///C:/Users/MATRIX/.gemini/antigravity/scratch/vino_nifty50_bot/config.py):

| Parameter | Default Value | Description |
| :--- | :--- | :--- |
| `PAPER_TRADE` | `True` | Set to `False` in `.env` to execute real broker orders |
| `MARKET_OPEN_TIME` | `"09:15:00"` | Strategy tracking begins |
| `RANGE_END_TIME` | `"09:20:00"` | End of 5-minute opening range |
| `TRADE_CUTOFF_TIME` | `"15:00:00"` | No new trades entered after this time |
| `SQUARE_OFF_TIME` | `"15:20:00"` | Auto exit for open intraday positions |
| `STOP_LOSS_POINTS` | `20.0` | Points below entry price on option premium |
| `TARGET_POINTS` | `40.0` | Points above entry price on option premium |
| `TRAILING_SL_ACTIVATION` | `20.0` | Profit points required to move SL to breakeven |
| `TRAILING_SL_STEP` | `10.0` | Points to step SL upward for subsequent gains |
| `MAX_TRADES_PER_DAY` | `1` | Max trades executed per session |
| `NIFTY_LOT_SIZE` | `25` | Lot size per Nifty contract |
| `NIFTY_LOTS` | `1` | Number of lots to buy |

---

## 🛡️ Crash & Restart Resilience

The bot includes an automatic state persistence engine (`data/daily_state.json`):
- If your laptop reboots, sleeps, or your Wi-Fi flickers, simply restart the bot (`python bot.py`).
- The bot automatically reloads today's recorded High/Low and any active position without re-triggering duplicate trades.

---

## 📜 Trade Log Example (`logs/trades.log`)

Every trade, signal, and heartbeat is preserved in `logs/trades.log`:

```text
[2026-10-30 09:20:00] [INFO] 5-MINUTE OPENING RANGE LOCKED (9:15 - 9:20 AM):
    * 5-Min HIGH : 24580.20
    * 5-Min LOW  : 24510.50
[2026-10-30 09:24:12] [INFO] BULLISH BREAKOUT TRIGGERED! Nifty 50 (24582.50) broke ABOVE High!
[2026-10-30 09:24:13] [INFO] [TRADE OPENED] NIFTY 2026-11-05 24600 CE | Qty: 25 | Entry: 154.20 | SL: 134.20 | Target: 194.20
[2026-10-30 09:35:40] [INFO] TRAILING SL ACTIVATED! Profit reached +20.00 pts. Moved Stop Loss to Cost: 154.20
[2026-10-30 09:48:15] [INFO] TARGET HIT! Option LTP reached 194.50.
[2026-10-30 09:48:15] [INFO] ==================== TRADE SUMMARY ====================
P&L Points: +40.30 pts | Net P&L: Rs. +1,007.50
```

---

## ⚠️ Disclaimer
*Algorithmic trading in Options involves substantial financial risk. Always test thoroughly in **Paper Trading Mode** (`PAPER_TRADE=True`) for several days before committing real capital. Ensure your laptop has a stable internet connection and power supply during trading hours.*

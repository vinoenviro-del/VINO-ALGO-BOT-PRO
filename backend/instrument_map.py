"""
================================================================================
Vino Algo Pro - Instrument Map
================================================================================
Maps symbols to Alice Blue tokens and provides lookup functions for pya3.
Tokens:
  - NIFTY (NSE): 26000
  - BANKNIFTY (NSE): 26009
  - FINNIFTY (NSE): 26037
  - MIDCPNIFTY (NSE): 26074
  - SENSEX (BSE): 1
  - BANKEX (BSE): 12
  - RELIANCE (NSE): 2885
  - TCS (NSE): 11536
  - INFY (NSE): 1594
  - HDFCBANK (NSE): 1333
  - ICICIBANK (NSE): 4963
  - SBIN (NSE): 3045
  - BHARTIARTL (NSE): 10604
  - ITC (NSE): 1660
  - KOTAKBANK (NSE): 1922
  - LT (NSE): 11483
  - AXISBANK (NSE): 5900
  - TATAMOTORS (NSE): 3456
  - MARUTI (NSE): 10999
================================================================================
"""

import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("InstrumentMap")

# Static Master Mapping
SYMBOL_TOKEN_MAP: Dict[str, Dict[str, Any]] = {
    "NIFTY": {
        "token": 26000,
        "exchange": "NSE",
        "name": "Nifty 50 Index",
        "segment": "INDICES",
        "fno_symbol": "NIFTY",
        "strike_step": 50,
        "lot_size": 25
    },
    "BANKNIFTY": {
        "token": 26009,
        "exchange": "NSE",
        "name": "Nifty Bank Index",
        "segment": "INDICES",
        "fno_symbol": "BANKNIFTY",
        "strike_step": 100,
        "lot_size": 15
    },
    "FINNIFTY": {
        "token": 26037,
        "exchange": "NSE",
        "name": "Nifty Financial Services",
        "segment": "INDICES",
        "fno_symbol": "FINNIFTY",
        "strike_step": 50,
        "lot_size": 25
    },
    "MIDCPNIFTY": {
        "token": 26074,
        "exchange": "NSE",
        "name": "Nifty Midcap Select",
        "segment": "INDICES",
        "fno_symbol": "MIDCPNIFTY",
        "strike_step": 25,
        "lot_size": 50
    },
    "SENSEX": {
        "token": 1,
        "exchange": "BSE",
        "name": "BSE Sensex Index",
        "segment": "BSE",
        "fno_symbol": "SENSEX",
        "strike_step": 100,
        "lot_size": 10
    },
    "BANKEX": {
        "token": 12,
        "exchange": "BSE",
        "name": "BSE Bankex Index",
        "segment": "BSE",
        "fno_symbol": "BANKEX",
        "strike_step": 100,
        "lot_size": 15
    },
    "RELIANCE": {
        "token": 2885,
        "exchange": "NSE",
        "name": "Reliance Industries Ltd",
        "segment": "NSE",
        "fno_symbol": "RELIANCE",
        "strike_step": 20,
        "lot_size": 250
    },
    "TCS": {
        "token": 11536,
        "exchange": "NSE",
        "name": "Tata Consultancy Services Ltd",
        "segment": "NSE",
        "fno_symbol": "TCS",
        "strike_step": 50,
        "lot_size": 175
    },
    "INFY": {
        "token": 1594,
        "exchange": "NSE",
        "name": "Infosys Ltd",
        "segment": "NSE",
        "fno_symbol": "INFY",
        "strike_step": 20,
        "lot_size": 400
    },
    "HDFCBANK": {
        "token": 1333,
        "exchange": "NSE",
        "name": "HDFC Bank Ltd",
        "segment": "NSE",
        "fno_symbol": "HDFCBANK",
        "strike_step": 10,
        "lot_size": 550
    },
    "ICICIBANK": {
        "token": 4963,
        "exchange": "NSE",
        "name": "ICICI Bank Ltd",
        "segment": "NSE",
        "fno_symbol": "ICICIBANK",
        "strike_step": 10,
        "lot_size": 700
    },
    "SBIN": {
        "token": 3045,
        "exchange": "NSE",
        "name": "State Bank of India",
        "segment": "NSE",
        "fno_symbol": "SBIN",
        "strike_step": 10,
        "lot_size": 1500
    },
    "BHARTIARTL": {
        "token": 10604,
        "exchange": "NSE",
        "name": "Bharti Airtel Ltd",
        "segment": "NSE",
        "fno_symbol": "BHARTIARTL",
        "strike_step": 20,
        "lot_size": 475
    },
    "ITC": {
        "token": 1660,
        "exchange": "NSE",
        "name": "ITC Ltd",
        "segment": "NSE",
        "fno_symbol": "ITC",
        "strike_step": 5,
        "lot_size": 1600
    },
    "KOTAKBANK": {
        "token": 1922,
        "exchange": "NSE",
        "name": "Kotak Mahindra Bank Ltd",
        "segment": "NSE",
        "fno_symbol": "KOTAKBANK",
        "strike_step": 20,
        "lot_size": 400
    },
    "LT": {
        "token": 11483,
        "exchange": "NSE",
        "name": "Larsen & Toubro Ltd",
        "segment": "NSE",
        "fno_symbol": "LT",
        "strike_step": 50,
        "lot_size": 175
    },
    "AXISBANK": {
        "token": 5900,
        "exchange": "NSE",
        "name": "Axis Bank Ltd",
        "segment": "NSE",
        "fno_symbol": "AXISBANK",
        "strike_step": 10,
        "lot_size": 625
    },
    "TATAMOTORS": {
        "token": 3456,
        "exchange": "NSE",
        "name": "Tata Motors Ltd",
        "segment": "NSE",
        "fno_symbol": "TATAMOTORS",
        "strike_step": 10,
        "lot_size": 1425
    },
    "MARUTI": {
        "token": 10999,
        "exchange": "NSE",
        "name": "Maruti Suzuki India Ltd",
        "segment": "NSE",
        "fno_symbol": "MARUTI",
        "strike_step": 100,
        "lot_size": 50
    }
}


def get_token(
    symbol: str,
    exchange: Optional[str] = None,
    is_option: bool = False,
    strike: Optional[float] = None,
    expiry: Optional[str] = None,
    option_type: Optional[str] = "CE",
    alice_instance: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Returns instrument metadata and token for pya3.
    Supports dynamic fallback search via alice.search_scrip / search_instruments for unknown symbols.
    """
    sym = symbol.strip().upper()
    exch = (exchange or ("BSE" if sym in ("SENSEX", "BANKEX") else "NSE")).strip().upper()

    # 1. Base Equity / Index Token Lookup
    meta = SYMBOL_TOKEN_MAP.get(sym)

    if not is_option:
        if meta:
            token = meta["token"]
            return {
                "symbol": sym,
                "exchange": meta["exchange"],
                "token": token,
                "name": meta["name"],
                "is_option": False,
                "lot_size": meta.get("lot_size", 25)
            }

        # Dynamic search via pya3 if unknown symbol
        if alice_instance:
            for fn_name in ("search_scrip", "search_instruments", "get_instrument_by_symbol"):
                if hasattr(alice_instance, fn_name):
                    try:
                        res = getattr(alice_instance, fn_name)(exch, sym)
                        if res:
                            inst = res[0] if isinstance(res, list) else res
                            token = getattr(inst, "token", getattr(inst, "scrip_token", 99999))
                            return {
                                "symbol": sym,
                                "exchange": exch,
                                "token": token,
                                "name": getattr(inst, "name", f"{sym} Equity"),
                                "is_option": False,
                                "lot_size": 25
                            }
                    except Exception as e:
                        logger.debug(f"Dynamic instrument search notice: {e}")

        # Fallback generated token
        fallback_token = 50000 + (sum(ord(c) for c in sym) % 40000)
        return {
            "symbol": sym,
            "exchange": exch,
            "token": fallback_token,
            "name": f"{sym} Stock",
            "is_option": False,
            "lot_size": 25
        }

    # 2. Option Token Lookup (F&O)
    opt_exch = "BFO" if exch == "BSE" else "NFO"
    fno_sym = meta.get("fno_symbol", sym) if meta else sym
    opt_t = (option_type or "CE").strip().upper()
    strike_val = int(strike) if strike and strike == int(strike) else (strike or 24500)
    exp_str = expiry or "2026-11-05"

    trading_symbol = f"{fno_sym} {exp_str} {strike_val} {opt_t}"

    # Try resolving via pya3 F&O resolver if session active
    if alice_instance and hasattr(alice_instance, "get_instrument_for_fno"):
        try:
            inst = alice_instance.get_instrument_for_fno(
                exch=opt_exch,
                symbol=fno_sym,
                expiry_date=exp_str,
                is_fut=False,
                strike=strike_val,
                is_CE=(opt_t == "CE")
            )
            if inst:
                return {
                    "symbol": trading_symbol,
                    "underlying": fno_sym,
                    "exchange": opt_exch,
                    "token": getattr(inst, "token", 88888),
                    "strike": strike_val,
                    "option_type": opt_t,
                    "expiry": exp_str,
                    "is_option": True,
                    "lot_size": meta.get("lot_size", 25) if meta else 25
                }
        except Exception as e:
            logger.debug(f"F&O instrument lookup notice for {trading_symbol}: {e}")

    # Simulated deterministic F&O token
    token = 70000 + (int(strike_val) % 20000) + (1 if opt_t == "CE" else 2)
    return {
        "symbol": trading_symbol,
        "underlying": fno_sym,
        "exchange": opt_exch,
        "token": token,
        "strike": strike_val,
        "option_type": opt_t,
        "expiry": exp_str,
        "is_option": True,
        "lot_size": meta.get("lot_size", 25) if meta else 25
    }

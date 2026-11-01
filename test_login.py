"""
Alice Blue Connection & Credentials Diagnostic Test
===================================================
Run this script to verify your Alice Blue User ID and API Key before launching the bot:
    python test_login.py
"""

import sys
from datetime import datetime
import config

print("=" * 65)
print(" " * 15 + "ALICE BLUE CREDENTIAL TEST")
print("=" * 65)

print(f"User ID configured : {config.ALICE_USER_ID if config.ALICE_USER_ID else '<NOT SET>'}")
print(f"API Key configured : {'*' * 8 + config.ALICE_API_KEY[-4:] if len(config.ALICE_API_KEY) > 4 else '<NOT SET>'}")
print(f"Paper Trade Mode   : {config.PAPER_TRADE}")
print("-" * 65)

if not config.ALICE_USER_ID or not config.ALICE_API_KEY:
    print("[ERROR] ALICE_USER_ID or ALICE_API_KEY is missing from your .env file.")
    print("Please edit .env and provide your valid Alice Blue credentials.")
    sys.exit(1)

try:
    from pya3 import Aliceblue
except ImportError:
    print("[ERROR] 'pya3' package is not installed.")
    print("Run: pip install -r requirements.txt")
    sys.exit(1)

print("[INFO] Attempting connection to Alice Blue...")
try:
    alice = Aliceblue(user_id=config.ALICE_USER_ID, api_key=config.ALICE_API_KEY)
    res = alice.get_session_id()
    print(f"[RESPONSE] Session response: {res}")

    if isinstance(res, dict) and ("sessionID" in res or res.get("stat") == "Ok"):
        session_id = res.get("sessionID")
        print("\n" + "=" * 65)
        print(" [SUCCESS] LOGIN SUCCESSFUL! Alice Blue Session Active.")
        print(f" Session ID: {session_id}")
        print("=" * 65)

        # Quick test fetching Nifty 50 contract
        print("\n[INFO] Testing contract master download for INDICES...")
        alice.get_contract_master("INDICES")
        nifty = alice.get_instrument_by_symbol("INDICES", "Nifty 50")
        if nifty:
            print(f"[SUCCESS] Resolved Nifty 50 instrument: {nifty}")
            info = alice.get_scrip_info(nifty)
            print(f"[INFO] Nifty 50 Quote Info: LTP = {info.get('LTP', 'N/A') if isinstance(info, dict) else info}")
        else:
            print("[NOTICE] Nifty 50 symbol check completed.")

        print("\nYou are all set to run Vino Nifty Bot:")
        print("    python bot.py")
    else:
        print("\n[WARNING] Could not retrieve session ID. Broker response:")
        print(res)
        print("\nTroubleshooting tips:")
        print("1. Ensure you have logged into ANT Web/Mobile at least once today.")
        print("2. Check that your API Key is active in ANT Developer Console.")
        print("3. Verify your User ID has API trading enabled.")

except Exception as e:
    print(f"\n[EXCEPTION] Error connecting to Alice Blue: {e}")
    sys.exit(1)

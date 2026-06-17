import os
import sys
import re
import time
import json
import argparse
from dotenv import load_dotenv
import pandas as pd

# Load local .env
load_dotenv()

# Add current dir to path to import helpers
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ticker_mapper import to_yfinance_symbol
from yfinance_client import fetch_history_with_retry, extract_ticker_df, fetch_valuation_safe
from snapshot_writer import format_snapshot, write_snapshot_json

def parse_ts_constituents(universe_id: str) -> list[dict]:
    # Try to find market-universe.ts under src/domain/universe/
    file_path = "src/domain/universe/market-universe.ts"
    if not os.path.exists(file_path):
        # Fallback search
        file_path = "../../src/domain/universe/market-universe.ts"
        if not os.path.exists(file_path):
            raise FileNotFoundError("Could not locate market-universe.ts")
            
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    pattern_name = f"{universe_id}_CONSTITUENTS"
    array_pattern = rf"const\s+{pattern_name}\s*(?::\s*\w+\[\])?\s*=\s*\[(.*?)\];"
    match = re.search(array_pattern, content, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find constituent array {pattern_name} in {file_path}")
        
    array_content = match.group(1)
    
    constituents = []
    items = re.findall(r"\{([^\}]+)\}", array_content)
    for item in items:
        pairs = re.findall(r"(\w+)\s*:\s*['\"]([^'\"]+)['\"]", item)
        data = {}
        for k, v in pairs:
            data[k] = v
        if "symbol" in data and "assetId" in data:
            constituents.append(data)
            
    return constituents

def write_failures_merged(dest_dir: str, new_failures: list[dict], current_symbols: list[str]):
    os.makedirs(dest_dir, exist_ok=True)
    filepath = os.path.join(dest_dir, "failures.latest.json")
    
    existing_failures = []
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                existing_failures = json.load(f)
        except Exception:
            existing_failures = []
            
    # Filter out failures that are re-evaluated in this run
    filtered_failures = [f for f in existing_failures if f.get("symbol") not in current_symbols]
    merged = filtered_failures + new_failures
    
    import json
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    print(f"Failures logged to {filepath} (total failures: {len(merged)})")

def main():
    from datetime import datetime
    now_str = datetime.now().isoformat()
    # Load settings
    allow_fallback = os.getenv("ALLOW_PERSONAL_FALLBACK", "false").lower() == "true"
    enable_yfinance = os.getenv("ENABLE_YFINANCE_PERSONAL", "false").lower() == "true"
    
    if not (allow_fallback and enable_yfinance):
        print("Guardrail Check: yfinance personal fallback is DISABLED in environment.")
        print("Ensure ALLOW_PERSONAL_FALLBACK=true and ENABLE_YFINANCE_PERSONAL=true.")
        sys.exit(0)
        
    parser = argparse.ArgumentParser(description="yfinance snapshot worker")
    parser.add_argument("--universe", required=True, choices=["KOSPI_SAMPLE", "SP500_SAMPLE"], help="Universe to process")
    args = parser.parse_args()
    
    universe_id = args.universe
    region = "KR" if "KOSPI" in universe_id else "US"
    
    # Load parameters
    max_tickers = int(os.getenv("YFINANCE_MAX_TICKERS_PER_RUN", "20"))
    sleep_ms = int(os.getenv("YFINANCE_SLEEP_MS", "800"))
    period = os.getenv("YFINANCE_HISTORY_PERIOD", "6mo")
    interval = os.getenv("YFINANCE_INTERVAL", "1d")
    dest_dir = os.getenv("MARKET_BOARD_SNAPSHOT_DIR", "data/snapshots/market-board")
    
    # Parse constituents
    print(f"Loading constituents for {universe_id}...")
    constituents = parse_ts_constituents(universe_id)
    print(f"Found {len(constituents)} constituents.")
    
    # Limit run size
    if len(constituents) > max_tickers:
        print(f"Slicing run size to {max_tickers} due to YFINANCE_MAX_TICKERS_PER_RUN.")
        constituents = constituents[:max_tickers]
        
    ticker_data_map = {}
    valuation_map = {}
    failures = []
    
    # Map symbols to yfinance symbols
    yf_symbols = []
    symbol_to_yf = {}
    for c in constituents:
        symbol = c["symbol"]
        try:
            yf_symbol = to_yfinance_symbol(region, symbol)
            yf_symbols.append(yf_symbol)
            symbol_to_yf[symbol] = yf_symbol
        except Exception as e:
            print(f"Symbol mapping error for {symbol}: {e}")
            failures.append({
                "symbol": symbol,
                "yfSymbol": symbol,
                "reason": "symbol_mapping_error",
                "status": "error"
            })
            
    # Fetch price history in bulk
    print(f"Fetching bulk price history for {len(yf_symbols)} tickers...")
    try:
        bulk_df = fetch_history_with_retry(yf_symbols, period, interval)
    except Exception as e:
        print(f"Fatal error fetching history: {e}")
        # Treat all as failed
        bulk_df = None
        
    # Process each ticker
    for c in constituents:
        symbol = c["symbol"]
        yf_symbol = symbol_to_yf.get(symbol)
        
        if not yf_symbol:
            continue
            
        print(f"Processing ticker {symbol} ({yf_symbol})...")
        
        # Extract from bulk df
        ticker_df = None
        if bulk_df is not None:
            ticker_df = extract_ticker_df(bulk_df, yf_symbol)
            
        # Check if Close column exists and has non-NaN values
        close_col = None
        if ticker_df is not None and not ticker_df.empty:
            for col in ticker_df.columns:
                if col.lower() == "close":
                    close_col = col
                    break
        
        has_close_data = False
        if close_col is not None:
            has_close_data = not ticker_df[close_col].dropna().empty

        if ticker_df is None or ticker_df.empty or not has_close_data:
            failures.append({
                "symbol": symbol,
                "yfSymbol": yf_symbol,
                "reason": "empty_dataframe",
                "status": "not_found"
            })
            continue
            
        # Store in map
        ticker_data_map[symbol] = ticker_df
        
        # Sleep to avoid rate limiting before next info request
        time.sleep(sleep_ms / 1000.0)
        
        # Fetch valuation metrics safe
        print(f"Fetching info for {yf_symbol}...")
        val_info = fetch_valuation_safe(yf_symbol)
        valuation_map[symbol] = val_info
        
    # Build and write snapshot
    print("Generating snapshot file...")
    snapshot = format_snapshot(universe_id, constituents, ticker_data_map, valuation_map)
    write_snapshot_json(dest_dir, f"{universe_id}.latest.json", snapshot)
    
    # Save individual OHLCV history files
    ohlcv_base_dir = os.path.join("data", "market", "ohlcv", universe_id)
    os.makedirs(ohlcv_base_dir, exist_ok=True)
    
    for c in constituents:
        symbol = c["symbol"]
        asset_id = c["assetId"]
        
        if symbol in ticker_data_map:
            df = ticker_data_map[symbol]
            bars = []
            for ts, row in df.iterrows():
                date_str = ts.strftime("%Y-%m-%d") if hasattr(ts, 'strftime') else str(ts)[:10]
                
                # Retrieve standard columns case-insensitively
                open_col, high_col, low_col, close_col, vol_col = None, None, None, None, None
                for col in df.columns:
                    lcol = col.lower()
                    if lcol == "open": open_col = col
                    elif lcol == "high": high_col = col
                    elif lcol == "low": low_col = col
                    elif lcol == "close": close_col = col
                    elif lcol == "volume": vol_col = col
                
                if open_col is None or high_col is None or low_col is None or close_col is None:
                    continue
                    
                open_val = row[open_col]
                high_val = row[high_col]
                low_val = row[low_col]
                close_val = row[close_col]
                vol_val = row[vol_col] if vol_col is not None else 0
                
                if pd.isna(open_val) or pd.isna(high_val) or pd.isna(low_val) or pd.isna(close_val):
                    continue
                    
                bars.append({
                    "assetId": asset_id,
                    "date": date_str,
                    "open": float(open_val),
                    "high": float(high_val),
                    "low": float(low_val),
                    "close": float(close_val),
                    "volume": float(vol_val) if not pd.isna(vol_val) else 0.0
                })
                
            history_file = {
                "assetId": asset_id,
                "symbol": symbol,
                "universeId": universe_id,
                "source": "Yahoo Finance via yfinance",
                "sourceTier": "personal_fallback",
                "warnings": ["unofficial", "personal_use_only"],
                "updatedAt": now_str,
                "dataStatus": "cached",
                "bars": bars
            }
            
            safe_asset_id = asset_id.replace(":", "_")
            filepath = os.path.join(ohlcv_base_dir, f"{safe_asset_id}.json")
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(history_file, f, indent=2, ensure_ascii=False)
            print(f"OHLCV history written for {symbol} to {filepath}")
            
    # Write failures
    all_symbols_in_run = [c["symbol"] for c in constituents]
    write_failures_merged(dest_dir, failures, all_symbols_in_run)
    print("Done!")

if __name__ == "__main__":
    main()

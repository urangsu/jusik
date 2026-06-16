import os
import json
import datetime
import pandas as pd

DEFAULT_SOURCE_SUMMARIES = [
    { "providerId": "opendart", "displayName": "OpenDART", "tier": "official", "status": "healthy", "used": 0, "limit": None, "warnings": [], "enabled": True },
    { "providerId": "sec_edgar", "displayName": "SEC EDGAR", "tier": "official", "status": "healthy", "used": 0, "limit": None, "warnings": [], "enabled": True },
    { "providerId": "fmp_free", "displayName": "Financial Modeling Prep Free", "tier": "free_limited", "status": "healthy", "used": 0, "limit": 250, "warnings": [], "enabled": True },
    { "providerId": "finnhub_free", "displayName": "Finnhub Free", "tier": "free_limited", "status": "disabled", "used": 0, "limit": 60, "warnings": [], "enabled": False },
    { "providerId": "alpha_vantage_free", "displayName": "Alpha Vantage Free", "tier": "free_limited", "status": "disabled", "used": 0, "limit": 25, "warnings": [], "enabled": False },
    { "providerId": "yfinance_personal", "displayName": "Yahoo Finance via yfinance", "tier": "personal_fallback", "status": "healthy", "used": 1, "limit": None, "warnings": ["unofficial", "personal_use_only"], "enabled": True },
    { "providerId": "stooq_personal", "displayName": "Stooq", "tier": "personal_fallback", "status": "disabled", "used": 0, "limit": None, "warnings": ["unofficial", "personal_use_only"], "enabled": False }
]

def build_empty_snapshot(universe_id: str, warnings: list[str] = None) -> dict:
    return {
        "universeId": universe_id,
        "generatedAt": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "sourceSummary": DEFAULT_SOURCE_SUMMARIES,
        "tiles": [],
        "tableRows": [],
        "missingData": [],
        "warnings": warnings or []
    }

def calculate_performance_metrics(history_df: pd.DataFrame) -> dict:
    # Ensure DataFrame is sorted by index
    df = history_df.sort_index()
    
    # Drop rows where Close is missing or NaN
    # We find Close case-insensitively
    close_col = None
    for c in df.columns:
        if c.lower() == "close":
            close_col = c
            break
            
    if close_col is None:
        raise ValueError("Close column is missing in DataFrame")
        
    df = df.dropna(subset=[close_col])
    if df.empty:
        raise ValueError("DataFrame is empty after dropping missing Close rows")
        
    # Get values
    closes = df[close_col].tolist()
    latest_close = closes[-1]
    
    # change percent from previous close
    change_percent = None
    if len(closes) > 1:
        prev_close = closes[-2]
        if prev_close > 0:
            change_percent = ((latest_close - prev_close) / prev_close) * 100.0
            
    # max close for 52-week or historical high
    max_close = max(closes)
    high_52_week_percent = None
    if max_close > 0:
        high_52_week_percent = ((latest_close - max_close) / max_close) * 100.0
        
    # 20 day return (20 rows ago)
    return_20_day = None
    if len(closes) > 20:
        close_20 = closes[-21]
        if close_20 > 0:
            return_20_day = ((latest_close - close_20) / close_20) * 100.0
            
    # 60 day return (60 rows ago)
    return_60_day = None
    if len(closes) > 60:
        close_60 = closes[-61]
        if close_60 > 0:
            return_60_day = ((latest_close - close_60) / close_60) * 100.0
            
    # Volume
    vol_col = None
    for c in df.columns:
        if c.lower() == "volume":
            vol_col = c
            break
            
    volume = None
    if vol_col is not None and not pd.isna(df.iloc[-1][vol_col]):
        volume = float(df.iloc[-1][vol_col])
        
    return {
        "price": latest_close,
        "changePercent": change_percent,
        "high52WeekPercent": high_52_week_percent,
        "return20Day": return_20_day,
        "return60Day": return_60_day,
        "volume": volume
    }

def format_snapshot(
    universe_id: str,
    constituents: list[dict],
    ticker_data_map: dict,
    valuation_map: dict
) -> dict:
    tiles = []
    table_rows = []
    missing_data = []
    now_str = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
    for c in constituents:
        symbol = c["symbol"]
        asset_id = c["assetId"]
        name = c.get("nameKo") or c.get("nameEn") or symbol
        sector = c.get("sector")
        industry = c.get("industry")
        
        # Check if we have history data
        perf = None
        if symbol in ticker_data_map:
            try:
                perf = calculate_performance_metrics(ticker_data_map[symbol])
            except Exception as ex:
                print(f"Error calculating metrics for {symbol}: {ex}")
                missing_data.append({
                    "symbol": symbol,
                    "name": name,
                    "missingFields": ["price_history_error"]
                })
        else:
            missing_data.append({
                "symbol": symbol,
                "name": name,
                "missingFields": ["price_history"]
            })
            
        # Get valuation metrics
        val = valuation_map.get(symbol, {
            "marketCap": None,
            "per": None,
            "pbr": None,
            "roe": None,
            "dividendYield": None
        })
        
        price = perf["price"] if perf else None
        change_percent = perf["changePercent"] if perf else None
        volume = perf["volume"] if perf else None
        turnover = (price * volume) if (price is not None and volume is not None) else None
        
        # Build tile
        tile = {
            "assetId": asset_id,
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "industry": industry,
            "price": price,
            "changePercent": change_percent,
            "marketCap": val.get("marketCap"),
            "weight": None,
            "volume": volume,
            "tileSizeMetric": "market_cap",
            "dataStatus": "cached",
            "source": "Yahoo Finance via yfinance",
            "sourceTier": "personal_fallback",
            "warnings": ["unofficial", "personal_use_only"],
            "updatedAt": now_str
        }
        tiles.append(tile)
        
        # Build table row
        row = {
            "assetId": asset_id,
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "industry": industry,
            "price": price,
            "changePercent": change_percent,
            "volume": volume,
            "turnover": turnover,
            "marketCap": val.get("marketCap"),
            "high52WeekPercent": perf["high52WeekPercent"] if perf else None,
            "return20Day": perf["return20Day"] if perf else None,
            "return60Day": perf["return60Day"] if perf else None,
            "per": val.get("per"),
            "pbr": val.get("pbr"),
            "roe": val.get("roe"),
            "dividendYield": val.get("dividendYield"),
            "dataStatus": "cached",
            "source": "Yahoo Finance via yfinance",
            "sourceTier": "personal_fallback",
            "warnings": ["unofficial", "personal_use_only"],
            "updatedAt": now_str
        }
        table_rows.append(row)
        
    return {
        "universeId": universe_id,
        "generatedAt": now_str,
        "sourceSummary": DEFAULT_SOURCE_SUMMARIES,
        "tiles": tiles,
        "tableRows": table_rows,
        "missingData": missing_data,
        "warnings": []
    }

def write_snapshot_json(dest_dir: str, filename: str, data: dict):
    os.makedirs(dest_dir, exist_ok=True)
    filepath = os.path.join(dest_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Snapshot successfully written to {filepath}")

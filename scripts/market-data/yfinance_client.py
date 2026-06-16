import time
import datetime
import pandas as pd
import yfinance as yf

def fetch_history_with_retry(symbols: list[str], period: str, interval: str, max_retries: int = 1) -> pd.DataFrame:
    for attempt in range(max_retries + 1):
        try:
            df = yf.download(
                tickers=symbols,
                period=period,
                interval=interval,
                group_by="ticker",
                auto_adjust=False,
                progress=False,
                threads=False,
            )
            if df is not None and not df.empty:
                return df
        except Exception as e:
            if attempt == max_retries:
                raise e
            time.sleep(1)
    return pd.DataFrame()

def format_timestamp(ts) -> str:
    if isinstance(ts, str):
        return ts
    if ts.tzinfo is not None:
        return ts.tz_convert('UTC').strftime("%Y-%m-%dT%H:%M:%S.000Z")
    else:
        return ts.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def extract_ticker_df(df: pd.DataFrame, ticker: str) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()
    
    # Check if df has MultiIndex columns (like from yf.download)
    if isinstance(df.columns, pd.MultiIndex):
        # MultiIndex columns: level 0 is ticker name, level 1 is metric name
        # We search ticker in level 0
        if ticker in df.columns.levels[0]:
            return df[ticker]
        elif ticker in df.columns:
            return df[ticker]
    else:
        # Single index columns (if only 1 ticker was requested, yfinance might not use multi-index)
        return df
    
    return pd.DataFrame()

def fetch_valuation_safe(symbol: str) -> dict:
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        if not info:
            info = {}
        
        roe = info.get("returnOnEquity")
        if roe is not None:
            # yfinance returns ROE as decimal, e.g. 0.1542 for 15.42%
            # We convert it to percent (15.42)
            roe = float(roe) * 100.0
            
        div = info.get("dividendYield") or info.get("trailingAnnualDividendYield")
        if div is not None:
            # yfinance returns div yield as decimal, e.g. 0.0053 for 0.53%
            div = float(div) * 100.0
            
        return {
            "marketCap": info.get("marketCap"),
            "per": info.get("trailingPE") or info.get("forwardPE"),
            "pbr": info.get("priceToBook"),
            "roe": roe,
            "dividendYield": div,
        }
    except Exception as e:
        print(f"Warning: Failed to fetch info for {symbol}: {e}")
        return {
            "marketCap": None,
            "per": None,
            "pbr": None,
            "roe": None,
            "dividendYield": None,
        }

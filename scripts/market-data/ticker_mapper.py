def to_yfinance_symbol(region: str, symbol: str) -> str:
    if region == "KR":
        return f"{symbol}.KS"
    if region == "US":
        return symbol
    raise ValueError(f"Unsupported region: {region}")

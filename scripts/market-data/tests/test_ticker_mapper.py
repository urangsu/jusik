import pytest
from ticker_mapper import to_yfinance_symbol

def test_kr_symbol_mapping():
    assert to_yfinance_symbol("KR", "005930") == "005930.KS"
    assert to_yfinance_symbol("KR", "000660") == "000660.KS"

def test_us_symbol_mapping():
    assert to_yfinance_symbol("US", "AAPL") == "AAPL"
    assert to_yfinance_symbol("US", "MSFT") == "MSFT"

def test_unsupported_region():
    with pytest.raises(ValueError):
        to_yfinance_symbol("JP", "7203")

import pytest
import pandas as pd
from snapshot_writer import calculate_performance_metrics, format_snapshot

def test_empty_dataframe_raises_value_error():
    df = pd.DataFrame()
    with pytest.raises(ValueError):
        calculate_performance_metrics(df)

def test_missing_close_raises_value_error():
    df = pd.DataFrame({
        "Open": [100.0, 101.0],
        "High": [105.0, 106.0],
        "Low": [95.0, 96.0],
        "Volume": [1000, 1100]
    })
    with pytest.raises(ValueError):
        calculate_performance_metrics(df)

def test_performance_metrics_calculation():
    # Construct a valid dataframe with 25 rows to test 20 day return
    dates = pd.date_range(start="2026-05-01", periods=25, freq="D")
    closes = [float(100 + i) for i in range(25)] # 100 to 124
    df = pd.DataFrame({
        "Open": closes,
        "High": closes,
        "Low": closes,
        "Close": closes,
        "Volume": [1000.0] * 25
    }, index=dates)
    
    metrics = calculate_performance_metrics(df)
    assert metrics["price"] == 124.0
    # prev close was 123.0. changePercent = (124 - 123)/123 * 100
    assert metrics["changePercent"] == ((124.0 - 123.0) / 123.0) * 100.0
    # 20 trading rows ago was closes[-21] which is closes[4] = 104.0
    # return20Day = (124 - 104) / 104 * 100
    assert metrics["return20Day"] == ((124.0 - 104.0) / 104.0) * 100.0
    assert metrics["volume"] == 1000.0

def test_snapshot_formatting_contains_source_tier_and_warnings():
    constituents = [
        { "symbol": "AAPL", "assetId": "US:AAPL", "nameEn": "Apple", "sector": "Tech", "industry": "Consumer Electronics" }
    ]
    
    dates = pd.date_range(start="2026-06-01", periods=2)
    ticker_data = pd.DataFrame({
        "Close": [180.0, 182.0],
        "Volume": [1000.0, 2000.0]
    }, index=dates)
    
    ticker_data_map = { "AAPL": ticker_data }
    valuation_map = {
        "AAPL": {
            "marketCap": 2850000000000,
            "per": 29.5,
            "pbr": 38.2,
            "roe": 154.2,
            "dividendYield": 0.53
        }
    }
    
    snapshot = format_snapshot("SP500_SAMPLE", constituents, ticker_data_map, valuation_map)
    
    assert snapshot["universeId"] == "SP500_SAMPLE"
    assert len(snapshot["tiles"]) == 1
    tile = snapshot["tiles"][0]
    assert tile["symbol"] == "AAPL"
    assert tile["sourceTier"] == "personal_fallback"
    assert "unofficial" in tile["warnings"]
    assert "personal_use_only" in tile["warnings"]
    
    assert len(snapshot["tableRows"]) == 1
    row = snapshot["tableRows"][0]
    assert row["symbol"] == "AAPL"
    assert row["sourceTier"] == "personal_fallback"
    assert "unofficial" in row["warnings"]

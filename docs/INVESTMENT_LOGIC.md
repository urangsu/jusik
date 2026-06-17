# K-Terminal Investment Logic

## Quantitative Screening & Signals
K-Terminal hosts a multi-factor ranking system that estimates factor covariance, calculates Rank Information Coefficient (IC) and Information Ratio (IR), and computes cross-sectional normalization scores.

## Risk Control Boundaries

### Regime Gate
The `Regime Gate` operates as a circuit breaker for quantitative recommendations. It monitors market volatility, volume spikes, and macroeconomic indicators to determine whether current market conditions warrant active signal generation:
1. **Volatile Conditions**: When the standard deviation of market-wide indices exceeds historical benchmarks, the Regime Gate restricts recommendation scores.
2. **Data Integrity Check**: Vetoes any recommendation if data quality scores fall below acceptable thresholds or if fallback data (e.g. yfinance) is the sole provider.
3. **Signal Classification**: Outputs signals classified as "검토" (Review), "관망" (Observing), "주의" (Caution), "위험" (Risk), or "데이터 부족" (Insufficient Data), strictly adhering to the principle that signals are diagnostic indicators rather than investment advice.

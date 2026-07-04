# Surge Detector v2

Surge Detector v2 identifies unusual movement candidates for review. It does not recommend trades and does not auto-promote assets to Watchlist.

## Signals

- 1-day price change.
- 5-day and 20-day returns.
- 5-day volume ratio.
- 20-day volume z-score.
- Volatility expansion.
- Close location value.
- Gap percentage.
- Trading value liquidity filter.

## Safety Rules

- Low-liquidity assets are filtered before candidate creation.
- Candidate ids are deterministic by asset/date for dedupe.
- Candidate status starts as `new`.
- Promotion to Watchlist remains explicit user action.
- No buy/sell, target price, or expected return wording.

## Current Limitations

- Sector-relative strength is a placeholder field until sector benchmark coverage is added.
- Filing-event boost requires filing event integration.

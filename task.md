# JUSIK Project Task Board

## Non-Negotiable Principles
This project enforces strict boundaries for data correctness and security:
- Do not display fake financial numbers.
- Do not convert null financial values to 0.
- Every market, filing, financial, news, factor, strategy, and portfolio response must use `DataEnvelope<T>`.
- Explain only from provided data, never invent target prices, target ratios, filings, or trading recommendations.
- Keep live trading and broker order placement out of scope.
- Enforce strict fail-closed security: unknown universeId or unauthorized provider access returns `insufficient_data` or `error`.

## Product Direction
JUSIK transitions from a localized mockup system to a robust, Real Data Beta platform:
- **Core Value**: Direct, transparent data pipelines from official providers (KIS, OpenDART, Finnhub).
- **Core Strategy**: Actionable signal validation with strict data quality gating and no silent fallbacks.

---

## Work Order Roadmap

### WO017-U4: Fail-Closed & Canonical Strategy Agreement [COMPLETED]
- [x] Remove mock key fallbacks from quote/OHLCV API routes.
- [x] Enforce `INTERNAL_SMOKE_KEY` authorization on smoke API endpoints.
- [x] Restrict Stability Gate to `status === "passed"` for actionable status.
- [x] Enforce strict universe membership check (prevent mixing KOSPI and Watchlist assets).
- [x] Prevent automatic KOSPI_SAMPLE/SP500_SAMPLE fallback when universeId is missing.

### WO017-V: Real Data Beta Activation [IN PROGRESS]
- [x] Phase 1: Security & Regression Cleanup
  - [x] Invalidate leaked OpenDART API key and replace with placeholder in `provider-secrets.json`.
  - [x] Remove universeId fallback from `calculateStrategyAgreementSignal` and require explicit `universeId` input.
  - [x] Update strategy agreement tests to supply `universeId` and add missing validation test.
  - [x] Restructure `task.md` to cleanly integrate required doc checker sections without HTML comment overrides.
- [ ] Phase 2: Local Secret Setup
  - Configure real credentials (`KIS_APP_KEY`, `KIS_APP_SECRET`, `FINNHUB_API_KEY`, new `OPENDART_API_KEY`) on the local developer machine.
- [ ] Phase 3: Smoke Verification
  - Run smoke runner to verify `dataAvailable=true` for active providers and output results.
- [ ] Phase 4: Backfill & E2E Validation
  - Run market backfill for KR_005930 and US_AAPL to verify that real OHLCV data propagates down to technical factors, atomic signals, stability gate, suitability, and evidence pack.
- [ ] Phase 5: Browser Manual QA
  - Perform structured UI testing in light/dark modes across Korean/English languages.
- [ ] Phase 6: Git Closure
  - Run validation build checks (typecheck, lint, build).
  - Commit, push remote diff, and merge.


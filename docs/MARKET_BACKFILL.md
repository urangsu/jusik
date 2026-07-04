# Market Backfill Foundation

Market backfill is a contract-first runner for storing provider `DataEnvelope` responses by universe and asset.

## Scope

- `npm run market:backfill -- --universe=SP500_SAMPLE --capability=ohlcv --range=1M`
- `POST /api/market/backfill/run`
- `GET /api/market/backfill/latest`

## Rules

- Backfill does not imply live market data coverage.
- `api_required`, `rate_limited`, and `error` responses are recorded instead of hidden.
- `value: null` is never converted to `0`.
- Generated files live under `data/market/` and must not be committed.
- `KOSPI_SAMPLE` and `SP500_SAMPLE` are smoke universes, not full index coverage.

## Current Limitations

- No production database adapter.
- No complete universe coverage.
- Provider output quality depends on configured provider credentials and free-tier limits.

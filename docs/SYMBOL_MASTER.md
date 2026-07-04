# Symbol Master

Symbol Master maps display/query symbols to canonical internal `assetId` values and provider identifiers.

## Canonical Keys

- Korea assets use `KR_` asset ids, for example `KR_005930`.
- US assets use `US_` asset ids, for example `US_AAPL`.
- Raw symbols are search/display fields, not primary keys.

## Initial Coverage

- `KR_005930`: Samsung Electronics, OpenDART `corpCode=00126380`.
- `US_AAPL`: Apple Inc., SEC `cik=0000320193`.

## Runtime Store

Manual imports are stored under `data/symbols/`.
This is generated runtime data and is not a production symbol database.

## Import Guard

Imports reject non-canonical asset ids:

- KR records must use `KR_` prefix and `KRW`.
- US records must use `US_` prefix and `USD`.

## API

- `GET /api/symbols/search`
- `GET /api/symbols/[assetId]`
- `POST /api/symbols/import`

# PIT_DATA_POLICY.md

## Purpose

PIT(Point-in-Time) data policy prevents K-Terminal from using data that was not known at the historical calculation time.

## Non-goals

- No real DART, SEC, KRX, KIS, Polygon, Finnhub, or FMP API calls.
- No production database adapter in 003-A.
- No backtest performance calculation.

## Time Fields

- `asOfDate`: the business date the value describes.
- `effectiveAt`: when the value became economically or legally effective.
- `ingestedAt`: when K-Terminal first stored or observed the value.

Backtests must use `knownAt` and cannot read records ingested after that timestamp.

## Revision Handling

- Do not overwrite PIT records.
- Store corrections and revisions as new records.
- Old records may be marked `superseded`, but must not be deleted.
- Every record must have `dataVersionId` and `hash`.

## Seed Data

`seed_demo` is only for local contract and UI state checks. It is not production data and cannot feed production signals.

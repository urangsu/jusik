# MARKET_DATA_PROVIDER.md

## Purpose

Market data providers define how Quote and OHLCV data enter K-Terminal without fake connected states.

## Provider Contract

`MarketDataProvider` exposes:

- `providerId`
- `getQuote(request, { signal })`
- `getOhlcv(request, { signal })`

Both methods return `DataEnvelope<T>`.

## Required Status Handling

- `api_required`: provider or credential is not connected.
- `delayed`: provider is intentionally delayed.
- `eod`: end-of-day data only.
- `cached`: cached response, not live.
- `stale`: known data but freshness expired.
- `rate_limited`: provider quota hit.
- `error`: unexpected failure.

`api_required` must return `value: null`. It must not return 0 price or fake candles.

## Query Key Policy

Quote key includes:

- providerId
- market
- assetId

OHLCV key includes:

- providerId
- market
- assetId
- range
- interval

Display symbol is not sufficient as a query key because KR/US symbols can collide.

## Request Cancellation

Provider methods accept `AbortSignal`. If a request is already aborted, the provider boundary must stop before returning fake data.

## No Fake Connected State

Having a provider class or API key field does not mean data is connected. UI may only show real price/chart state when a provider returns a non-null `DataEnvelope.value` with a valid status and validated candles.

# Real Provider Wiring

JUSIK/K-Terminal is a research and evidence terminal, not an automated trading bot. Real provider wiring exists to verify that external data can enter the system without breaking the DataEnvelope, EvidencePack, and diagnostic safety contracts.

## Goals

- Verify real provider responses without creating fake success.
- Treat missing API keys as `api_required`, not as a runtime crash.
- Reject `value: null` with market-data success statuses such as `real_time`.
- Preserve `source`, `sourceTier`, `updatedAt`, and `warnings` for every provider response.
- Convert provider responses into EvidencePack records for later report, debate, and outcome workflows.

## Non-Goals

- No order placement.
- No automated trading.
- No buy/sell recommendation wording.
- No generated financial numbers.
- No fake OpenDART financial statement payload before the parser is wired.

## Smoke Targets

The canonical smoke target list is defined in `src/server/ops/real-provider-smoke-targets.ts`.

Current targets:

- KIS KR quote
- KIS KR OHLCV
- OpenDART disclosures
- OpenDART financials readiness
- FMP US quote
- FMP US OHLCV
- Finnhub US quote
- Alpha Vantage US quote
- Provider health

OpenDART financials are intentionally limited to `api_required` or `not_supported` until the real parser is implemented.

## DataEnvelope Contract

Every smoke response must satisfy:

- `status` is a valid DataStatus.
- `source` is present.
- `sourceTier` is present.
- `warnings` is an array.
- `updatedAt` is present as `string | null`.
- `value` is not null when `status` is `real_time`, `delayed`, `eod`, `cached`, or `stale`.
- `updatedAt` is not null when the response claims data availability.

This check is implemented in `src/server/ops/data-envelope-contract-validator.ts`.

## EvidencePack Conversion

Each smoke result produces an EvidencePack. `api_required`, `rate_limited`, `error`, and `not_supported` become missing evidence or blocked actions, not silent success.

Implementation:

- `src/server/evidence/evidence-pack-from-data-envelope.ts`

## API

- `POST /api/ops/real-provider-smoke/run`
- `GET /api/ops/real-provider-smoke/latest`

Both endpoints return DataEnvelope. They do not expose secret values.

## CLI

```bash
npm run ops:real-provider-smoke
npm run ops:real-provider-smoke -- --base-url=http://localhost:3000
npm run ops:real-provider-smoke -- --mode=without_key
```

The CLI requires a running Next.js server for HTTP target checks. It saves the latest report under the runtime data root.

Expectation mode:

- `auto`: default. Uses provider readiness. If keys are configured and smoke can run, `expectedWithKey` is enforced.
- `without_key`: validates disconnected/no-key fallback states such as `api_required` or `not_supported`.
- `with_key`: forces key-backed expectations and fails if a connected provider still returns no data.

## Current Limitations

- This work validates the provider boundary; it does not guarantee provider coverage.
- API keys are not bundled or inferred.
- OpenDART financial statement parsing is not yet connected.
- Real backfill, rate limiting, retry policy, and cache policy are handled by later work orders.

# UNIVERSE_POLICY.md

## Purpose

Every factor, strategy, and research calculation must declare the universe used for cross-sectional comparison.

## Non-goals

- No real index constituent download in 003-A.
- No production universe eligibility transition.

## Production Eligibility

- `SEED_DEMO`: always `productionEligible=false`.
- `USER_WATCHLIST`: user-defined and not valid for factor validation by default.
- `KR_*` and `US_*`: remain false until official constituent data providers are connected and tested.

## KR/US Separation

KR and US securities must not share one percentile space. Mixed universes can exist for UI watchlists, but not for factor validation.

## Snapshot Requirement

Research normalization requires a `UniverseSnapshot` with:

- `universeId`
- `asOfDate`
- `assetIds`
- `dataVersionId`
- `generatedAt`

Observations outside the snapshot are invalid input.

# WO017-U4 Task Board

## 1. Fail-closed Security
- [x] Remove `internal_default_key` fallback in `src/app/api/market/quote/route.ts` & `ohlcv/route.ts`
- [x] Disable provider override if `INTERNAL_SMOKE_KEY` is not set or empty
- [x] Ensure smoke runner does not use fallback keys if env is missing
- [x] Create tests to verify env missing, wrong key, and correct key behaviors

## 2. Suitability Canonical Input & As-of consistency
- [x] Add `getSnapshotAsOf(market, asOf)` to `RegimeStore`
- [x] Update `StrategySuitabilityService` to accept `asOf` date and optional `universeId`
- [x] Query canonical original label/score from `getSignalHistory()` inside suitability service, defaulting to strict parsing if fallback is used (using strict `Number` validation, range checks, and preventing `parseFloat`)
- [x] Update `/api/strategy/suitability` route to accept `asOf` parameter, execute strict query parameter validation if needed, and map computed status to envelope

## 3. UI Momentum Hardcoding Removal
- [x] Add `signalId` and `universeId` to `StrategyAgreementSignal` type
- [x] Add `universeId` to `SignalStability` type
- [x] Update `calculateStrategyAgreementSignal` to output `signalId` and `universeId`
- [x] Update `StrategyAgreementSummaryCard.tsx` to call API endpoints using `signal.signalId` and `signal.universeId`, passing `asOf=${signal.date}`
- [x] Update `StrategyAgreementSummaryCard.test.tsx` to test with custom non-momentum signalId

## 4. Rank Sample Floor & Universe Isolation
- [x] Implement `getAssetsOfUniverse` and `universeMembershipRegistry` in `src/server/signals/signal-stability-service.ts`
- [x] Enforce minCommonAssets sample floor of 5, warning for 5~9, failing under 5
- [x] Update `calculateCrossSectionalRankCorrelation` to isolate ranks strictly within same `universeId`
- [x] Add unit test verifying that KOSPI_SAMPLE and watchlist/KOSDAQ do not mix

## 5. UI Test Realism & Envelope Limitation
- [x] Add realistic UI test case in `StrategyAgreementSummaryCard.test.tsx` where assetId is present but agreementScore is null, verifying that scores are not displayed even after async loads settle
- [x] Create limitation document `docs/SUITABILITY_ENVELOPE_LIMITATION.md` for manual_import/official source tier behavior

## 6. Verification & Final Closure Commands
- [x] npm run typecheck
- [x] npm run lint
- [x] npm run test
- [x] npm run build
- [x] run docs and wording checks
- [x] Run git closure commands (pwd -P, git rev-parse HEAD, git remote -v, git status, git diff) and report

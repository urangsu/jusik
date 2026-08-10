# K-Terminal Real Data Beta Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API 자격정보를 넣은 뒤 한국·미국 주식의 시세, 차트, 공시, 재무 데이터가 실제 화면과 진단 파이프라인까지 거짓 성공 없이 흐르는 Real Data Beta를 만든다.

**Architecture:** `DataEnvelope<T>`를 유일한 데이터 경계로 삼고, provider 응답을 런타임 스키마로 검증한 뒤 provider별 캐시와 PIT revision store에 저장한다. UI는 정적 seed 대신 asset 단위 query model을 구독하며, 필요한 계약이 하나라도 빠지면 `api_required`, `not_supported`, `not_found`, `insufficient_data`로 fail closed 한다. 첫 베타의 지원 공급자는 KR 시세 KIS, KR 공시·재무 OpenDART, US 시세 Finnhub, US 공시 SEC EDGAR로 제한하고 나머지 stub provider는 실제 구현 전까지 비활성화한다.

**Tech Stack:** Next.js 16.2.x App Router, React 19, TypeScript strict, Zod 4, TanStack Query 5, Vitest 4, file-backed beta stores with atomic writes

---

## Audit baseline (2026-07-28, HEAD `06076af`)

- `npm install`, `npm run typecheck`, `npm run test`, `npm run build` pass.
- Tests: 285 files, 935 tests pass, but UI tests print unhandled relative-URL fetch and React `act()` warnings.
- Lint exits 0 with 774 warnings.
- `npm audit` reports 6 high vulnerabilities; a non-major Next upgrade to 16.2.12 is available.
- Live Next server reports KIS `configured:false`; KR quote and OHLCV return `not_supported` because current `.env` values are placeholders.
- Home terminal quote/chart/financial/news widgets never call their data routes.
- Market Board falls back to hard-coded financial seed numbers marked `cached`.
- FMP and Alpha Vantage return `status:"cached"` with `value:null`.
- KIS account provider returns a fabricated balance marked `real_time`.
- Provider UI health check verifies only key presence for every provider except OpenDART.
- Provider settings save uses `Array.every(async ...)`, which always resolves truthy and can mark incomplete secrets configured.
- CLI readiness does not load `.env`, while Next does; CLI and app disagree.
- Generated market snapshots are from 2026-06-17 and the latest provider smoke is a no-key contract run, not live-data proof.
- OpenDART financial parsing, production PIT storage, external LLM, notification adapters, US market-board refresh, and decision-grade evidence/PIT predicates are incomplete.

## Release gates

The beta remains **NO-GO** until all of the following are true:

1. No production route can emit invented financial values or a data-available status with a null value.
2. KR quote/OHLCV and US quote/OHLCV each pass provider-isolated live smoke with `dataAvailable=true`.
3. OpenDART disclosures and financial statements pass live fixtures from the official API.
4. Selecting an asset updates quote, chart, filings, and financial UI from the same canonical asset ID.
5. Strategy output stays `insufficient_data` until PIT revision, typed facts, executable predicates, `dataQualityScore`, and `vetoReasons` are present.
6. `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, contract checks, live smoke, and browser QA pass without ignored console errors.

### Task 1: Remove fabricated success paths

**Files:**
- Modify: `src/domain/market-board/market-board-snapshot.ts`
- Modify: `src/server/snapshots/market-board-snapshot-loader.ts`
- Modify: `src/server/jobs/market-board/kis-snapshot-job.ts`
- Modify: `src/server/providers/kis/kis-account-provider.ts`
- Test: `src/server/snapshots/market-board-snapshot-loader.test.ts`
- Test: `src/server/providers/kis/kis-account-provider.test.ts`
- Create: `scripts/check-no-financial-seeds.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for fail-closed snapshots and broker account**

```ts
it("returns api_required rows with null metrics when no snapshot exists", async () => {
  vi.spyOn(fs, "readFile").mockRejectedValue(new Error("ENOENT"));
  const result = await loadMarketBoardSnapshot("KOSPI_SAMPLE");
  expect(result.tiles).not.toHaveLength(0);
  expect(result.tiles.every((row) => row.price === null)).toBe(true);
  expect(result.tiles.every((row) => row.dataStatus === "api_required")).toBe(true);
});

it("never fabricates a configured account balance", async () => {
  vi.spyOn(kisConfig, "isConfigured", "get").mockReturnValue(true);
  const result = await kisAccountProvider.getBalance();
  expect(result).toMatchObject({ value: null, status: "not_supported" });
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npm run test -- src/server/snapshots/market-board-snapshot-loader.test.ts src/server/providers/kis/kis-account-provider.test.ts`

Expected: FAIL because `getDefaultSnapshot()` currently emits numbers and the account provider emits a mock balance.

- [ ] **Step 3: Replace numeric defaults with an explicit empty-data snapshot**

```ts
export function getDefaultSnapshot(universeId: MarketUniverseId): MarketBoardSnapshot {
  const constituents = universeId === "KOSPI_SAMPLE"
    ? KOSPI_SAMPLE_CONSTITUENTS
    : universeId === "SP500_SAMPLE"
      ? SP500_SAMPLE_CONSTITUENTS
      : [];
  const generatedAt = new Date().toISOString();
  return buildUnavailableMarketBoardSnapshot({
    universeId,
    constituents,
    status: constituents.length > 0 ? "api_required" : "insufficient_data",
    generatedAt,
  });
}
```

All price, return, volume, turnover, market-cap, and ratio fields in `buildUnavailableMarketBoardSnapshot` must be `null`; do not use `0`.

- [ ] **Step 4: Make partial KIS refresh preserve nulls, not seed metrics**

In `kis-snapshot-job.ts`, initialize from the unavailable snapshot. Only copy fields directly derived from a successful quote/OHLCV envelope. A failed symbol must keep numeric fields null and carry the provider failure status and message in `missingData`.

- [ ] **Step 5: Disable the fake account endpoint until the real read-only parser exists**

```ts
public async getBalance(): Promise<DataEnvelope<KisAccountBalance>> {
  return {
    value: null,
    status: kisConfig.isConfigured ? "not_supported" : "api_required",
    source: "KIS Open API (Account)",
    sourceTier: "official",
    warnings: [],
    updatedAt: null,
    message: kisConfig.isConfigured
      ? "Read-only account balance parsing is not implemented."
      : "KIS credentials are required.",
  };
}
```

- [ ] **Step 6: Add a repository guard against financial seed literals**

`scripts/check-no-financial-seeds.mjs` must scan non-test production files and fail on `mockBalance`, `KR_SEED_NUMBERS`, `US_SEED_NUMBERS`, or a `real_time|delayed|eod|cached|stale` envelope paired with literal `value: null`. Add `"check:data-truth": "node scripts/check-no-financial-seeds.mjs"` to `package.json`.

- [ ] **Step 7: Verify and commit**

Run: `npm run check:data-truth && npm run test -- src/server/snapshots/market-board-snapshot-loader.test.ts src/server/providers/kis/kis-account-provider.test.ts`

Expected: PASS, with no numeric fallback.

Commit: `git commit -am "fix: remove fabricated financial fallback data"`

### Task 2: Make provider configuration deterministic and secure

**Files:**
- Modify: `src/server/settings/provider-settings-store.ts`
- Modify: `src/server/settings/provider-health-checker.ts`
- Modify: `src/server/ops/provider-readiness-resolver.ts`
- Modify: `scripts/ops/run-provider-readiness.ts`
- Modify: `src/domain/settings/provider-setting-definition.ts`
- Test: `src/server/settings/provider-settings-store.test.ts`
- Test: `src/server/settings/provider-health-checker.test.ts`
- Test: `src/server/ops/provider-readiness-resolver.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add failing tests for incomplete secrets, enable flags, and CLI parity**

```ts
it("does not mark a provider configured when one required secret is missing", async () => {
  await updateProviderSettings("kis", { KIS_APP_KEY: "valid-app-key", KIS_ENABLED: true });
  const snapshot = await getProviderSettings("kis");
  expect(snapshot.status).toBe("not_configured");
});

it("does not report healthy from key presence alone", async () => {
  mockProviderProbe.mockResolvedValue({ value: null, status: "error", source: "KIS", sourceTier: "official", warnings: [], updatedAt: null });
  const snapshot = await checkProviderHealth("kis");
  expect(snapshot.status).toBe("error");
});
```

- [ ] **Step 2: Replace async `every` with awaited secret resolution**

```ts
const requiredSecretChecks = await Promise.all(
  def.fields
    .filter((field) => field.required && field.secret)
    .map(async (field) => Boolean(process.env[field.key] || await getProviderSecret({ providerId, key: field.key }))),
);
record.status = requiredSecretChecks.every(Boolean) ? "configured" : "not_configured";
```

- [ ] **Step 3: Use one readiness resolver for UI, CLI, registry, and health**

Provider readiness must require both credentials and an explicit enabled flag. Remove provider-specific string construction where `fmp_free` and `alpha_vantage_free` can drift from setting IDs. Add a typed mapping:

```ts
export const RUNTIME_PROVIDER_SETTINGS = {
  kis: { settingsId: "kis", enabledKey: "KIS_ENABLED", requiredKeys: ["KIS_APP_KEY", "KIS_APP_SECRET"] },
  opendart: { settingsId: "opendart", enabledKey: "OPENDART_ENABLED", requiredKeys: ["OPENDART_API_KEY"] },
  finnhub_free: { settingsId: "finnhub", enabledKey: "FINNHUB_ENABLED", requiredKeys: ["FINNHUB_API_KEY"] },
} as const;
```

- [ ] **Step 4: Load `.env` in CLI entrypoints before importing runtime modules**

Use Node's supported env-file startup rather than importing application modules before configuration. Change scripts to invoke `tsx --env-file=.env` when the local file exists, and document the environment-variable-only production path. Do not print secret values.

- [ ] **Step 5: Replace presence-only health checks with provider-isolated probes**

Each health check must call the requested provider directly with the internal smoke key, validate `DataEnvelope`, and return healthy only when `dataAvailable=true`. A key that exists but fails authentication must become `invalid_key`; rate limits and plan restrictions remain distinct.

- [ ] **Step 6: Resolve KIS naming drift**

Keep only `KIS_BASE_URL` and `KIS_IS_PAPER` in code, `.env.example`, docs, and tests. Remove `KIS_REST_URL` and `KIS_APP_TYPE`. Keep `KIS_TRADING_ENABLED=false` and `KIS_ORDER_ROUTE_ENABLED=false` hard-failed in this work order.

- [ ] **Step 7: Verify and commit**

Run: `npm run test -- src/server/settings src/server/ops/provider-readiness-resolver.test.ts && npm run ops:provider-readiness`

Expected: CLI and `/api/ops/provider-readiness` return the same provider states without exposing values.

Commit: `git commit -am "fix: unify provider readiness and health checks"`

### Task 3: Enforce DataEnvelope at every financial boundary

**Files:**
- Modify: `src/server/services/market-data-service.ts`
- Modify: `src/server/ops/data-envelope-contract-validator.ts`
- Modify: `src/app/api/markets/snapshot/route.ts`
- Modify: `src/app/api/broker/kis/health/route.ts`
- Modify: `src/app/api/providers/health/route.ts`
- Create: `src/server/security/data-envelope-response.ts`
- Create: `scripts/check-data-envelope-routes.mjs`
- Test: `src/server/services/market-data-service.test.ts`
- Test: `src/app/api/markets/snapshot/route.test.ts`

- [ ] **Step 1: Test that null-success and rate-limited responses do not end fallback**

```ts
it("falls through when a provider does not return usable data", async () => {
  fmp.getQuote.mockResolvedValue(envelope(null, "cached"));
  finnhub.getQuote.mockResolvedValue(envelope(validQuote, "delayed"));
  const result = await service.getQuote("AAPL", "US");
  expect(result.source).toBe("Finnhub Free");
});
```

- [ ] **Step 2: Centralize usable-data semantics**

```ts
export function hasUsableData<T>(envelope: DataEnvelope<T>): envelope is DataEnvelope<T> & { value: T } {
  return ["real_time", "delayed", "eod", "cached", "stale"].includes(envelope.status)
    && envelope.value !== null
    && envelope.updatedAt !== null;
}
```

The priority service returns only `hasUsableData(result)`. Preserve the most informative terminal failure using priority `plan_restricted > rate_limited > not_found > api_required > not_supported > error` rather than collapsing everything to `api_required`.

- [ ] **Step 3: Wrap snapshot and health routes in DataEnvelope**

```ts
return createSafeResponse<MarketBoardSnapshot>({
  value: snapshot,
  status: snapshot.tiles.some((tile) => tile.dataStatus === "real_time") ? "real_time" : "cached",
  source: "market-board-snapshot-store",
  sourceTier: "official",
  warnings: [],
  updatedAt: snapshot.generatedAt,
});
```

If every tile is unavailable, the route status must be `api_required` or `insufficient_data` and `value` must be null; provide universe metadata in a non-financial error detail type if needed.

- [ ] **Step 4: Add a route-shape checker**

`scripts/check-data-envelope-routes.mjs` scans financial route files and fails on direct `NextResponse.json`, bare `{ error }`, or `createSafeResponse` arguments that do not contain the six mandatory envelope fields.

- [ ] **Step 5: Verify and commit**

Run: `npm run test -- src/server/services/market-data-service.test.ts src/app/api/market src/app/api/markets && node scripts/check-data-envelope-routes.mjs`

Expected: PASS; no route claims cached/real-time data with null value.

Commit: `git commit -am "fix: enforce data envelope truth at runtime boundaries"`

### Task 4: Finish the supported provider adapters

**Files:**
- Modify: `src/server/providers/kis/kis-domestic-stock-provider.ts`
- Modify: `src/server/providers/finnhub-free-provider.ts`
- Modify: `src/server/providers/fmp-free-provider.ts`
- Modify: `src/server/providers/alpha-vantage-provider.ts`
- Create: `src/server/providers/schemas/kis-market.schema.ts`
- Create: `src/server/providers/schemas/finnhub-market.schema.ts`
- Modify: `src/server/providers/provider-registry.ts`
- Test: provider tests beside each implementation

- [ ] **Step 1: Add malformed, zero, null, auth, limit, and plan-restriction fixtures**

For every supported operation, tests must cover: valid payload, empty payload, malformed numeric string, HTTP 401/403, HTTP 429, provider-level error code, and unavailable field. Do not coerce absent volume or change into zero.

- [ ] **Step 2: Parse KIS with Zod and market-time-aware statuses**

KIS quote parsing must reject `NaN`, preserve nullable fields, map provider timestamps instead of `new Date()` as the trade time, and use `real_time` only when the response is a current-session quote. Historical OHLCV must be `eod`, not `real_time`.

- [ ] **Step 3: Normalize OHLCV to `OhlcvSeries`**

```ts
const series: OhlcvSeries = {
  assetId: canonicalAssetId,
  market: region,
  range: params.range,
  interval: params.interval,
  candles: parsedCandles,
  source: descriptor.displayName,
  dataVersionId,
  updatedAt: providerTimestamp,
};
```

- [ ] **Step 4: Finish Finnhub quote/OHLCV without synthetic zeros**

Set quote `volume:null` because the quote endpoint does not supply volume. Validate arrays have equal lengths before zipping candles. Return `plan_restricted` for unavailable candle plans, `not_found` for explicit no-data, and `error` for malformed payloads.

- [ ] **Step 5: Disable incomplete FMP and Alpha Vantage adapters**

Until real HTTP parsing is implemented, return `not_supported` and set `enabledByDefault:false`. Remove capabilities that are not implemented so source priority never selects a stub.

- [ ] **Step 6: Verify and commit**

Run: `npm run test -- src/server/providers src/server/services/market-data-service.test.ts`

Expected: all provider contract tests pass; null-success fixtures fail validation.

Commit: `git commit -am "feat: complete supported read-only market providers"`

### Task 5: Implement official filing and financial normalization

**Files:**
- Modify: `src/app/api/opendart/financials/route.ts`
- Modify: `src/server/providers/opendart-provider.ts`
- Create: `src/server/opendart/financial-statement-client.ts`
- Create: `src/server/opendart/financial-statement-normalizer.ts`
- Create: `src/server/financials/financial-data-service.ts`
- Create: `src/app/api/financials/statements/route.ts`
- Create: `src/app/api/financials/ratios/route.ts`
- Modify: `src/server/providers/sec-edgar-provider.ts`
- Test: corresponding `.test.ts` files

- [ ] **Step 1: Write OpenDART response fixtures for CFS/OFS, annual/quarter, amended and missing accounts**

Tests must prove that missing accounts remain null, duplicate concepts are resolved by report/basis priority, units remain KRW, and the filing receipt number and retrieval timestamp are retained.

- [ ] **Step 2: Implement official OpenDART `fnlttSinglAcntAll` parsing**

Map only an explicit concept registry. Do not infer or calculate a missing statement item. Emit `not_found` for status `013`, `rate_limited` for quota codes, and `error` for malformed account values.

- [ ] **Step 3: Separate statements from derived ratios**

Ratios may only be calculated when every operand is non-null, basis and fiscal period match, and a compatible quote revision exists. Otherwise each ratio remains null and the route returns `insufficient_data` when no useful ratio can be produced.

- [ ] **Step 4: Keep SEC EDGAR honest**

Add the required identifying User-Agent and rate limiter. If XBRL company facts are not normalized in this milestone, US financials remain `not_supported`; do not substitute FMP estimates silently.

- [ ] **Step 5: Verify and commit**

Run: `npm run test -- src/server/opendart src/server/financials src/app/api/opendart src/app/api/financials`

Expected: fixtures pass; no missing account becomes zero.

Commit: `git commit -am "feat: add official financial statement normalization"`

### Task 6: Connect the primary UI to canonical live queries

**Files:**
- Create: `src/client/market-data/use-asset-market-data.ts`
- Create: `src/client/financials/use-asset-financials.ts`
- Create: `src/client/filings/use-asset-filings.ts`
- Create: `src/components/asset/AssetOverview.tsx`
- Create: `src/components/asset/AssetChart.tsx`
- Create: `src/components/asset/AssetFinancialSnapshot.tsx`
- Create: `src/components/asset/AssetFilings.tsx`
- Modify: `src/components/shell/TerminalShell.tsx`
- Modify: `src/components/shell/MarketStrip.tsx`
- Modify: `src/components/shell/LeftRail.tsx`
- Modify: `src/components/search/AssetSearchBox.tsx`
- Test: component and hook tests beside each file

- [ ] **Step 1: Test selection, cancellation, stale response rejection, and unavailable states**

Use deferred fetch promises to prove that selecting AAPL after Samsung cannot render the late Samsung response. Assert no numeric skeleton is shown while loading and each DataStatus has an explicit Korean/English state.

- [ ] **Step 2: Build one asset query model**

```ts
export function useAssetMarketData(asset: Asset | null) {
  return {
    quote: useQuery({
      queryKey: marketDataQueryKeys.quote(asset?.id ?? "none"),
      queryFn: ({ signal }) => fetchEnvelope(`/api/market/quote?symbol=${asset!.symbol}&region=${asset!.region}&assetId=${encodeURIComponent(asset!.id)}`, signal),
      enabled: Boolean(asset),
    }),
    ohlcv: useQuery({
      queryKey: marketDataQueryKeys.ohlcv(asset?.id ?? "none", "1Y", "1D"),
      queryFn: ({ signal }) => fetchEnvelope(`/api/market/ohlcv?symbol=${asset!.symbol}&region=${asset!.region}&assetId=${encodeURIComponent(asset!.id)}&range=1Y&interval=1D`, signal),
      enabled: Boolean(asset),
    }),
  };
}
```

- [ ] **Step 3: Replace permanent `api_required` cells in `TerminalShell`**

Render quote and change from the quote envelope, the chart only from normalized OHLCV, filings only from the filing envelope, and ratios only from the financial envelope. Source, delay, updated time, and warnings must be visible beside every panel.

- [ ] **Step 4: Replace seed-only search and watchlist**

Search `/api/symbols/search` with debounce and AbortSignal. Left rail loads `/api/watchlist`; seed assets may exist only in test fixtures and onboarding documentation, never in production component constants.

- [ ] **Step 5: Make Market Board consume the new envelope route**

Remove fallback to `getDefaultSnapshot()` on fetch error. Retain the previous valid snapshot only if its TTL permits; otherwise show the envelope's unavailable state.

- [ ] **Step 6: Verify and commit**

Run: `npm run test -- src/client src/components/asset src/components/shell src/components/search src/components/market-board`

Expected: tests pass with no console errors or `act()` warnings.

Commit: `git commit -am "feat: wire terminal UI to canonical live data"`

### Task 7: Add durable PIT revisions and strategy fail-closed gates

**Files:**
- Create: `src/domain/data/versioned-data-envelope.ts`
- Create: `src/server/data/file-pit-store.ts`
- Create: `src/server/data/pit-revision-selector.ts`
- Modify: `src/server/market-data/market-data-backfill-store.ts`
- Modify: `src/server/research/research-workspace-service.ts`
- Modify: `src/domain/research/research-evidence-record.ts`
- Modify: `src/domain/research/evaluate-method-rule.ts`
- Modify: `src/server/strategy/strategy-suitability-service.ts`
- Test: PIT, research, and strategy tests beside implementations

- [ ] **Step 1: Write tests for as-of selection and look-ahead rejection**

Store two revisions with `observedAt`, `effectiveAt`, and `ingestedAt`; querying an earlier as-of time must never return the later revision. A strategy request without an as-of revision must return `insufficient_data`.

- [ ] **Step 2: Persist immutable versioned envelopes**

Every record must include canonical asset ID, provider ID, capability, source timestamp, ingestion timestamp, content hash, schema version, and superseded revision ID. Writes are temp-file + fsync + atomic rename and idempotent by content hash.

- [ ] **Step 3: Link claims to verified typed facts**

Research claims must reference evidence IDs and typed fact IDs. Verification events are append-only. Free-form summaries cannot be parsed with regex and promoted to typed facts.

- [ ] **Step 4: Inject executable deterministic predicates**

Method rules receive predicate functions over typed facts and return the evaluated inputs, result, and veto reason. Without a predicate result, UI may show only `데이터 부족`; it must not emit `confirming`, `deteriorating`, `veto`, `STABLE`, or `VERIFIED`.

- [ ] **Step 5: Gate every strategy score**

Before calculating agreement, require PIT quote/OHLCV revisions, minimum history, compatible universe revision, `dataQualityScore`, and non-empty `vetoReasons` when any requirement is absent. Keep orders and paper trading out of scope.

- [ ] **Step 6: Verify and commit**

Run: `npm run test -- src/server/data src/server/research src/domain/research src/server/strategy src/domain/strategy`

Expected: look-ahead and missing-predicate tests fail closed.

Commit: `git commit -am "feat: add decision-grade PIT and predicate gates"`

### Task 8: Harden dependencies, tests, and operational acceptance

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vitest.setup.ts`
- Modify: `.github/workflows/ci.yml` if present, otherwise create it
- Create: `scripts/ops/run-beta-acceptance.ts`
- Create: `docs/REAL_DATA_BETA_RUNBOOK.md`
- Modify: `docs/IMPLEMENTATION_INVENTORY.md`

- [ ] **Step 1: Upgrade Next and patched transitive dependencies**

Read the matching `node_modules/next/dist/docs/` migration/deprecation guides before editing. Upgrade Next to at least 16.2.12 and apply non-breaking audit fixes. Do not use `npm audit fix --force`.

- [ ] **Step 2: Make warnings actionable**

Set lint to fail on new warnings after establishing a checked-in baseline. Remove unused imports in quote/OHLCV routes and replace `any` first on provider, envelope, PIT, and strategy paths.

- [ ] **Step 3: Fail tests on console errors and unhandled fetches**

In `vitest.setup.ts`, mock only explicitly declared route calls. Throw on unexpected `console.error`, unhandled rejection, invalid relative fetch, and React `act()` warning. Repair existing tests rather than suppressing messages.

- [ ] **Step 4: Build a single acceptance runner**

`run-beta-acceptance.ts` must:

1. verify configuration without printing secrets;
2. start or target a production Next server;
3. run provider-isolated KR/US quote and OHLCV smoke;
4. run OpenDART disclosure and financial smoke;
5. backfill `KR:005930` and `US:AAPL`;
6. verify PIT revisions and downstream technical-factor envelopes;
7. exit non-zero unless every required target has `dataAvailable=true`.

- [ ] **Step 5: Run browser QA**

Verify Korean/English and light/dark modes for Samsung and AAPL. Test key removal, invalid key, rate limit, provider outage, stale cache, rapid symbol switching, empty filings, and mobile width. Capture screenshots and network responses; confirm no made-up values or stale cross-asset flashes.

- [ ] **Step 6: Run final gates**

Run:

```bash
npm install
npm run check:data-truth
node scripts/check-data-envelope-routes.mjs
npm run typecheck
npm run lint
npm run test
npm run build
npm audit
npm run ops:provider-readiness
npx tsx scripts/ops/run-beta-acceptance.ts --base-url=http://localhost:3000
```

Expected: all commands exit 0; audit has no high/critical issue; required live targets show `dataAvailable=true`.

- [ ] **Step 7: Update truth documents and commit**

`IMPLEMENTATION_INVENTORY.md` must distinguish `contract implemented`, `fixture verified`, `build verified`, `live provider verified`, and `browser verified`. Never use a bare “Runtime Verified ✓”.

Commit: `git commit -am "chore: enforce real data beta acceptance gates"`

## Recommended commit sequence

1. `fix: remove fabricated financial fallback data`
2. `fix: unify provider readiness and health checks`
3. `fix: enforce data envelope truth at runtime boundaries`
4. `feat: complete supported read-only market providers`
5. `feat: add official financial statement normalization`
6. `feat: wire terminal UI to canonical live data`
7. `feat: add decision-grade PIT and predicate gates`
8. `chore: enforce real data beta acceptance gates`

## Explicitly out of scope

- Broker order placement, live trading, and paper trading
- Buy/sell instructions or guaranteed-return wording
- Telegram, Kakao, or email delivery completion
- External LLM activation before evidence/PIT gates pass
- Full-market universe coverage before sample-universe acceptance is green


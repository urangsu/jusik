# Real Data Beta Acceptance Integrity & Security Follow-up — Implementation Plan

> **Branch:** `codex/evidence-first-research-methodology`  
> **Reviewed HEAD:** `8dd7d36`  
> **Release state:** **NO-GO** until every gate in Task 7 has real evidence  
> **Scope:** Acceptance truth, canonical provider contracts, smoke transport security, health-check regressions, and evidence integrity. Live/paper trading remain out of scope.

## Why this follow-up exists

The branch passes typecheck, build, and 1,036 tests, but the Beta gate is not decision-grade:

- all required targets can false-pass when raw status/source/tier/age contradict target policy;
- required KIS OHLCV cannot pass because the smoke schema differs from the production value;
- freshness measures fetch time rather than the upstream observation;
- the internal smoke key follows cross-origin redirects;
- runner tests do not execute the runner;
- provider health readiness regressed for `telegram`, `email`, and `llm`;
- live providers and browser UI remain unverified.

## Resolved design decisions

1. One immutable target-policy registry is the source of truth. Runner and evaluator consume it; the evaluator independently verifies raw fields.
2. Production domain values are canonical. Normalize KIS to the existing `OhlcvSeries`; do not create a smoke-only shape.
3. Freshness means `dataAsOf`, not fetch time. `checkedAt` is probe time.
4. `passed === true` requires non-null data, schema, identity, exact provenance, allowed status, and freshness.
5. Internal-key requests never follow redirects.
6. Provider settings, secrets, health probes, and ops smoke share one admin guard.
7. Financial nulls stay null. Metadata-only financial results cannot pass.

## Task 1 — Make acceptance independently fail closed

**Files**

- Add: `src/server/ops/provider-smoke-target-policy.ts`
- Add: `src/server/ops/provider-smoke-target-policy.test.ts`
- Modify: `src/server/ops/beta-acceptance.ts`
- Modify: `src/server/ops/beta-acceptance.test.ts`
- Modify: `src/server/ops/provider-real-data-smoke-runner.ts`

Create one registry keyed by `${providerId}/${capability}/${symbol}`:

```ts
export type SmokeTargetPolicy = {
  providerId: ProviderReadinessId;
  capability: SmokeCapability;
  symbol: string;
  endpoint: string;
  expectedSource: string;
  expectedSourceTier: SourceTier;
  allowedStatuses: readonly DataStatus[];
  maxDataAgeMs: number;
  requiredForBeta: boolean;
};
```

Delete duplicated target constants. `evaluateBetaAcceptance` must recompute:

```ts
policy.allowedStatuses.includes(result.envelopeStatus)
result.source === policy.expectedSource
result.sourceTier === policy.expectedSourceTier
result.dataAsOf !== null
result.ageMs !== null && result.ageMs >= 0 && result.ageMs <= policy.maxDataAgeMs
result.passed === true
result.dataAvailable === true
result.schemaValid === true
result.identityValid === true
result.provenanceValid === true
result.freshnessValid === true
```

Remove `empty_allowed` from successful DataEnvelope statuses. Optional empty data is an operational outcome, never Beta PASS.

**Tests**

- Keep derived booleans true while changing raw status to `cached`, `stale`, or `empty_allowed`; all fail.
- Forged source, wrong tier, missing/invalid/future/over-age `dataAsOf`, and missing required target fail.
- Reproduce the current all-five-cached false PASS and require exit code 1.
- Prove runner/evaluator cannot define duplicate policy.

**Gate**

```bash
npx vitest run src/server/ops/provider-smoke-target-policy.test.ts src/server/ops/beta-acceptance.test.ts
npm run typecheck
```

Commit: `fix(ops): make beta acceptance independently fail closed`

## Task 2 — Use canonical live payloads and bind them to the target

**Files**

- Modify: `src/server/providers/kis/kis-domestic-stock-provider.ts`
- Modify: `src/server/providers/kis/kis-domestic-stock-provider.test.ts`
- Modify: `src/server/ops/provider-smoke-contracts.ts`
- Modify: `src/server/ops/provider-smoke-contracts.test.ts`
- Modify: `src/server/ops/provider-real-data-smoke-runner.ts`
- Modify: `src/app/api/market/ohlcv/route.test.ts`
- Modify: `src/app/api/market/quote/route.test.ts`

Return canonical `OhlcvSeries` from KIS instead of a bare array. Map upstream dates at the provider boundary. Validate smoke values with target context:

```ts
validateSmokeValue({
  capability,
  value,
  expectedSymbol: policy.symbol,
  expectedSource: policy.expectedSource,
});
```

Quote/OHLCV validation must require requested identity, region consistency, inner source equal to envelope/policy source, finite values, `high >= low`, non-negative values, valid ordered timestamps, and no null-to-zero coercion.

OpenDART financials require requested identity and at least one finite non-null Beta operand: revenue, operating income, net income, assets, liabilities, or equity. Metadata-only results return `insufficient_data`.

**Tests**

- Validate an actual KIS provider fixture, not an invented wrapper.
- Reject old bare-array mismatch, wrong symbol/asset/source, unordered candles, and metadata-only financials.
- Confirm null operands stay null.
- Route tests prove provider pinning reaches the selected provider and preserves `DataEnvelope`.

**Gate**

```bash
npx vitest run src/server/providers/kis/kis-domestic-stock-provider.test.ts src/server/ops/provider-smoke-contracts.test.ts src/app/api/market/quote/route.test.ts src/app/api/market/ohlcv/route.test.ts
npm run typecheck
```

Commit: `fix(providers): align smoke validation with canonical live contracts`

## Task 3 — Separate observation time from probe time

**Files**

- Add: `src/server/ops/provider-data-as-of.ts`
- Add: `src/server/ops/provider-data-as-of.test.ts`
- Modify: `src/server/ops/provider-real-data-smoke-runner.ts`
- Modify: `src/server/ops/provider-real-data-smoke-runner.test.ts`
- Modify: `src/server/providers/kis/kis-domestic-stock-provider.ts`
- Modify: `src/server/providers/finnhub-free-provider.ts`
- Modify: `src/server/providers/opendart-provider.ts`
- Modify: `src/server/ops/provider-smoke-contracts.ts`

Add:

```ts
checkedAt: string;      // probe completion
updatedAt: string|null; // envelope normalization/cache metadata
dataAsOf: string|null;  // newest upstream observation
ageMs: number|null;     // checkedAt - dataAsOf
```

Fixed extraction rules:

- KIS quote: upstream trade date/time;
- Finnhub quote: upstream `t` epoch;
- OHLCV: newest candle timestamp;
- OpenDART filings: newest receipt date;
- OpenDART financials: report/receipt date associated with the statement.

Use an injected clock. Closed-market policy may widen an explicit window but may never replace `dataAsOf` with `checkedAt`.

**Tests**

- Fresh fetch with old trade/candle fails.
- Finnhub uses `t`, not `new Date()`.
- Weekend/holiday fixtures follow the declared market-session policy.
- Future/invalid timestamps fail closed.
- JSON and CLI keep `checkedAt`, `updatedAt`, and `dataAsOf` distinct.

**Gate**

```bash
npx vitest run src/server/ops/provider-data-as-of.test.ts src/server/ops/provider-real-data-smoke-runner.test.ts
npm run typecheck
```

Commit: `fix(ops): validate freshness from upstream observation time`

## Task 4 — Secure smoke transport and result semantics

**Files**

- Modify: `src/server/ops/provider-real-data-smoke-runner.ts`
- Rewrite: `src/server/ops/provider-real-data-smoke-runner.test.ts`
- Modify: `scripts/ops/run-beta-acceptance.ts`
- Modify: `src/app/api/ops/provider-readiness/smoke/route.ts`
- Modify: `src/app/api/ops/provider-readiness/smoke/route.test.ts`
- Modify: `src/server/security/redact-sensitive.ts`
- Modify: `src/server/security/redact-sensitive.test.ts`

Parse `baseUrl` once and return a structured failure for malformed/disallowed origins. The API derives origin server-side and never accepts client-selected base URLs.

Every internal-key fetch uses:

```ts
fetch(url, {
  headers: { "x-internal-smoke-key": smokeKey },
  redirect: "manual",
  signal: AbortSignal.timeout(timeoutMs),
});
```

Reject every 3xx before parsing. Require `INTERNAL_SMOKE_KEY` to be at least 32 random bytes and compare inbound keys using `crypto.timingSafeEqual` after equal-length checks.

Compute `passed` once at the end. It cannot be true when any required validation is false. `failureCount` counts every attempted non-pass result, and CLI totals must agree with final violations.

Rewrite runner tests to invoke `runProviderRealDataSmoke` with injected readiness, fetch, clock, and env dependencies. Delete DTO self-assertions.

**Tests**

- A redirect receiver never obtains the key for 301/302/307/308.
- Malformed/external URL, missing/short key, timeout, null data, and raw error body fail safely.
- Provider query/header appear only on permitted direct requests.
- `failureCount` and CLI output are consistent.

**Gate**

```bash
npx vitest run src/server/ops/provider-real-data-smoke-runner.test.ts src/app/api/ops/provider-readiness/smoke/route.test.ts src/server/security/redact-sensitive.test.ts
npm run typecheck
```

Commit: `fix(security): prevent internal smoke credential leakage`

## Task 5 — Restore exhaustive provider health behavior

**Files**

- Modify: `src/server/settings/provider-health-checker.ts`
- Modify: `src/server/settings/provider-health-checker-diagnostics.test.ts`
- Modify: `src/server/settings/provider-health-diagnostics.ts`
- Modify: `src/server/settings/provider-health-diagnostics.test.ts`
- Modify: `src/app/api/settings/providers/[providerId]/health-check/route.test.ts`

Derive required fields from `PROVIDER_SETTING_DEFINITIONS`; do not use a partial switch. Restore:

- Telegram: `TELEGRAM_BOT_TOKEN`;
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`;
- LLM: `OPENAI_API_KEY`.

Unknown/unsupported definitions fail closed. Token/probe HTTP 429 maps to `rate_limited`. Route catches expose only safe provider-specific messages.

Tests block both `fs` and `fs/promises`, block network, and isolate env/store paths. Add OpenDART/Finnhub orchestration tests for success, null, 429, safe error, and exact persisted snapshot.

**Gate**

```bash
npx vitest run src/server/settings/provider-health-diagnostics.test.ts src/server/settings/provider-health-checker-diagnostics.test.ts 'src/app/api/settings/providers/[providerId]/health-check/route.test.ts'
npm run typecheck
```

Commit: `fix(settings): restore exhaustive fail-closed provider health`

## Task 6 — Authenticate provider administration routes

**Files**

- Add: `src/server/security/provider-admin-guard.ts`
- Add: `src/server/security/provider-admin-guard.test.ts`
- Modify: `src/app/api/settings/providers/route.ts`
- Modify: `src/app/api/settings/providers/[providerId]/route.ts`
- Modify: `src/app/api/settings/providers/[providerId]/secret/[key]/route.ts`
- Modify: `src/app/api/settings/providers/[providerId]/health-check/route.ts`
- Modify: `src/app/api/ops/provider-readiness/smoke/route.ts`
- Modify corresponding route tests.

One `requireProviderAdmin(request)` guard must:

- fail when `PROVIDER_ADMIN_TOKEN` is missing/short;
- require `x-provider-admin-token` and constant-time comparison;
- require exact configured same-origin `Origin` on browser mutations;
- return generic 401/403 bodies;
- apply a shared limiter by principal and route class;
- never log tokens, secret values, or upstream bodies.

Production readiness must fail when only a process-local limiter is configured. Local development may use an in-memory adapter behind the same interface.

**Tests**

- Missing, short, wrong-length, and wrong token fail.
- Correct token succeeds without exposure.
- Foreign/missing Origin fails browser mutations.
- Anonymous callers cannot consume health/smoke provider quota.
- Limiting is deterministic and responses are sanitized.

**Gate**

```bash
npx vitest run src/server/security/provider-admin-guard.test.ts src/app/api/settings/providers src/app/api/ops/provider-readiness/smoke/route.test.ts
npm run typecheck
```

Commit: `fix(security): protect provider administration and probes`

## Task 7 — Produce honest release evidence

**Files**

- Modify: `docs/superpowers/plans/2026-08-01-provider-diagnostics-beta-acceptance-hardening.md`
- Modify: `docs/superpowers/plans/2026-08-01-real-data-beta-corrective-work-orders.md`
- Add: `docs/REAL_DATA_BETA_EVIDENCE.md`

Record SHA-256 before and after verification for:

```text
data/settings/provider-settings.json
data/secrets/provider-secrets.json
```

Run exactly:

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
npm run acceptance:beta -- --base-url=http://localhost:3000
```

Any store mutation, unexpected artifact, lint error, failing test/build, required skip, cached/stale result, wrong identity, missing `dataAsOf`, or exit 1 blocks release.

With server and credentials configured, capture sanitized evidence for:

1. KIS quote `005930`;
2. KIS OHLCV `005930`;
3. OpenDART filings `005930`;
4. OpenDART financials `005930` with non-null operands;
5. Finnhub quote `AAPL`.

Each row includes target, status, source/tier, payload identity, `checkedAt`, `dataAsOf`, age, validations, and sanitized reason—never credentials, account numbers, or raw upstream bodies.

Manual browser evidence must prove unauthorized rejection, authorized save/health check, no healthy display for null/cached/stale/wrong-source data, masked-secret persistence after relaunch, and recoverable timeout/rate-limit/offline states.

Only check prior plan boxes when direct evidence exists:

- **GO:** all live targets plus browser/security gates pass;
- **BLOCKED:** credentials or runnable live environment unavailable;
- **NO-GO:** any invariant, security, freshness, identity, or evidence failure.

Commit: `docs(ops): record real data beta acceptance evidence`

## Definition of done

- No required target can false-pass from cached/stale/forged/old/null data.
- KIS OHLCV uses one production contract and can pass a valid live response.
- Freshness derives from upstream observation time.
- Internal keys cannot cross redirects or appear in output.
- Administration/probe routes are authenticated and limited.
- Runner tests execute real runner behavior.
- Full verification passes with stable settings/secrets hashes.
- Five live targets and browser behavior have sanitized evidence.
- Until the final two conditions hold, Real Data Beta remains **NO-GO/BLOCKED**.


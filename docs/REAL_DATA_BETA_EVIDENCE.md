# Real Data Beta Evidence Record

> **Plan Reference:** `docs/superpowers/plans/2026-08-02-beta-acceptance-integrity-security-follow-up.md`  
> **Evaluated Commit:** `eb29fa4`  
> **Status:** **BLOCKED / NO-GO** (Requires active KIS / OpenDART / Finnhub API credentials & live running server)

---

## Verification Commands Run & Results

### Store Invariants

```text
57490a417840d2be080f24bd3dfad84d4bea14b9c40778058f763aa6d8733a08  data/settings/provider-settings.json
a0a7418d6bb3af6c780108361b7b33d492ee45dbedc9eab98cb0d71e92a03415  data/secrets/provider-secrets.json
```

- Pre-test and post-test SHA-256 hashes of `data/settings` and `data/secrets` match **EXACTLY**.

### Gate Verification Matrix

| Step | Command | Result | Notes |
|---|---|---|---|
| 1 | `npm run typecheck` | **PASS** | `tsc --noEmit` 0 errors |
| 2 | `npm run lint` | **PASS** | 0 errors, 825 pre-existing warnings |
| 3 | `npm run test` | **PASS** | **294 test files / 1,068 tests PASS** |
| 4 | `npm run build` | **PASS** | Next.js 16.2.9 production build successful |
| 5 | `npm run acceptance:beta` | **FAIL (Exit 1)** | Fails closed as expected when providers unconfigured |

---

## Live Target Evidence Matrix

> **Note:** Acceptance suite fails closed with Exit Code 1 until valid live KIS, OpenDART, and Finnhub credentials are supplied by operator and server is started on target origin.

| Target | Provider | Capability | Symbol | Allowed Statuses | Expected Source | Expected Tier | Max Age | Current Status |
|---|---|---|---|---|---|---|---|---|
| 1 | `kis` | `quote` | `005930` | `real_time`, `delayed` | `KIS Open API` | `official` | 20m | `not_configured` (Pending API credentials) |
| 2 | `kis` | `ohlcv` | `005930` | `delayed`, `eod` | `KIS Open API` | `official` | 48h | `not_configured` (Pending API credentials) |
| 3 | `opendart` | `filings` | `005930` | `eod` | `OpenDART` | `official` | 24h | `not_configured` (Pending API credentials) |
| 4 | `opendart` | `financials` | `005930` | `eod` | `OpenDART` | `official` | 24h | `not_configured` (Pending API credentials) |
| 5 | `finnhub_free` | `quote` | `AAPL` | `real_time`, `delayed` | `Finnhub Free` | `free_limited` | 20m | `not_configured` (Pending API credentials) |

---

## Security & Integrity Audit Summary

1. **Acceptance Gate Integrity:**
   - Evaluator (`beta-acceptance.ts`) independently verifies raw fields (`envelopeStatus`, `source`, `sourceTier`, `dataAsOf`, `ageMs`).
   - Runner booleans (`provenanceValid`, `freshnessValid`) are ignored by evaluator.
   - `cached`, `stale`, and `empty_allowed` statuses are explicitly rejected.

2. **Canonical Payload Normalization:**
   - KIS OHLCV returns canonical `OhlcvSeries` with ISO datetime `timestamp`.
   - OpenDART Financials require at least one non-null Beta financial operand (revenue, operating income, net income, assets, liabilities, equity).

3. **Freshness Tracking:**
   - Freshness measures `dataAsOf` (upstream observation time), not `checkedAt` (fetch time) or `updatedAt` (normalization time).

4. **Transport & Credential Security:**
   - Internal smoke fetches use `redirect: "manual"` and `AbortSignal.timeout(10000)`.
   - 3xx redirects trigger immediate transport errors to prevent key leakage.
   - `INTERNAL_SMOKE_KEY` minimum length enforced at 32 bytes.
   - Admin routes guarded by `requireProviderAdmin` with constant-time token comparison and origin validation.

---

## Final Release Decision

**Current Status:** **NO-GO / BLOCKED**

Reason: Live API credentials (KIS AppKey/Secret, OpenDART API key, Finnhub key) must be supplied in browser settings by operator to execute live smoke probes against a live server instance before Real Data Beta release.

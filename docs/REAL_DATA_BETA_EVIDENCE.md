# Real Data Beta Evidence Record

> **Plan Reference:** `docs/superpowers/plans/2026-08-02-beta-acceptance-integrity-security-follow-up.md`  
> **Status:** **BLOCKED / NO-GO** (Requires active KIS / OpenDART / Finnhub API credentials & live running server)

---

## Verification Commands & Integrity Summary

### Store Invariants

```text
57490a417840d2be080f24bd3dfad84d4bea14b9c40778058f763aa6d8733a08  data/settings/provider-settings.json
a0a7418d6bb3af6c780108361b7b33d492ee45dbedc9eab98cb0d71e92a03415  data/secrets/provider-secrets.json
```

- Secrets are encrypted on disk using AES-256-GCM (`provider-secret-store.ts`).
- Pre-test and post-test SHA-256 hashes match **EXACTLY**.

---

## Live Target Evidence Matrix

> **Note:** Acceptance suite fails closed with Exit Code 1 until valid live KIS, OpenDART, and Finnhub credentials are supplied by operator and server is started on target origin.

| Target | Provider | Capability | Symbol | Allowed Statuses | Expected Source | Expected Tier | Max Age | Current Status |
|---|---|---|---|---|---|---|---|---|
| 1 | `kis` | `quote` | `005930` | `real_time`, `delayed`, `eod` | `KIS Open API` | `official` | 20m | `not_configured` (Pending API credentials) |
| 2 | `kis` | `ohlcv` | `005930` | `delayed`, `eod` | `KIS Open API` | `official` | 96h | `not_configured` (Pending API credentials) |
| 3 | `opendart` | `filings` | `005930` | `eod` | `OpenDART` | `official` | 7 days | `not_configured` (Pending API credentials) |
| 4 | `opendart` | `financials` | `005930` | `eod` | `OpenDART` | `official` | 1 year | `not_configured` (Pending API credentials) |
| 5 | `finnhub_free` | `quote` | `AAPL` | `real_time`, `delayed` | `Finnhub Free` | `free_limited` | 20m | `not_configured` (Pending API credentials) |

---

## Security & Integrity Audit Summary

1. **Acceptance Gate Integrity:**
   - Evaluator (`beta-acceptance.ts`) independently verifies raw fields (`envelopeStatus`, `source`, `sourceTier`, `dataAsOf`, `ageMs`).
   - Runner booleans (`provenanceValid`, `freshnessValid`) are ignored by evaluator.
   - `cached`, `stale`, and `empty_allowed` statuses are explicitly rejected.

2. **Canonical Payload Normalization & Identity Validation:**
   - KIS OHLCV returns canonical `OhlcvSeries` with ISO datetime `timestamp`.
   - OpenDART Financials accepts both `assets`/`liabilities`/`equity` and normalized `totalAssets`/`totalLiabilities`/`totalEquity`.
   - `validateSmokeValue` validates payload inner `symbol`, `market`/`region`, and `source` identity against target policy context.

3. **Freshness Tracking Across All Envelopes:**
   - Upstream observation time `dataAsOf` is populated across all 5 provider targets (KIS quote/ohlcv, Finnhub quote, OpenDART filings/financials).
   - Freshness measures `dataAsOf`, not `checkedAt` (fetch time) or `updatedAt` (normalization time).
   - Trading cadence policies account for market close hours (KIS quote `eod`), weekend gaps (OHLCV 96h, filings 7d), and financial reporting cycles (financials 1yr).

4. **Transport, BFF Admin Auth & Credential Encryption Security:**
   - Provider settings UI (`ProviderApiSettingsPanel.tsx`) uses HttpOnly cookie session auth (`/api/auth/admin/login`).
   - `requireProviderAdmin` guard validates minimum 32-character admin tokens and enforces strict scheme+host+port `Origin` comparison on mutations.
   - All internal smoke fetches use `redirect: "manual"` and `AbortSignal.timeout(10000)`.
   - Provider secrets stored in `data/secrets/provider-secrets.json` are encrypted using AES-256-GCM.

---

## Final Release Decision

**Current Status:** **NO-GO / BLOCKED**

Reason: Live API credentials (KIS AppKey/Secret, OpenDART API key, Finnhub key) must be supplied in browser settings by operator to execute live smoke probes against a live server instance before Real Data Beta release.

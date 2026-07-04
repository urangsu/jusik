# WO017 V-Z Data Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add contract-first foundations for market backfill, provider runtime policy, AI dry-run, symbol master, and surge detector v2 without claiming live provider completion.

**Architecture:** Keep live-provider behavior behind DataEnvelope and runtime gates. Persist generated market data under runtime `data/` paths only, add deterministic stores/services, and expose minimal API/CLI boundaries. Surge v2 reads stored OHLCV and remains diagnostic only.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, file-based runtime stores, DataEnvelope.

---

### Task 1: Market Backfill Foundation (WO017-V)

**Files:**
- Create `src/domain/market/market-data-backfill.ts`
- Create `src/server/market-data/market-data-backfill-store.ts`
- Create `src/server/market-data/market-data-backfill-runner.ts`
- Create `scripts/market/backfill-market-data.ts`
- Create `src/app/api/market/backfill/run/route.ts`
- Create `src/app/api/market/backfill/latest/route.ts`
- Tests beside service/API files

- [ ] Write tests for api_required persistence and generated-data paths.
- [ ] Implement runner that calls `marketDataService`, writes quote/OHLCV envelopes, records failures.
- [ ] Add `market:backfill` script and API routes.
- [ ] Verify with targeted tests.

### Task 2: Provider Runtime Policy (WO017-W)

**Files:**
- Create `src/domain/providers/provider-runtime-policy.ts`
- Create `src/server/providers/provider-runtime-gate.ts`
- Create `src/server/providers/provider-response-cache-store.ts`
- Tests beside files

- [ ] Write tests for cache hit, retryable status, rate limit, stale fallback, and no null success cache.
- [ ] Implement deterministic runtime gate and cache store.
- [ ] Verify with targeted tests.

### Task 3: AI Dry-run Adapter (WO017-X)

**Files:**
- Create `src/domain/ai/ai-provider-dry-run.ts`
- Create `src/server/ai/ai-provider-dry-run-service.ts`
- Create `src/app/api/ai/providers/dry-run/route.ts`
- Tests beside files

- [ ] Write tests for disabled provider block, mock allowed, missing sourceRefs block, no external call.
- [ ] Implement token estimate and policy result.
- [ ] Verify with targeted tests.

### Task 4: Symbol Master and CorpCode Mapping (WO017-Y)

**Files:**
- Create `src/domain/symbols/symbol-master.ts`
- Create `src/server/symbols/symbol-master-store.ts`
- Create `src/app/api/symbols/search/route.ts`
- Create `src/app/api/symbols/[assetId]/route.ts`
- Create `src/app/api/symbols/import/route.ts`
- Tests beside files

- [ ] Implement KR_005930 and US_AAPL seed-safe mappings.
- [ ] Support symbol -> assetId -> corpCode lookup and not_found.
- [ ] Verify with targeted tests.

### Task 5: Surge Detector v2 (WO017-Z)

**Files:**
- Modify `src/domain/surge/surge-candidate.ts`
- Modify `src/server/surge/surge-candidate-detector.ts`
- Tests beside detector

- [ ] Add trading value, low-liquidity, 1d/5d/20d returns, volume z-score, CLV/gap, sector-relative placeholder fields.
- [ ] Add deterministic dedupe id and expiry.
- [ ] Ensure candidates are not auto-promoted.
- [ ] Verify with targeted tests and CLI.

### Task 6: Docs and Verification

**Files:**
- Modify `README.md`, `docs/IMPLEMENTATION_INVENTORY.md`
- Add docs for real data readiness/runtime policy if missing.

- [ ] Run typecheck/lint/test/build/docs/guards.
- [ ] Commit atomic groups and push.

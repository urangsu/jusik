# Risk Close Provider Data Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining WO017 V-Z operational risks without pretending live provider coverage or production database readiness exists.

**Architecture:** Keep all real-data paths behind `DataEnvelope`, runtime policy gates, and explicit provider readiness checks. Add testable smoke profiles and policy guards before expanding actual provider usage. Do not add order execution, buy/sell language, expected-return UI, or unverified AI output.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, file-based runtime stores, provider `DataEnvelope`, existing `runWithProviderRuntimeGate`, existing runtime data root.

---

## Scope

This plan addresses these remaining risks:

- Actual provider-key environment is not continuously verified.
- Market backfill store is file runtime only and needs an explicit operational boundary.
- Symbol Master is seed-safe but not scalable to KR/US universe imports.
- Surge Detector v2 still has placeholders for sector-relative strength and filing-event boost.
- Provider runtime gate exists but is not applied across enough real provider call paths.

This plan does not implement:

- Broker order placement.
- Automatic trading.
- Expected return UI.
- Production Postgres/SQLite migration.
- Paid provider credential onboarding.
- External LLM explanation generation.

---

## Files To Touch

- Create: `src/domain/ops/provider-key-smoke.ts`
- Create: `src/server/ops/provider-key-smoke-runner.ts`
- Create: `src/server/ops/provider-key-smoke-runner.test.ts`
- Create: `scripts/ops/run-provider-key-smoke.ts`
- Modify: `package.json`
- Create: `src/domain/market/backfill-manifest.ts`
- Create: `src/server/market-data/market-backfill-manifest-store.ts`
- Create: `src/server/market-data/market-backfill-manifest-store.test.ts`
- Modify: `src/server/market-data/market-data-backfill-runner.ts`
- Modify: `src/server/market-data/market-data-backfill-runner.test.ts`
- Create: `src/domain/symbols/symbol-master-import.ts`
- Create: `src/server/symbols/symbol-master-import-validator.ts`
- Create: `src/server/symbols/symbol-master-import-validator.test.ts`
- Modify: `src/server/symbols/symbol-master-store.ts`
- Modify: `src/server/symbols/symbol-master-store.test.ts`
- Create: `src/domain/surge/surge-context.ts`
- Create: `src/server/surge/surge-context-store.ts`
- Create: `src/server/surge/surge-context-store.test.ts`
- Modify: `src/server/surge/surge-candidate-detector.ts`
- Modify: `src/server/surge/surge-candidate-detector.test.ts`
- Create: `src/server/services/market-data-runtime-wrapper.ts`
- Create: `src/server/services/market-data-runtime-wrapper.test.ts`
- Modify: `src/server/services/market-data-service.ts`
- Modify: `src/server/market-data/market-data-backfill-runner.ts`
- Create: `docs/PROVIDER_KEY_SMOKE.md`
- Modify: `docs/MARKET_BACKFILL.md`
- Modify: `docs/SYMBOL_MASTER.md`
- Modify: `docs/SURGE_DETECTOR_V2.md`
- Modify: `docs/PROVIDER_RUNTIME_POLICY.md`
- Modify: `docs/IMPLEMENTATION_INVENTORY.md`

---

### Task 1: Provider Key Smoke Profile

**Purpose:** Make provider-key environment validation repeatable without claiming live data coverage when keys are absent.

**Files:**
- Create: `src/domain/ops/provider-key-smoke.ts`
- Create: `src/server/ops/provider-key-smoke-runner.ts`
- Create: `src/server/ops/provider-key-smoke-runner.test.ts`
- Create: `scripts/ops/run-provider-key-smoke.ts`
- Modify: `package.json`
- Create: `docs/PROVIDER_KEY_SMOKE.md`

- [ ] **Step 1: Add domain contract**

Create `src/domain/ops/provider-key-smoke.ts`:

```ts
import type { DataStatus } from "@/domain/common/data-status";

export type ProviderKeySmokeProvider =
  | "kis"
  | "opendart"
  | "fmp_free"
  | "finnhub_free"
  | "alpha_vantage_free";

export type ProviderKeySmokeTarget = {
  id: string;
  providerId: ProviderKeySmokeProvider;
  capability: "quote" | "ohlcv" | "filings" | "financials" | "provider_health";
  requiresKey: boolean;
};

export type ProviderKeySmokeResult = {
  targetId: string;
  providerId: ProviderKeySmokeProvider;
  capability: ProviderKeySmokeTarget["capability"];
  keyConfigured: boolean;
  status: DataStatus;
  dataAvailable: boolean;
  passed: boolean;
  message: string | null;
};

export type ProviderKeySmokeReport = {
  id: string;
  mode: "without_key" | "with_key" | "auto";
  results: ProviderKeySmokeResult[];
  passed: boolean;
  failureCount: number;
  createdAt: string;
  engineVersion: "provider-key-smoke-v1";
};
```

- [ ] **Step 2: Add failing runner tests**

Create `src/server/ops/provider-key-smoke-runner.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateProviderKeySmokeResult } from "./provider-key-smoke-runner";

describe("evaluateProviderKeySmokeResult", () => {
  it("passes api_required when key is not configured", () => {
    const result = evaluateProviderKeySmokeResult({
      targetId: "kis_quote_kr_005930",
      providerId: "kis",
      capability: "quote",
      keyConfigured: false,
      status: "api_required",
      dataAvailable: false,
      message: null,
    });

    expect(result.passed).toBe(true);
  });

  it("fails api_required when key is configured", () => {
    const result = evaluateProviderKeySmokeResult({
      targetId: "kis_quote_kr_005930",
      providerId: "kis",
      capability: "quote",
      keyConfigured: true,
      status: "api_required",
      dataAvailable: false,
      message: null,
    });

    expect(result.passed).toBe(false);
  });

  it("passes real data status when key is configured and data is available", () => {
    const result = evaluateProviderKeySmokeResult({
      targetId: "fmp_quote_us_aapl",
      providerId: "fmp_free",
      capability: "quote",
      keyConfigured: true,
      status: "delayed",
      dataAvailable: true,
      message: null,
    });

    expect(result.passed).toBe(true);
  });
});
```

- [ ] **Step 3: Run failing test**

Run:

```bash
npm run test -- src/server/ops/provider-key-smoke-runner.test.ts
```

Expected: fail because `provider-key-smoke-runner.ts` does not exist.

- [ ] **Step 4: Implement evaluator and runner shell**

Create `src/server/ops/provider-key-smoke-runner.ts`:

```ts
import type {
  ProviderKeySmokeReport,
  ProviderKeySmokeResult,
  ProviderKeySmokeTarget,
} from "@/domain/ops/provider-key-smoke";

const ENGINE_VERSION = "provider-key-smoke-v1" as const;

export const PROVIDER_KEY_SMOKE_TARGETS: ProviderKeySmokeTarget[] = [
  { id: "kis_quote_kr_005930", providerId: "kis", capability: "quote", requiresKey: true },
  { id: "kis_ohlcv_kr_005930", providerId: "kis", capability: "ohlcv", requiresKey: true },
  { id: "opendart_disclosures_kr_00126380", providerId: "opendart", capability: "filings", requiresKey: true },
  { id: "opendart_financials_kr_00126380", providerId: "opendart", capability: "financials", requiresKey: true },
  { id: "fmp_quote_us_aapl", providerId: "fmp_free", capability: "quote", requiresKey: true },
  { id: "finnhub_quote_us_aapl", providerId: "finnhub_free", capability: "quote", requiresKey: true },
  { id: "alpha_vantage_quote_us_aapl", providerId: "alpha_vantage_free", capability: "quote", requiresKey: true },
];

export function evaluateProviderKeySmokeResult(
  input: Omit<ProviderKeySmokeResult, "passed">,
): ProviderKeySmokeResult {
  const dataStatusOk = ["real_time", "delayed", "eod", "cached", "stale"].includes(input.status);
  const passed = input.keyConfigured
    ? dataStatusOk && input.dataAvailable
    : input.status === "api_required" || input.status === "not_supported";

  return { ...input, passed };
}

export async function runProviderKeySmoke(params: {
  mode: "without_key" | "with_key" | "auto";
  probe: (target: ProviderKeySmokeTarget) => Promise<Omit<ProviderKeySmokeResult, "passed">>;
}): Promise<ProviderKeySmokeReport> {
  const results: ProviderKeySmokeResult[] = [];

  for (const target of PROVIDER_KEY_SMOKE_TARGETS) {
    const raw = await params.probe(target);
    results.push(evaluateProviderKeySmokeResult(raw));
  }

  const failureCount = results.filter((result) => !result.passed).length;
  return {
    id: `provider_key_smoke_${Date.now()}`,
    mode: params.mode,
    results,
    passed: failureCount === 0,
    failureCount,
    createdAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}
```

- [ ] **Step 5: Add CLI shell**

Create `scripts/ops/run-provider-key-smoke.ts`:

```ts
import { runProviderKeySmoke } from "@/server/ops/provider-key-smoke-runner";

const report = await runProviderKeySmoke({
  mode: "auto",
  probe: async (target) => ({
    targetId: target.id,
    providerId: target.providerId,
    capability: target.capability,
    keyConfigured: false,
    status: "api_required",
    dataAvailable: false,
    message: "Provider key smoke is in no-key probe mode.",
  }),
});

console.log(`[Provider Key Smoke] ${report.id}`);
console.log(`passed=${report.passed} failures=${report.failureCount}`);
for (const result of report.results) {
  console.log(`${result.targetId} status=${result.status} key=${result.keyConfigured} pass=${result.passed}`);
}

process.exit(report.passed ? 0 : 1);
```

Modify `package.json` scripts:

```json
"ops:provider-key-smoke": "tsx scripts/ops/run-provider-key-smoke.ts"
```

- [ ] **Step 6: Add policy doc**

Create `docs/PROVIDER_KEY_SMOKE.md`:

```md
# Provider Key Smoke

Provider key smoke verifies whether configured provider credentials produce real `DataEnvelope` data.

Rules:
- No-key mode passes only `api_required` or `not_supported`.
- With-key mode fails if the provider still returns `api_required`.
- `value: null` with `real_time`, `delayed`, `eod`, `cached`, or `stale` is a failure.
- This smoke does not certify full universe coverage.
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm run test -- src/server/ops/provider-key-smoke-runner.test.ts
npm run ops:provider-key-smoke
```

Commit:

```bash
git add src/domain/ops/provider-key-smoke.ts src/server/ops/provider-key-smoke-runner.ts src/server/ops/provider-key-smoke-runner.test.ts scripts/ops/run-provider-key-smoke.ts package.json docs/PROVIDER_KEY_SMOKE.md
git commit -m "feat(ops): add provider key smoke profile"
```

---

### Task 2: Backfill Manifest and Store Boundary

**Purpose:** Make file-based backfill explicitly auditable as generated runtime data, not a production database.

**Files:**
- Create: `src/domain/market/backfill-manifest.ts`
- Create: `src/server/market-data/market-backfill-manifest-store.ts`
- Create: `src/server/market-data/market-backfill-manifest-store.test.ts`
- Modify: `src/server/market-data/market-data-backfill-runner.ts`
- Modify: `src/server/market-data/market-data-backfill-runner.test.ts`
- Modify: `docs/MARKET_BACKFILL.md`

- [ ] **Step 1: Add manifest type**

Create `src/domain/market/backfill-manifest.ts`:

```ts
export type MarketBackfillManifest = {
  manifestId: string;
  backfillReportId: string;
  universe: string;
  capability: "quote" | "ohlcv";
  generatedDataRoot: string;
  generatedPaths: string[];
  productionStore: false;
  createdAt: string;
};
```

- [ ] **Step 2: Add failing manifest store test**

Create `src/server/market-data/market-backfill-manifest-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { getLatestMarketBackfillManifest, saveMarketBackfillManifest } from "./market-backfill-manifest-store";

describe("market backfill manifest store", () => {
  beforeEach(async () => {
    process.env.JUSIK_TEST_DATA_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), "market-backfill-manifest-"));
  });

  it("stores generated paths while marking the store as non-production", async () => {
    await saveMarketBackfillManifest({
      manifestId: "manifest_test",
      backfillReportId: "report_test",
      universe: "SP500_SAMPLE",
      capability: "ohlcv",
      generatedDataRoot: process.env.JUSIK_TEST_DATA_ROOT!,
      generatedPaths: ["/tmp/generated.json"],
      productionStore: false,
      createdAt: "2026-07-05T00:00:00.000Z",
    });

    const latest = await getLatestMarketBackfillManifest();
    expect(latest?.productionStore).toBe(false);
    expect(latest?.generatedPaths).toEqual(["/tmp/generated.json"]);
  });
});
```

- [ ] **Step 3: Implement manifest store**

Create `src/server/market-data/market-backfill-manifest-store.ts`:

```ts
import fs from "fs/promises";
import path from "path";
import type { MarketBackfillManifest } from "@/domain/market/backfill-manifest";
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
import { writeAtomic } from "@/server/storage/atomic-write";

function latestManifestPath(): string {
  return resolveRuntimeDataPath("data", "market", "backfill", "manifest.latest.json");
}

export async function saveMarketBackfillManifest(manifest: MarketBackfillManifest): Promise<void> {
  const filePath = latestManifestPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await writeAtomic(filePath, JSON.stringify(manifest, null, 2));
}

export async function getLatestMarketBackfillManifest(): Promise<MarketBackfillManifest | null> {
  try {
    return JSON.parse(await fs.readFile(latestManifestPath(), "utf8")) as MarketBackfillManifest;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Wire manifest into backfill runner**

Modify `src/server/market-data/market-data-backfill-runner.ts` after `saveMarketBackfillReport(report)`:

```ts
await saveMarketBackfillManifest({
  manifestId: `market_backfill_manifest_${Date.now()}`,
  backfillReportId: report.id,
  universe: request.universe,
  capability: request.capability,
  generatedDataRoot: report.generatedDataRoot,
  generatedPaths: results.flatMap((result) => (result.storedPath ? [result.storedPath] : [])),
  productionStore: false,
  createdAt,
});
```

Import:

```ts
import { saveMarketBackfillManifest } from "./market-backfill-manifest-store";
```

- [ ] **Step 5: Extend backfill runner test**

Modify `src/server/market-data/market-data-backfill-runner.test.ts`:

```ts
import { getLatestMarketBackfillManifest } from "./market-backfill-manifest-store";
```

Add after stored envelope assertion:

```ts
const manifest = await getLatestMarketBackfillManifest();
expect(manifest?.productionStore).toBe(false);
expect(manifest?.generatedPaths.length).toBeGreaterThan(0);
```

- [ ] **Step 6: Update docs and commit**

Append to `docs/MARKET_BACKFILL.md`:

```md
## Manifest

Each backfill run writes a manifest with generated paths and `productionStore: false`.
This is an audit marker that the file store is runtime data, not a production database.
```

Run:

```bash
npm run test -- src/server/market-data/market-backfill-manifest-store.test.ts src/server/market-data/market-data-backfill-runner.test.ts
```

Commit:

```bash
git add src/domain/market/backfill-manifest.ts src/server/market-data/market-backfill-manifest-store.ts src/server/market-data/market-backfill-manifest-store.test.ts src/server/market-data/market-data-backfill-runner.ts src/server/market-data/market-data-backfill-runner.test.ts docs/MARKET_BACKFILL.md
git commit -m "feat(market): add backfill manifest boundary"
```

---

### Task 3: Symbol Master Import Guard

**Purpose:** Prevent malformed KR/US symbol records from entering the runtime symbol master.

**Files:**
- Create: `src/domain/symbols/symbol-master-import.ts`
- Create: `src/server/symbols/symbol-master-import-validator.ts`
- Create: `src/server/symbols/symbol-master-import-validator.test.ts`
- Modify: `src/server/symbols/symbol-master-store.ts`
- Modify: `src/server/symbols/symbol-master-store.test.ts`
- Modify: `docs/SYMBOL_MASTER.md`

- [ ] **Step 1: Add import validation result type**

Create `src/domain/symbols/symbol-master-import.ts`:

```ts
import type { SymbolMasterRecord } from "./symbol-master";

export type SymbolMasterImportValidation = {
  validRecords: SymbolMasterRecord[];
  rejectedRecords: Array<{
    assetId: string | null;
    reason: string;
  }>;
};
```

- [ ] **Step 2: Add failing validator tests**

Create `src/server/symbols/symbol-master-import-validator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateSymbolMasterImport } from "./symbol-master-import-validator";
import type { SymbolMasterRecord } from "@/domain/symbols/symbol-master";

function baseRecord(overrides: Partial<SymbolMasterRecord> = {}): SymbolMasterRecord {
  return {
    assetId: "KR_005930",
    symbol: "005930",
    market: "KR",
    exchange: "KOSPI",
    currency: "KRW",
    assetType: "common_stock",
    status: "active",
    source: "manual_import",
    updatedAt: "2026-07-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("validateSymbolMasterImport", () => {
  it("rejects KR records without KR_ asset id prefix", () => {
    const result = validateSymbolMasterImport([baseRecord({ assetId: "005930" })]);
    expect(result.validRecords).toHaveLength(0);
    expect(result.rejectedRecords[0].reason).toContain("KR_");
  });

  it("rejects US records without US_ asset id prefix", () => {
    const result = validateSymbolMasterImport([baseRecord({ assetId: "AAPL", symbol: "AAPL", market: "US", currency: "USD" })]);
    expect(result.validRecords).toHaveLength(0);
    expect(result.rejectedRecords[0].reason).toContain("US_");
  });

  it("accepts canonical KR and US records", () => {
    const result = validateSymbolMasterImport([
      baseRecord(),
      baseRecord({ assetId: "US_AAPL", symbol: "AAPL", market: "US", currency: "USD", exchange: "NASDAQ" }),
    ]);
    expect(result.validRecords).toHaveLength(2);
    expect(result.rejectedRecords).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Implement validator**

Create `src/server/symbols/symbol-master-import-validator.ts`:

```ts
import type { SymbolMasterImportValidation } from "@/domain/symbols/symbol-master-import";
import type { SymbolMasterRecord } from "@/domain/symbols/symbol-master";

export function validateSymbolMasterImport(records: SymbolMasterRecord[]): SymbolMasterImportValidation {
  const validRecords: SymbolMasterRecord[] = [];
  const rejectedRecords: SymbolMasterImportValidation["rejectedRecords"] = [];

  for (const record of records) {
    if (record.market === "KR" && !record.assetId.startsWith("KR_")) {
      rejectedRecords.push({ assetId: record.assetId ?? null, reason: "KR records require KR_ assetId prefix." });
      continue;
    }
    if (record.market === "US" && !record.assetId.startsWith("US_")) {
      rejectedRecords.push({ assetId: record.assetId ?? null, reason: "US records require US_ assetId prefix." });
      continue;
    }
    if (record.market === "KR" && record.currency !== "KRW") {
      rejectedRecords.push({ assetId: record.assetId, reason: "KR records require KRW currency." });
      continue;
    }
    if (record.market === "US" && record.currency !== "USD") {
      rejectedRecords.push({ assetId: record.assetId, reason: "US records require USD currency." });
      continue;
    }
    validRecords.push(record);
  }

  return { validRecords, rejectedRecords };
}
```

- [ ] **Step 4: Wire validator into import store**

Modify `src/server/symbols/symbol-master-store.ts`:

```ts
import { validateSymbolMasterImport } from "./symbol-master-import-validator";
```

Replace `importSymbolMasterRecords` body:

```ts
export async function importSymbolMasterRecords(records: SymbolMasterRecord[]): Promise<{ imported: number; rejected: number }> {
  const validation = validateSymbolMasterImport(records);
  const existing = await readManualRecords();
  const map = new Map(existing.map((record) => [record.assetId, record]));
  for (const record of validation.validRecords) {
    map.set(record.assetId, { ...record, source: record.source ?? "manual_import" });
  }
  await writeManualRecords(Array.from(map.values()));
  return { imported: validation.validRecords.length, rejected: validation.rejectedRecords.length };
}
```

- [ ] **Step 5: Update store test**

Modify `src/server/symbols/symbol-master-store.test.ts` to assert rejected bad import:

```ts
it("rejects non-canonical imported asset ids", async () => {
  const result = await importSymbolMasterRecords([
    {
      assetId: "AAPL",
      symbol: "AAPL",
      market: "US",
      exchange: "NASDAQ",
      currency: "USD",
      assetType: "common_stock",
      status: "active",
      source: "manual_import",
      updatedAt: "2026-07-05T00:00:00.000Z",
    },
  ]);

  expect(result.imported).toBe(0);
  expect(result.rejected).toBe(1);
});
```

- [ ] **Step 6: Update docs and commit**

Append to `docs/SYMBOL_MASTER.md`:

```md
## Import Guard

Imports reject non-canonical asset ids:
- KR records must use `KR_` prefix and `KRW`.
- US records must use `US_` prefix and `USD`.
```

Run:

```bash
npm run test -- src/server/symbols/symbol-master-import-validator.test.ts src/server/symbols/symbol-master-store.test.ts src/app/api/symbols/import/route.test.ts
```

Commit:

```bash
git add src/domain/symbols/symbol-master-import.ts src/server/symbols/symbol-master-import-validator.ts src/server/symbols/symbol-master-import-validator.test.ts src/server/symbols/symbol-master-store.ts src/server/symbols/symbol-master-store.test.ts src/app/api/symbols/import/route.test.ts docs/SYMBOL_MASTER.md
git commit -m "feat(symbols): guard symbol master imports"
```

---

### Task 4: Surge Context for Sector and Filing Boost

**Purpose:** Replace Surge v2 placeholders with optional context inputs that are explicit and testable.

**Files:**
- Create: `src/domain/surge/surge-context.ts`
- Create: `src/server/surge/surge-context-store.ts`
- Create: `src/server/surge/surge-context-store.test.ts`
- Modify: `src/server/surge/surge-candidate-detector.ts`
- Modify: `src/server/surge/surge-candidate-detector.test.ts`
- Modify: `docs/SURGE_DETECTOR_V2.md`

- [ ] **Step 1: Add surge context type**

Create `src/domain/surge/surge-context.ts`:

```ts
export type SurgeContextRecord = {
  assetId: string;
  sectorReturn20dPct: number | null;
  hasRecentFilingEvent: boolean;
  filingEventIds: string[];
  updatedAt: string;
};
```

- [ ] **Step 2: Add context store tests**

Create `src/server/surge/surge-context-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { getSurgeContext, saveSurgeContexts } from "./surge-context-store";

describe("surge context store", () => {
  beforeEach(async () => {
    process.env.JUSIK_TEST_DATA_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), "surge-context-"));
  });

  it("returns null when context is not available", async () => {
    await expect(getSurgeContext("US_AAPL")).resolves.toBeNull();
  });

  it("stores sector and filing context by asset", async () => {
    await saveSurgeContexts([
      {
        assetId: "US_AAPL",
        sectorReturn20dPct: 0.03,
        hasRecentFilingEvent: true,
        filingEventIds: ["filing_1"],
        updatedAt: "2026-07-05T00:00:00.000Z",
      },
    ]);

    const context = await getSurgeContext("US_AAPL");
    expect(context?.sectorReturn20dPct).toBe(0.03);
    expect(context?.filingEventIds).toEqual(["filing_1"]);
  });
});
```

- [ ] **Step 3: Implement context store**

Create `src/server/surge/surge-context-store.ts`:

```ts
import fs from "fs/promises";
import path from "path";
import type { SurgeContextRecord } from "@/domain/surge/surge-context";
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
import { writeAtomic } from "@/server/storage/atomic-write";

function contextPath(): string {
  return resolveRuntimeDataPath("data", "surge", "context.json");
}

export async function saveSurgeContexts(records: SurgeContextRecord[]): Promise<void> {
  const filePath = contextPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await writeAtomic(filePath, JSON.stringify(records, null, 2));
}

export async function getSurgeContext(assetId: string): Promise<SurgeContextRecord | null> {
  try {
    const records = JSON.parse(await fs.readFile(contextPath(), "utf8")) as SurgeContextRecord[];
    return records.find((record) => record.assetId === assetId) ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Wire context into detector**

Modify `src/server/surge/surge-candidate-detector.ts`:

```ts
import { getSurgeContext } from "./surge-context-store";
```

After `return20dPct` calculation:

```ts
const context = await getSurgeContext(assetId);
const sectorRelativeStrength =
  return20dPct !== null && context?.sectorReturn20dPct !== null && context?.sectorReturn20dPct !== undefined
    ? return20dPct - context.sectorReturn20dPct
    : null;
```

Replace relative strength reason condition:

```ts
if (sectorRelativeStrength !== null && sectorRelativeStrength >= 0.05 && priceChangePct > 0) {
  reasons.push("relative_strength");
} else if (return20dPct !== null && return20dPct >= 0.1 && priceChangePct > 0) {
  reasons.push("relative_strength");
}
if (context?.hasRecentFilingEvent) {
  reasons.push("filing_event");
}
```

Replace scores:

```ts
const relativeStrengthBase = sectorRelativeStrength ?? return20dPct ?? 0;
const relativeStrengthScore = Math.min(Math.max(relativeStrengthBase * 3, 0), 1);
const filingEventScore = context?.hasRecentFilingEvent ? 0.2 : 0;
const score = (priceScore + volumeScore + volatilityScore + relativeStrengthScore + liquidityScore + filingEventScore) / 6.0;
```

Set metric:

```ts
relativeStrength: sectorRelativeStrength ?? return20dPct,
```

Set sourceRefs:

```ts
sourceRefs: [
  `ohlcv_history_${universeId}_${assetId}`,
  ...(context?.filingEventIds ?? []),
],
```

Set `filingEventScore`.

- [ ] **Step 5: Extend detector test**

Modify `src/server/surge/surge-candidate-detector.test.ts`:

```ts
vi.mock("./surge-context-store", () => ({
  getSurgeContext: vi.fn().mockResolvedValue(null),
}));
```

Import:

```ts
import { getSurgeContext } from "./surge-context-store";
```

Add test:

```ts
it("adds filing event context and sector-relative strength when context exists", async () => {
  vi.mocked(getSurgeContext).mockResolvedValue({
    assetId: "US_AAPL",
    sectorReturn20dPct: 0.02,
    hasRecentFilingEvent: true,
    filingEventIds: ["filing_1"],
    updatedAt: "2026-07-05T00:00:00.000Z",
  });
  vi.mocked(loadOhlcvHistory).mockResolvedValue({
    value: bars("US_AAPL", 10_000_000, 140),
    status: "cached",
    source: "test",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: "2026-07-05T00:00:00.000Z",
  });

  const candidates = await detectSurgeCandidates({ market: "US" });
  expect(candidates[0].reasons).toContain("filing_event");
  expect(candidates[0].sourceRefs).toContain("filing_1");
  expect(candidates[0].scoreBreakdown.filingEventScore).toBe(0.2);
});
```

- [ ] **Step 6: Update docs and commit**

Append to `docs/SURGE_DETECTOR_V2.md`:

```md
## Optional Context

Sector-relative strength and filing-event boost are only applied when `SurgeContextRecord` exists.
Missing context does not create fake filing or sector signals.
```

Run:

```bash
npm run test -- src/server/surge/surge-context-store.test.ts src/server/surge/surge-candidate-detector.test.ts src/server/integration/os-workflow-smoke.test.ts
```

Commit:

```bash
git add src/domain/surge/surge-context.ts src/server/surge/surge-context-store.ts src/server/surge/surge-context-store.test.ts src/server/surge/surge-candidate-detector.ts src/server/surge/surge-candidate-detector.test.ts docs/SURGE_DETECTOR_V2.md
git commit -m "feat(surge): add sector and filing context"
```

---

### Task 5: Market Data Runtime Gate Integration

**Purpose:** Apply provider runtime gate to market data service entrypoints without changing provider semantics.

**Files:**
- Create: `src/server/services/market-data-runtime-wrapper.ts`
- Create: `src/server/services/market-data-runtime-wrapper.test.ts`
- Modify: `src/server/services/market-data-service.ts`
- Modify: `src/server/market-data/market-data-backfill-runner.ts`
- Modify: `docs/PROVIDER_RUNTIME_POLICY.md`

- [ ] **Step 1: Add wrapper test**

Create `src/server/services/market-data-runtime-wrapper.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { DataEnvelope } from "@/domain/common/data-status";
import { withMarketDataRuntimeGate } from "./market-data-runtime-wrapper";

function quoteEnvelope(status: DataEnvelope<{ price: number }>["status"]): DataEnvelope<{ price: number }> {
  return {
    value: status === "delayed" ? { price: 1 } : null,
    status,
    source: "test_provider",
    sourceTier: "free_limited",
    warnings: [],
    updatedAt: status === "delayed" ? "2026-07-05T00:00:00.000Z" : null,
  };
}

describe("withMarketDataRuntimeGate", () => {
  it("scopes cache keys by provider, market, asset, capability, range, and interval", async () => {
    const observedKeys: string[] = [];
    const result = await withMarketDataRuntimeGate({
      providerId: "fmp_free",
      market: "US",
      assetId: "US_AAPL",
      symbol: "AAPL",
      capability: "ohlcv",
      range: "1M",
      interval: "1D",
      fetcher: async () => quoteEnvelope("delayed"),
      cacheStore: {
        get: async () => null,
        put: async (key: string) => {
          observedKeys.push(key);
          return true;
        },
      },
    });

    expect(result.status).toBe("delayed");
    expect(observedKeys[0]).toContain("fmp_free");
    expect(observedKeys[0]).toContain("US_AAPL");
    expect(observedKeys[0]).toContain("1M");
    expect(observedKeys[0]).toContain("1D");
  });
});
```

- [ ] **Step 2: Implement wrapper**

Create `src/server/services/market-data-runtime-wrapper.ts`:

```ts
import type { DataEnvelope } from "@/domain/common/data-status";
import { DEFAULT_PROVIDER_RUNTIME_POLICIES, type RuntimeProviderId } from "@/domain/providers/provider-runtime-policy";
import { runWithProviderRuntimeGate } from "@/server/providers/provider-runtime-gate";
import type { ProviderResponseCacheStore } from "@/server/providers/provider-response-cache-store";

export async function withMarketDataRuntimeGate<T>(params: {
  providerId: RuntimeProviderId;
  market: "KR" | "US";
  assetId: string;
  symbol: string;
  capability: "quote" | "ohlcv";
  range?: string;
  interval?: string;
  cacheStore?: Pick<ProviderResponseCacheStore, "get" | "put">;
  fetcher: () => Promise<DataEnvelope<T>>;
}): Promise<DataEnvelope<T>> {
  const key = [
    "market-data",
    params.providerId,
    params.market,
    params.assetId,
    params.symbol,
    params.capability,
    params.range ?? "none",
    params.interval ?? "none",
  ].join(":");

  return runWithProviderRuntimeGate<T>({
    cacheKey: key,
    policy: DEFAULT_PROVIDER_RUNTIME_POLICIES[params.providerId],
    cacheStore: params.cacheStore as ProviderResponseCacheStore | undefined,
    fetcher: params.fetcher,
  });
}
```

- [ ] **Step 3: Integrate wrapper at backfill boundary**

Modify `src/server/market-data/market-data-backfill-runner.ts` to wrap provider calls:

```ts
import { withMarketDataRuntimeGate } from "@/server/services/market-data-runtime-wrapper";
```

For quote:

```ts
await withMarketDataRuntimeGate({
  providerId: asset.market === "KR" ? "kis" : "fmp_free",
  market: asset.market,
  assetId: asset.assetId,
  symbol: asset.symbol,
  capability: "quote",
  fetcher: () => marketDataService.getQuote(asset.symbol, asset.market),
})
```

For OHLCV:

```ts
await withMarketDataRuntimeGate({
  providerId: asset.market === "KR" ? "kis" : "fmp_free",
  market: asset.market,
  assetId: asset.assetId,
  symbol: asset.symbol,
  capability: "ohlcv",
  range: request.range,
  interval: request.interval,
  fetcher: () => marketDataService.getOhlcv({
    symbol: asset.symbol,
    region: asset.market,
    range: request.range,
    interval: request.interval,
  }),
})
```

- [ ] **Step 4: Extend backfill test for runtime gate**

Mock `withMarketDataRuntimeGate` in `src/server/market-data/market-data-backfill-runner.test.ts`:

```ts
vi.mock("@/server/services/market-data-runtime-wrapper", async () => {
  const actual = await vi.importActual<typeof import("@/server/services/market-data-runtime-wrapper")>(
    "@/server/services/market-data-runtime-wrapper",
  );
  return {
    ...actual,
    withMarketDataRuntimeGate: vi.fn(async ({ fetcher }) => fetcher()),
  };
});
```

Add assertion:

```ts
import { withMarketDataRuntimeGate } from "@/server/services/market-data-runtime-wrapper";

expect(withMarketDataRuntimeGate).toHaveBeenCalledWith(expect.objectContaining({
  providerId: "fmp_free",
  assetId: "US_AAPL",
  capability: "ohlcv",
  range: "1M",
}));
```

- [ ] **Step 5: Update docs and commit**

Append to `docs/PROVIDER_RUNTIME_POLICY.md`:

```md
## Market Data Boundary

Market backfill calls route through the runtime gate with cache keys scoped by provider, market, assetId, symbol, capability, range, and interval.
```

Run:

```bash
npm run test -- src/server/services/market-data-runtime-wrapper.test.ts src/server/market-data/market-data-backfill-runner.test.ts
```

Commit:

```bash
git add src/server/services/market-data-runtime-wrapper.ts src/server/services/market-data-runtime-wrapper.test.ts src/server/market-data/market-data-backfill-runner.ts src/server/market-data/market-data-backfill-runner.test.ts docs/PROVIDER_RUNTIME_POLICY.md
git commit -m "feat(market): apply runtime gate to backfill"
```

---

### Task 6: Inventory and Full Verification

**Purpose:** Update operational inventory and verify no fake-live claims were introduced.

**Files:**
- Modify: `docs/IMPLEMENTATION_INVENTORY.md`
- Modify: `README.md`

- [ ] **Step 1: Update inventory**

Add these rows to `docs/IMPLEMENTATION_INVENTORY.md`:

```md
| Provider Key Smoke | **implemented** | `src/server/ops/provider-key-smoke-runner.ts` | ✓ | Key/no-key provider contract validation |
| Backfill Manifest | **implemented** | `src/server/market-data/market-backfill-manifest-store.ts` | ✓ | Marks generated file store as `productionStore: false` |
| Symbol Import Guard | **implemented** | `src/server/symbols/symbol-master-import-validator.ts` | ✓ | Rejects non-canonical KR/US imports |
| Surge Context | **implemented** | `src/server/surge/surge-context-store.ts` | ✓ | Optional sector/filing context without fake signals |
```

Add script row:

```md
| `ops:provider-key-smoke` | **implemented** | Provider key/no-key smoke CLI |
```

- [ ] **Step 2: Update README current status**

Add under Current Status:

```md
* Provider key smoke exists, but passing no-key smoke does not mean live provider coverage.
* Market backfill writes a non-production manifest with generated runtime paths.
* Symbol imports reject non-canonical KR/US asset ids.
* Surge sector and filing context are optional; missing context does not create fake signals.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run docs:check
npm run docs:quant
npm run check:wording
npm run check:alpha-ui
npm run build
npm run ops:provider-key-smoke
npm run market:backfill -- --universe=SP500_SAMPLE --capability=ohlcv --range=1M
npm run surge:detect -- --market=US
npm run outcomes:observe
```

Expected:

- All required commands exit 0.
- `lint` may print existing warnings but must have 0 errors.
- `market:backfill` may return partial/not_supported/api_required data states.
- `surge:detect` may find 0 candidates.
- `outcomes:observe` may find 0 pending records.

- [ ] **Step 4: Commit docs**

```bash
git add README.md docs/IMPLEMENTATION_INVENTORY.md
git commit -m "docs(ops): update risk close inventory"
```

- [ ] **Step 5: Push**

```bash
git status --short
git push origin main
```

---

## Self-Review Checklist

- Provider key smoke separates no-key and with-key expectations.
- Backfill manifest makes file runtime store visibly non-production.
- Symbol imports reject KR/US key collisions before persistence.
- Surge sector/filing boosts require explicit context and never invent events.
- Runtime gate applies to market backfill provider calls with scoped cache keys.
- No task adds buy/sell recommendation, target price, order execution, or expected return UI.
- Full verification includes docs, guard scripts, test, build, and operational CLIs.

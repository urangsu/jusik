import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { saveOutcomeRecord, getOutcomeRecord, listOutcomeRecords } from "./signal-outcome-journal-store";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

function makeRecord(id: string, overrides: Partial<SignalOutcomeJournalRecord> = {}): SignalOutcomeJournalRecord {
  return {
    id,
    rootOutcomeId: id,
    supersedesOutcomeId: null,
    revision: 0,
    subjectType: "signal",
    subjectId: "sig_123",
    assetId: "KR_005930",
    signalId: "sig_123",
    strategyId: null,
    observationStartedAt: "2026-01-05T00:00:00Z",
    basePriceDataVersionId: null,
    horizon: "forward_20d",
    baseTradeDate: null,
    targetTradeDate: null,
    observedForwardReturn: null,
    marketBenchmarkAssetId: null,
    marketBenchmarkReturn: null,
    marketExcessReturn: null,
    marketBenchmarkDataVersionId: null,
    sectorBenchmarkAssetId: null,
    sectorBenchmarkReturn: null,
    sectorExcessReturn: null,
    sectorBenchmarkDataVersionId: null,
    initialWarnings: [],
    finalWarnings: [],
    outcomeStatus: "pending",
    lesson: null,
    confidenceAdjustment: "not_applicable",
    evidencePackIds: [],
    createdAt: new Date().toISOString(),
    observedAt: null,
    ...overrides,
  };
}

describe("signal-outcome-journal-store", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("outcome-store-test");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it("should save and retrieve journal outcome records", async () => {
    const record = makeRecord("out_test");
    await saveOutcomeRecord(record);
    const retrieved = await getOutcomeRecord("out_test");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("out_test");
    expect(retrieved!.subjectId).toBe("sig_123");
  });

  it("should list outcome records", async () => {
    await saveOutcomeRecord(makeRecord("out_test"));
    await saveOutcomeRecord(makeRecord("out_test_2", { subjectId: "sig_456" }));

    const all = await listOutcomeRecords();
    expect(all).toHaveLength(2);

    const list123 = await listOutcomeRecords({ subjectId: "sig_123" });
    expect(list123).toHaveLength(1);
    expect(list123[0].id).toBe("out_test");
  });

  it("idempotent save: same record content is a no-op", async () => {
    const record = makeRecord("out_idem");
    await saveOutcomeRecord(record);
    // Saving identical content again should not throw
    await expect(saveOutcomeRecord(record)).resolves.not.toThrow();
    const retrieved = await getOutcomeRecord("out_idem");
    expect(retrieved!.id).toBe("out_idem");
  });

  it("immutability: saving same ID with different content throws", async () => {
    const original = makeRecord("out_immutable");
    await saveOutcomeRecord(original);

    const mutated = makeRecord("out_immutable", { lesson: "unexpected mutation" });
    await expect(saveOutcomeRecord(mutated)).rejects.toThrow(/Immutability violation/);
  });
});

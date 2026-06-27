import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { saveOutcomeRecord, getOutcomeRecord, listOutcomeRecords } from "./signal-outcome-journal-store";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

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

  const dummyRecord: SignalOutcomeJournalRecord = {
    id: "out_test",
    subjectType: "signal",
    subjectId: "sig_123",
    assetId: "AAPL",
    signalId: "sig_123",
    strategyId: null,
    horizon: "forward_20d",
    observedForwardReturn: null,
    benchmarkReturn: null,
    alphaReturn: null,
    initialWarnings: [],
    finalWarnings: [],
    outcomeStatus: "pending",
    lesson: null,
    confidenceAdjustment: "not_applicable",
    evidencePackIds: [],
    benchmarkSourceRef: null,
    createdAt: new Date().toISOString(),
    observedAt: null,
  };

  it("should save and retrieve journal outcome records", async () => {
    await saveOutcomeRecord(dummyRecord);
    const retrieved = await getOutcomeRecord("out_test");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("out_test");
    expect(retrieved!.subjectId).toBe("sig_123");
  });

  it("should list outcome records", async () => {
    await saveOutcomeRecord(dummyRecord);
    await saveOutcomeRecord({ ...dummyRecord, id: "out_test_2", subjectId: "sig_456" });

    const all = await listOutcomeRecords();
    expect(all).toHaveLength(2);

    const list123 = await listOutcomeRecords({ subjectId: "sig_123" });
    expect(list123).toHaveLength(1);
    expect(list123[0].id).toBe("out_test");
  });
});

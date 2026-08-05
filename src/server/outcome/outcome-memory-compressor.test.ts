import { describe, it, expect } from "vitest";
import { compressOutcomeMemory } from "./outcome-memory-compressor";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

function makeRecord(overrides: Partial<SignalOutcomeJournalRecord>): SignalOutcomeJournalRecord {
  const id = overrides.id ?? "out_1";
  return {
    id,
    rootOutcomeId: id,
    supersedesOutcomeId: null,
    revision: 0,
    subjectType: "signal",
    subjectId: "sig_abc",
    assetId: "KR_005930",
    universeId: "KOSPI_SAMPLE",
    signalId: "sig_abc",
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

describe("outcome-memory-compressor", () => {
  it("should compress empty records list gracefully", () => {
    const summary = compressOutcomeMemory([]);
    expect(summary.lessons).toContain("No observed outcome records available for compression.");
    expect(summary.evidenceGaps).toHaveLength(0);
  });

  it("should aggregate lessons and adjustments correctly", () => {
    const mockRecords: SignalOutcomeJournalRecord[] = [
      makeRecord({
        id: "out_1",
        subjectId: "sig_abc",
        assetId: "KR_005930",
        observedForwardReturn: 0.10,
        marketBenchmarkReturn: 0.02,
        marketExcessReturn: 0.08,
        outcomeStatus: "observed",
        lesson: "Outperformed index.",
        confidenceAdjustment: "not_applicable",
        observedAt: new Date().toISOString(),
      }),
      makeRecord({
        id: "out_2",
        subjectId: "sig_xyz",
        assetId: "US_AAPL",
        observedForwardReturn: null,
        outcomeStatus: "insufficient_data",
        lesson: "No bars.",
        observedAt: new Date().toISOString(),
      }),
    ];

    const summary = compressOutcomeMemory(mockRecords);
    expect(summary.lessons).toHaveLength(2); // 1 summary text + 1 item detail lesson
    expect(summary.lessons[0]).toContain("1 outperformed");
    expect(summary.lessons[1]).toContain("[sig_abc] Outperformed index.");
    expect(summary.confidenceAdjustments["sig_abc"]).toBe("not_applicable");
    expect(summary.evidenceGaps).toHaveLength(1);
    expect(summary.evidenceGaps[0]).toContain('Missing data for subject "sig_xyz"');
  });
});

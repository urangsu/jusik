import { describe, it, expect } from "vitest";
import { compressOutcomeMemory } from "./outcome-memory-compressor";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

describe("outcome-memory-compressor", () => {
  it("should compress empty records list gracefully", () => {
    const summary = compressOutcomeMemory([]);
    expect(summary.lessons).toContain("No observed outcome records available for compression.");
    expect(summary.evidenceGaps).toHaveLength(0);
  });

  it("should aggregate lessons and adjustments correctly", () => {
    const mockRecords: SignalOutcomeJournalRecord[] = [
      {
        id: "out_1",
        subjectType: "signal",
        subjectId: "sig_abc",
        assetId: "AAPL",
        signalId: "sig_abc",
        strategyId: null,
        horizon: "forward_20d",
        observedForwardReturn: 0.10,
        benchmarkReturn: 0.02,
        alphaReturn: 0.08,
        initialWarnings: [],
        finalWarnings: [],
        outcomeStatus: "observed",
        lesson: "Outperformed index.",
        confidenceAdjustment: "increase",
        evidencePackIds: [],
        benchmarkSourceRef: null,
        createdAt: new Date().toISOString(),
        observedAt: new Date().toISOString(),
      },
      {
        id: "out_2",
        subjectType: "signal",
        subjectId: "sig_xyz",
        assetId: "MSFT",
        signalId: "sig_xyz",
        strategyId: null,
        horizon: "forward_20d",
        observedForwardReturn: null,
        benchmarkReturn: null,
        alphaReturn: null,
        initialWarnings: [],
        finalWarnings: [],
        outcomeStatus: "insufficient_data",
        lesson: "No bars.",
        confidenceAdjustment: "not_applicable",
        evidencePackIds: [],
        benchmarkSourceRef: null,
        createdAt: new Date().toISOString(),
        observedAt: new Date().toISOString(),
      },
    ];

    const summary = compressOutcomeMemory(mockRecords);
    expect(summary.lessons).toHaveLength(2); // 1 summary text + 1 item detail lesson
    expect(summary.lessons[0]).toContain("1 outperformed");
    expect(summary.lessons[1]).toContain("[sig_abc] Outperformed index.");
    expect(summary.confidenceAdjustments["sig_abc"]).toBe("increase");
    expect(summary.evidenceGaps).toHaveLength(1);
    expect(summary.evidenceGaps[0]).toContain("Missing data for subject \"sig_xyz\"");
  });
});

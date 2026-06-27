import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPendingOutcomeRecord, observeOutcome } from "./signal-outcome-observer";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";

vi.mock("../factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: vi.fn(),
}));

vi.mock("./signal-outcome-journal-store", () => {
  const store: Record<string, any> = {};
  return {
    saveOutcomeRecord: vi.fn(async (record) => {
      store[record.id] = record;
    }),
    getOutcomeRecord: vi.fn(async (id) => store[id] || null),
    listOutcomeRecords: vi.fn(async () => Object.values(store)),
  };
});

describe("signal-outcome-observer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a pending outcome record correctly", async () => {
    const record = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sig_abc",
      assetId: "AAPL",
      signalId: "sig_abc",
      horizon: "forward_20d",
    });

    expect(record.outcomeStatus).toBe("pending");
    expect(record.horizon).toBe("forward_20d");
    expect(record.observedForwardReturn).toBeNull();
  });

  it("observes return and alpha relative to benchmark", async () => {
    // Mock 25 bars so that forward_20d is calculable (25 close prices: base bar 4 close=100, last bar close=110)
    const mockBars = Array.from({ length: 25 }, (_, i) => ({
      assetId: "AAPL",
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high: 105,
      low: 95,
      close: i === 4 ? 100 : i === 24 ? 110 : 105, // base close=100 (bars[4]), latest close=110 (bars[24])
      volume: 1000,
    }));

    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: mockBars,
      status: "cached",
      source: "Mock Provider",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    });

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sig_success",
      assetId: "AAPL",
      horizon: "forward_20d",
    });

    const observed = await observeOutcome(pending.id);
    expect(observed.outcomeStatus).toBe("observed");
    // Return: (110 - 100) / 100 = 0.10 (10%)
    expect(observed.observedForwardReturn).toBeCloseTo(0.10);
    // Benchmark return is also 0.10 since index uses same mockBars
    expect(observed.benchmarkReturn).toBeCloseTo(0.10);
    expect(observed.alphaReturn).toBeCloseTo(0.00);
    expect(observed.confidenceAdjustment).toBe("unchanged");
  });

  it("handles insufficient data gracefully by setting status", async () => {
    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: [], // No bars
      status: "insufficient_data",
      source: "Mock Provider",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
    });

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sig_poor",
      assetId: "AAPL",
      horizon: "forward_20d",
    });

    const observed = await observeOutcome(pending.id);
    expect(observed.outcomeStatus).toBe("insufficient_data");
    expect(observed.observedForwardReturn).toBeNull();
  });

  it("handles missing benchmark gracefully by setting benchmarkReturn and alphaReturn to null and warning", async () => {
    const mockBars = Array.from({ length: 25 }, (_, i) => ({
      assetId: "AAPL",
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high: 105,
      low: 95,
      close: i === 4 ? 100 : i === 24 ? 110 : 105,
      volume: 1000,
    }));

    vi.mocked(loadOhlcvHistory).mockImplementation(async (universeId, assetId) => {
      if (assetId === "AAPL") {
        return {
          value: mockBars,
          status: "cached",
          source: "Mock",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
        };
      }
      throw new Error("Benchmark file not found");
    });

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sig_nobench",
      assetId: "AAPL",
      horizon: "forward_20d",
    });

    const observed = await observeOutcome(pending.id);
    expect(observed.outcomeStatus).toBe("observed");
    expect(observed.observedForwardReturn).toBeCloseTo(0.10);
    expect(observed.benchmarkReturn).toBeNull();
    expect(observed.alphaReturn).toBeNull();
    expect(observed.finalWarnings).toContain("benchmark_data_missing");
    expect(observed.confidenceAdjustment).toBe("not_applicable");
  });
});

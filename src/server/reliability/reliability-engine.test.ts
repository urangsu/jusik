import { describe, expect, it, vi, beforeEach } from "vitest";
import { calculateSignalReliability } from "./reliability-engine";
import { loadOhlcvHistory } from "../../server/factors/ohlcv-history-loader";
import { saveReliabilitySummary } from "./reliability-store";

vi.mock("../../server/factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: vi.fn(),
}));

vi.mock("./reliability-store", () => ({
  saveReliabilitySummary: vi.fn().mockResolvedValue(undefined),
}));

describe("calculateSignalReliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes processing even if there are empty constituents", async () => {
    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: null,
      status: "insufficient_data",
      source: "Local Filesystem",
      sourceTier: "personal_fallback",
      warnings: ["unofficial"],
      updatedAt: null,
    });

    const summary = await calculateSignalReliability({
      universeId: "KOSPI_SAMPLE",
      horizons: ["1w", "1m"],
    });

    expect(summary.records.length).toBeGreaterThan(0);
    expect(summary.records[0].sampleSize).toBe(0);
    expect(saveReliabilitySummary).toHaveBeenCalled();
  });

  it("handles constituent price bars and executes indicator calculator", async () => {
    // Return 30 bars so indexing starts and signals can be calculated
    const mockBars = Array.from({ length: 30 }, (_, i) => ({
      assetId: "A1",
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      open: 1000 + i * 10,
      high: 1020 + i * 10,
      low: 990 + i * 10,
      close: 1010 + i * 10,
      volume: 10000 + i * 100,
    }));

    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: mockBars,
      status: "cached",
      source: "Local Filesystem",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: "2026-06-17T12:00:00Z",
    });

    const summary = await calculateSignalReliability({
      universeId: "KOSPI_SAMPLE",
      horizons: ["1w"],
    });

    expect(summary.records.length).toBeGreaterThan(0);
    expect(saveReliabilitySummary).toHaveBeenCalled();
  });
});

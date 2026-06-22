import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockLoadOhlcvHistory = vi.fn();
vi.mock("@/server/factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: (uni: string, asset: string) => mockLoadOhlcvHistory(uni, asset),
}));

vi.mock("@/domain/universe/market-universe", () => ({
  KOSPI_SAMPLE_CONSTITUENTS: [{ assetId: "005930" }],
  SP500_SAMPLE_CONSTITUENTS: [],
}));

import { loadSignalScoreSeries } from "./signal-score-series-loader";

describe("SignalScoreSeriesLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate and load signal score series for constituents without fake scores", async () => {
    mockLoadOhlcvHistory.mockResolvedValue({
      status: "ok",
      sourceTier: "official",
      value: [
        { assetId: "005930", date: "2024-01-02", open: 100, high: 105, low: 98, close: 102, volume: 1000 },
        { assetId: "005930", date: "2024-01-03", open: 102, high: 108, low: 101, close: 107, volume: 1500 },
      ],
    });

    const series = await loadSignalScoreSeries({
      universeId: "KOSPI_SAMPLE",
      signalId: "momentum_return",
    });

    expect(series.length).toBe(2);
    expect(series[0].assetId).toBe("005930");
    expect(series[0].signalId).toBe("momentum_return");
    expect(series[0].sourceTier).toBe("official");
    expect(series[0].warnings).toEqual([]);

    // Check we filtered by date
    const filtered = await loadSignalScoreSeries({
      universeId: "KOSPI_SAMPLE",
      signalId: "momentum_return",
      startDate: "2024-01-03",
    });
    expect(filtered.length).toBe(1);
    expect(filtered[0].date).toBe("2024-01-03");
  });

  it("should append personal_fallback_used warnings for fallback data source", async () => {
    mockLoadOhlcvHistory.mockResolvedValue({
      status: "ok",
      sourceTier: "personal_fallback",
      value: [
        { assetId: "005930", date: "2024-01-02", open: 100, high: 105, low: 98, close: 102, volume: 1000 },
      ],
    });

    const series = await loadSignalScoreSeries({
      universeId: "KOSPI_SAMPLE",
      signalId: "momentum_return",
    });

    expect(series.length).toBe(1);
    expect(series[0].sourceTier).toBe("personal_fallback");
    expect(series[0].warnings).toContain("personal_fallback_used");
  });
});

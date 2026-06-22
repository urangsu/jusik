import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ohlcv-history-loader
const mockLoadOhlcvHistory = vi.fn();
vi.mock("@/server/factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: (uni: string, asset: string) => mockLoadOhlcvHistory(uni, asset),
}));

import { loadForwardReturnSeries } from "./forward-return-series-loader";

describe("ForwardReturnSeriesLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate forward returns using prices strictly after the signal date", async () => {
    mockLoadOhlcvHistory.mockResolvedValue({
      status: "ok",
      sourceTier: "official",
      value: [
        { assetId: "005930", date: "2024-01-02", open: 100, close: 100 }, // idx 0: signal date
        { assetId: "005930", date: "2024-01-03", open: 105, close: 105 }, // idx 1: entry date
        { assetId: "005930", date: "2024-01-04", open: 106, close: 106 }, // idx 2
        { assetId: "005930", date: "2024-01-05", open: 107, close: 107 }, // idx 3
        { assetId: "005930", date: "2024-01-08", open: 108, close: 108 }, // idx 4
        { assetId: "005930", date: "2024-01-09", open: 109, close: 109 }, // idx 5
        { assetId: "005930", date: "2024-01-10", open: 110, close: 110 }, // idx 6: exit date for 1w (idx 1 + 5 = 6)
      ],
    });

    const results = await loadForwardReturnSeries({
      universeId: "KOSPI_SAMPLE",
      horizon: "1w",
      dates: ["2024-01-02"],
      assetIds: ["005930"],
    });

    expect(results.length).toBe(1);
    expect(results[0].date).toBe("2024-01-02");
    expect(results[0].forwardReturn).toBe((110 - 105) / 105);
    expect(results[0].warnings).toEqual([]);
  });

  it("should return null forwardReturn with price_data_missing warning if out of bounds", async () => {
    mockLoadOhlcvHistory.mockResolvedValue({
      status: "ok",
      sourceTier: "official",
      value: [
        { assetId: "005930", date: "2024-01-02", open: 100, close: 100 },
        { assetId: "005930", date: "2024-01-03", open: 105, close: 105 },
      ],
    });

    const results = await loadForwardReturnSeries({
      universeId: "KOSPI_SAMPLE",
      horizon: "1w",
      dates: ["2024-01-02"],
      assetIds: ["005930"],
    });

    expect(results.length).toBe(1);
    expect(results[0].forwardReturn).toBeNull();
    expect(results[0].warnings).toContain("price_data_missing");
  });
});

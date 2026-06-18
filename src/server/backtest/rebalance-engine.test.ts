import { describe, it, expect, vi, beforeEach } from "vitest";
import { selectMomentumTopN } from "./rebalance-engine";

vi.mock("@/server/factors/factor-store", () => ({
  getFactorValues: vi.fn(),
}));

vi.mock("@/server/factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: vi.fn(),
}));

import { getFactorValues } from "@/server/factors/factor-store";
import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";

const mockedGetFactorValues = vi.mocked(getFactorValues);
const mockedLoadOhlcvHistory = vi.mocked(loadOhlcvHistory);

describe("selectMomentumTopN", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes signalScore and rank on selected positions", async () => {
    mockedGetFactorValues.mockResolvedValue([
      {
        assetId: "KR:005930",
        factorId: "momentum",
        rawValue: 90,
        dataAvailableAt: "2025-01-10",
        dataStatus: "cached",
        sourceIds: ["yfinance"],
      },
      {
        assetId: "KR:000660",
        factorId: "momentum",
        rawValue: 80,
        dataAvailableAt: "2025-01-10",
        dataStatus: "cached",
        sourceIds: ["yfinance"],
      },
      {
        assetId: "KR:035420",
        factorId: "momentum",
        rawValue: 70,
        dataAvailableAt: "2025-01-10",
        dataStatus: "cached",
        sourceIds: ["yfinance"],
      },
    ] as any);

    mockedLoadOhlcvHistory.mockResolvedValue({
      value: [{ date: "2025-01-11", close: 100, open: 99, high: 101, low: 98, volume: 1000 }],
      status: "cached",
      source: "test",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
    } as any);

    const positions = await selectMomentumTopN({
      universeId: "KOSPI_SAMPLE",
      asOfDate: "2025-01-10",
      entryDate: "2025-01-11",
      maxPositions: 2,
      minScore: 0,
      allowPersonalFallback: true,
    });

    expect(positions).toHaveLength(2);
    expect(positions[0].rank).toBe(1);
    expect(positions[0].signalScore).toBe(90);
    expect(positions[1].rank).toBe(2);
    expect(positions[1].signalScore).toBe(80);
    expect(positions[0].factorId).toBe("momentum_v1");
  });
});

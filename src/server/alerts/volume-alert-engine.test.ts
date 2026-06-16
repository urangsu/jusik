import { vi, describe, it, expect, beforeEach } from "vitest";
import { volumeAlertEngine } from "./volume-alert-engine";
import { marketDataService } from "../services/market-data-service";

vi.mock("../services/market-data-service", () => {
  return {
    marketDataService: {
      getOhlcv: vi.fn(),
    },
  };
});

describe("VolumeAlertEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger when volume exceeds average by threshold z-score", async () => {
    const candles = Array.from({ length: 65 }, (_, i) => ({
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 1000,
      high: 1001,
      low: 999,
      close: 1000,
      volume: 10000, // steady volume
      source: "Mock Provider",
      dataVersionId: "v1",
      assetId: "KR:005930",
      market: "KR" as const,
    }));

    // Make the last volume abnormal
    candles[64].volume = 50000; // 5x volume spike

    (marketDataService.getOhlcv as any).mockResolvedValue({
      status: "real_time",
      source: "KIS Open API",
      sourceTier: "official",
      value: { candles },
      warnings: [],
      updatedAt: "2026-06-17T00:00:00Z",
    });

    const result = await volumeAlertEngine.evaluate({
      symbol: "005930",
      region: "KR",
      condition: {
        kind: "volume_zscore",
        baselineWindow: 60,
        thresholdZ: 2.5,
        minVolumeMultiplier: 2.0,
      },
      allowPersonalFallback: false,
    });

    expect(result.triggered).toBe(true);
    expect(result.zScore).toBeGreaterThan(2.5);
    expect(result.volume).toBe(50000);
  });

  it("should veto if volume standard deviation is 0", async () => {
    const candles = Array.from({ length: 65 }, (_, i) => ({
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 1000,
      high: 1001,
      low: 999,
      close: 1000,
      volume: 10000, // zero standard deviation
      source: "Mock Provider",
      dataVersionId: "v1",
      assetId: "KR:005930",
      market: "KR" as const,
    }));

    (marketDataService.getOhlcv as any).mockResolvedValue({
      status: "real_time",
      source: "KIS Open API",
      sourceTier: "official",
      value: { candles },
      warnings: [],
      updatedAt: "2026-06-17T00:00:00Z",
    });

    const result = await volumeAlertEngine.evaluate({
      symbol: "005930",
      region: "KR",
      condition: {
        kind: "volume_zscore",
        baselineWindow: 60,
        thresholdZ: 2.5,
        minVolumeMultiplier: 2.0,
      },
      allowPersonalFallback: false,
    });

    expect(result.triggered).toBe(false);
    expect(result.vetoReason).toBe("insufficient_volume_baseline");
  });
});

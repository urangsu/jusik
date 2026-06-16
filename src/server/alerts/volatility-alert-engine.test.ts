import { vi, describe, it, expect, beforeEach } from "vitest";
import { volatilityAlertEngine } from "./volatility-alert-engine";
import { marketDataService } from "../services/market-data-service";

vi.mock("../services/market-data-service", () => {
  return {
    marketDataService: {
      getOhlcv: vi.fn(),
    },
  };
});

describe("VolatilityAlertEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger an alert when return z-score exceeds threshold and meets min return", async () => {
    // Generate mock candles: constant returns except the last one
    const candles = Array.from({ length: 65 }, (_, i) => ({
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 1000 + i * 2,
      high: 1000 + i * 2 + 1,
      low: 1000 + i * 2 - 1,
      // close: slowly increasing to create standard return baseline
      close: 1000 + i * 2,
      volume: 10000,
      source: "Mock Provider",
      dataVersionId: "v1",
      assetId: "KR:005930",
      market: "KR" as const,
    }));

    // Make the last return exceptionally large (abnormal return)
    candles[64].close = candles[63].close * 1.1; // +10% return

    (marketDataService.getOhlcv as any).mockResolvedValue({
      status: "real_time",
      source: "KIS Open API",
      sourceTier: "official",
      value: { candles },
      warnings: [],
      updatedAt: "2026-06-17T00:00:00Z",
    });

    const result = await volatilityAlertEngine.evaluate({
      symbol: "005930",
      region: "KR",
      condition: {
        kind: "return_zscore",
        returnWindow: "1D",
        baselineWindow: 60,
        thresholdAbsZ: 2.0,
        minAbsReturnPercent: 3.0,
      },
      allowPersonalFallback: false,
    });

    expect(result.triggered).toBe(true);
    expect(result.zScore).toBeGreaterThan(2.0);
    expect(result.returnPercent).toBeCloseTo(10.0);
  });

  it("should veto the alert if return is below minAbsReturnPercent even if z-score is high", async () => {
    // Highly stable stock: returns are very small (e.g. 0.01%), so a 0.5% return has high z-score but is tiny
    const candles = Array.from({ length: 65 }, (_, i) => ({
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 1000,
      high: 1001,
      low: 999,
      close: 1000 + (i % 2 === 0 ? 0.1 : -0.1), // standard deviation is tiny (around 0.02%)
      volume: 10000,
      source: "Mock Provider",
      dataVersionId: "v1",
      assetId: "KR:005930",
      market: "KR" as const,
    }));

    candles[64].close = 1008; // 0.8% return (very high z-score, but below 3% min return limit)

    (marketDataService.getOhlcv as any).mockResolvedValue({
      status: "real_time",
      source: "KIS Open API",
      sourceTier: "official",
      value: { candles },
      warnings: [],
      updatedAt: "2026-06-17T00:00:00Z",
    });

    const result = await volatilityAlertEngine.evaluate({
      symbol: "005930",
      region: "KR",
      condition: {
        kind: "return_zscore",
        returnWindow: "1D",
        baselineWindow: 60,
        thresholdAbsZ: 2.0,
        minAbsReturnPercent: 3.0,
      },
      allowPersonalFallback: false,
    });

    expect(result.triggered).toBe(false);
  });

  it("should veto if standard deviation is 0", async () => {
    // Completely flat line (variance = 0)
    const candles = Array.from({ length: 65 }, (_, i) => ({
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 1000,
      high: 1000,
      low: 1000,
      close: 1000,
      volume: 10000,
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

    const result = await volatilityAlertEngine.evaluate({
      symbol: "005930",
      region: "KR",
      condition: {
        kind: "return_zscore",
        returnWindow: "1D",
        baselineWindow: 60,
        thresholdAbsZ: 2.0,
        minAbsReturnPercent: 3.0,
      },
      allowPersonalFallback: false,
    });

    expect(result.triggered).toBe(false);
    expect(result.vetoReason).toBe("insufficient_volatility_baseline");
  });

  it("should veto if history is insufficient", async () => {
    // Only 10 candles
    const candles = Array.from({ length: 10 }, (_, i) => ({
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 1000,
      high: 1001,
      low: 999,
      close: 1000 + i,
      volume: 10000,
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

    const result = await volatilityAlertEngine.evaluate({
      symbol: "005930",
      region: "KR",
      condition: {
        kind: "return_zscore",
        returnWindow: "1D",
        baselineWindow: 60,
        thresholdAbsZ: 2.0,
        minAbsReturnPercent: 3.0,
      },
      allowPersonalFallback: false,
    });

    expect(result.triggered).toBe(false);
    expect(result.vetoReason).toBe("insufficient_history");
  });

  it("should veto personal fallback if not explicitly allowed", async () => {
    const candles = Array.from({ length: 65 }, (_, i) => ({
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 1000 + i * 2,
      high: 1000 + i * 2 + 1,
      low: 1000 + i * 2 - 1,
      close: 1000 + i * 2,
      volume: 10000,
      source: "yfinance",
      dataVersionId: "v1",
      assetId: "KR:005930",
      market: "KR" as const,
    }));
    candles[64].close = candles[63].close * 1.1;

    (marketDataService.getOhlcv as any).mockResolvedValue({
      status: "stale",
      source: "yfinance_personal",
      sourceTier: "personal_fallback",
      value: { candles },
      warnings: ["Personal fallback warning"],
      updatedAt: "2026-06-17T00:00:00Z",
    });

    const result = await volatilityAlertEngine.evaluate({
      symbol: "005930",
      region: "KR",
      condition: {
        kind: "return_zscore",
        returnWindow: "1D",
        baselineWindow: 60,
        thresholdAbsZ: 2.0,
        minAbsReturnPercent: 3.0,
      },
      allowPersonalFallback: false, // Disallowed
    });

    expect(result.triggered).toBe(false);
    expect(result.vetoReason).toBe("personal_fallback_not_allowed");
  });

  it("should trigger if personal fallback is explicitly allowed, keeping the source details", async () => {
    const candles = Array.from({ length: 65 }, (_, i) => ({
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 1000 + i * 2,
      high: 1000 + i * 2 + 1,
      low: 1000 + i * 2 - 1,
      close: 1000 + i * 2,
      volume: 10000,
      source: "yfinance",
      dataVersionId: "v1",
      assetId: "KR:005930",
      market: "KR" as const,
    }));
    candles[64].close = candles[63].close * 1.1;

    (marketDataService.getOhlcv as any).mockResolvedValue({
      status: "stale",
      source: "yfinance_personal",
      sourceTier: "personal_fallback",
      value: { candles },
      warnings: ["Personal fallback warning"],
      updatedAt: "2026-06-17T00:00:00Z",
    });

    const result = await volatilityAlertEngine.evaluate({
      symbol: "005930",
      region: "KR",
      condition: {
        kind: "return_zscore",
        returnWindow: "1D",
        baselineWindow: 60,
        thresholdAbsZ: 2.0,
        minAbsReturnPercent: 3.0,
      },
      allowPersonalFallback: true, // Allowed
    });

    expect(result.triggered).toBe(true);
    expect(result.sourceTier).toBe("personal_fallback");
  });
});

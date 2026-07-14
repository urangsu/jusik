import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withMarketDataRuntimeGate } from "../services/market-data-runtime-wrapper";
import { runWithProviderRuntimeGate } from "./provider-runtime-gate";
import { getAssetsOfUniverse } from "../signals/signal-stability-service";
import { strategySuitabilityService } from "../strategy/strategy-suitability-service";
import { getSignalHistory } from "../signals/signal-history-store";

vi.mock("../strategy/strategy-parameter-hash", () => ({
  calculateStrategyParameterHash: vi.fn().mockReturnValue("mock_hash"),
}));

vi.mock("../signals/signal-history-store", () => ({
  getSignalHistory: vi.fn(),
}));

describe("Provider Contract and Integration Checks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should create distinct cache keys for KIS vs Finnhub to prevent collision", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      value: { price: 100 },
      status: "real_time",
      source: "test",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-07-01",
    });

    const cacheStore = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    };

    // 1. KIS Quote Cache Key
    await withMarketDataRuntimeGate({
      providerId: "kis",
      market: "KR",
      assetId: "KR_005930",
      symbol: "005930",
      capability: "quote",
      cacheStore,
      fetcher,
    });

    expect(cacheStore.put).toHaveBeenCalledWith(
      "market-data:kis:quote:KR:KR_005930:005930",
      expect.any(Object),
      expect.any(String)
    );

    // 2. Finnhub Quote Cache Key
    await withMarketDataRuntimeGate({
      providerId: "finnhub_free",
      market: "US",
      assetId: "US_AAPL",
      symbol: "AAPL",
      capability: "quote",
      cacheStore,
      fetcher,
    });

    expect(cacheStore.put).toHaveBeenCalledWith(
      "market-data:finnhub_free:quote:US:US_AAPL:AAPL",
      expect.any(Object),
      expect.any(String)
    );

    // 3. KIS OHLCV Cache Key (with range/interval)
    await withMarketDataRuntimeGate({
      providerId: "kis",
      market: "KR",
      assetId: "KR_005930",
      symbol: "005930",
      capability: "ohlcv",
      range: "6M",
      interval: "1D",
      cacheStore,
      fetcher,
    });

    expect(cacheStore.put).toHaveBeenCalledWith(
      "market-data:kis:ohlcv:KR:KR_005930:005930:6M:1D",
      expect.any(Object),
      expect.any(String)
    );
  });

  it("should prevent caching when response is rate_limited, error, or value is null", async () => {
    const cacheStore = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    };

    const policy = {
      providerId: "kis",
      cacheTtlMs: 60000,
      staleAllowed: false,
      staleTtlMs: 0,
      maxRetries: 0,
      retryableStatuses: [],
    } as any;

    // case 1: rate_limited status
    await runWithProviderRuntimeGate({
      cacheKey: "test_key",
      policy,
      cacheStore,
      fetcher: async () => ({
        value: { price: 100 },
        status: "rate_limited",
        source: "test",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      }),
    });
    expect(cacheStore.put).not.toHaveBeenCalled();

    // case 2: error status
    await runWithProviderRuntimeGate({
      cacheKey: "test_key",
      policy,
      cacheStore,
      fetcher: async () => ({
        value: { price: 100 },
        status: "error",
        source: "test",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      }),
    });
    expect(cacheStore.put).not.toHaveBeenCalled();

    // case 3: null value
    await runWithProviderRuntimeGate({
      cacheKey: "test_key",
      policy,
      cacheStore,
      fetcher: async () => ({
        value: null,
        status: "real_time",
        source: "test",
        sourceTier: "official",
        warnings: [],
        updatedAt: "2026-07-01",
      }),
    });
    expect(cacheStore.put).not.toHaveBeenCalled();
  });

  it("should fail-closed in universe validation (getAssetsOfUniverse returns null on unknown)", () => {
    expect(getAssetsOfUniverse("KOSPI_SAMPLE")).not.toBeNull();
    expect(getAssetsOfUniverse("SP500_SAMPLE")).not.toBeNull();
    expect(getAssetsOfUniverse("UNKNOWN_UNIVERSE")).toBeNull();
  });

  it("should return universe_id_required if universeId is omitted, and unknown_universe_id if universe is unknown", async () => {
    vi.mocked(getSignalHistory).mockResolvedValue([]);

    // 1. Missing universeId
    const resMissing = await strategySuitabilityService.calculateSuitability(
      "KR:005930",
      "005930",
      "momentum",
      "2026-07-01",
      undefined
    );
    expect(resMissing.warnings).toContain("universe_id_required");
    expect(resMissing.suitabilityScore).toBeNull();
    expect(resMissing.adjustedLabel).toBe("insufficient_data");

    // 2. Unknown universeId
    const resUnknown = await strategySuitabilityService.calculateSuitability(
      "KR:005930",
      "005930",
      "momentum",
      "2026-07-01",
      "UNKNOWN_UNIVERSE_NAME"
    );
    expect(resUnknown.warnings).toContain("unknown_universe_id");
    expect(resUnknown.suitabilityScore).toBeNull();
    expect(resUnknown.adjustedLabel).toBe("insufficient_data");
  });

  it("should integrate market store files with technical factor calculations and signal history", async () => {
    const mockTechResult = {
      assetId: "KR:005930",
      date: "2026-07-01",
      ichimoku: { cloudPosition: "above", tkCross: "bullish_cross" },
      darvasBox: { breakout: "up", upperPercentage: 80, upperBound: 80000, lowerBound: 75000, boxAge: 5 },
      turtleChannel: { entryBreakout: "long", exitBreakout: "none", channelHigh: 82000, channelLow: 75000 },
      weinsteinStage: "stage_2_uptrend",
      maSlope: { slope5d: 0.05 },
      returnMomentum: { return20d: 0.1, return60d: 0.2, return120d: 0.3 },
      volatilityZScore: -0.5,
      volumeZScore: 1.2,
    };

    const { calculateAtomicSignals } = await import("../factors/atomic-signal-calculator");
    const signals = calculateAtomicSignals(mockTechResult as any, "real_time", 79000, 78000);

    expect(signals).toBeInstanceOf(Array);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].assetId).toBe("KR:005930");
    expect(signals[0].date).toBe("2026-07-01");
  });
});

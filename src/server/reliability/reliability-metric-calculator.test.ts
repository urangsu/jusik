import { describe, expect, it } from "vitest";
import { calculateReliabilityMetrics } from "./reliability-metric-calculator";
import { DEFAULT_RELIABILITY_CONFIG, ReliabilityConfig } from "../../domain/reliability/reliability-config";
import { ForwardReturnRecord } from "../../domain/backtest/forward-return";

describe("calculateReliabilityMetrics", () => {
  const mockConfig: ReliabilityConfig = {
    ...DEFAULT_RELIABILITY_CONFIG,
    universeId: "KOSPI_SAMPLE",
  };

  const sampleDate = "2026-06-16";

  it("returns insufficient early exit when sampleSize is 0", () => {
    const result = calculateReliabilityMetrics({
      signalId: "ichimoku",
      universeId: "KOSPI_SAMPLE",
      horizon: "1m",
      forwardReturns: [],
      config: mockConfig,
    });

    expect(result.sampleSize).toBe(0);
    expect(result.reliabilityLabel).toBe("insufficient_sample");
    expect(result.reliabilityScore).toBeNull();
    expect(result.weightMultiplier).toBeNull();
    expect(result.warnings).toContain("insufficient_sample");
  });

  it("properly filters signalId and horizon, and computes averages", () => {
    // We will build a list of 12 records (enough to satisfy minSampleForReliability = 10)
    const forwardReturns: ForwardReturnRecord[] = Array.from({ length: 12 }, (_, i) => ({
      id: `id_${i}`,
      assetId: `A${i}`,
      symbol: `SYM${i}`,
      signalDate: sampleDate,
      entryDate: "2026-06-17",
      horizon: "1m",
      signalId: "ichimoku",
      signalScore: i % 2 === 0 ? 1 : -1, // non-zero scores
      forwardReturn: 0.02,
      benchmarkReturn: 0.01,
      excessReturn: 0.01,
      adjustedForCosts: false,
      dataStatus: "cached",
      source: "yfinance",
      sourceTier: "personal_fallback",
      warnings: [],
      calculatedAt: "2026-06-17T12:00:00Z",
    }));

    // Add some noise records that should be filtered out
    forwardReturns.push({
      id: "other_noise",
      assetId: "OTHER",
      symbol: "OTHER",
      signalDate: sampleDate,
      entryDate: "2026-06-17",
      horizon: "1w", // wrong horizon
      signalId: "ichimoku",
      signalScore: 1,
      forwardReturn: 0.05,
      benchmarkReturn: 0.01,
      excessReturn: 0.04,
      adjustedForCosts: false,
      dataStatus: "cached",
      source: "yfinance",
      sourceTier: "personal_fallback",
      warnings: [],
      calculatedAt: "2026-06-17T12:00:00Z",
    });

    forwardReturns.push({
      id: "other_noise_2",
      assetId: "OTHER2",
      symbol: "OTHER2",
      signalDate: sampleDate,
      entryDate: "2026-06-17",
      horizon: "1m",
      signalId: "darvas", // wrong signalId
      signalScore: 1,
      forwardReturn: 0.05,
      benchmarkReturn: 0.01,
      excessReturn: 0.04,
      adjustedForCosts: false,
      dataStatus: "cached",
      source: "yfinance",
      sourceTier: "personal_fallback",
      warnings: [],
      calculatedAt: "2026-06-17T12:00:00Z",
    });

    const result = calculateReliabilityMetrics({
      signalId: "ichimoku",
      universeId: "KOSPI_SAMPLE",
      horizon: "1m",
      forwardReturns,
      config: mockConfig,
    });

    expect(result.sampleSize).toBe(12);
    expect(result.sampleStatus).toBe("usable"); // 12 is between 10 and 30
    expect(result.avgForwardReturn).toBe(0.02);
    expect(result.avgExcessReturn).toBe(0.01);
  });
});

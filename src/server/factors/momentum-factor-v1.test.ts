import { describe, it, expect } from "vitest";
import { calculateMomentumFactorV1 } from "./momentum-factor-v1";
import { AtomicSignal } from "@/domain/factors/atomic-signal";

describe("Momentum Factor v1 Aggregation", () => {
  const createMockSignals = (scores: Record<string, number | null>): AtomicSignal[] => {
    const horizons: Record<string, "short" | "medium" | "long"> = {
      momentum_turtle: "short",
      momentum_volume: "short",
      momentum_return: "short",
      momentum_ichimoku: "medium",
      momentum_darvas: "medium",
      momentum_ma_slope: "medium",
      momentum_weinstein: "long",
      momentum_volatility: "long",
    };

    return Object.entries(scores).map(([factorId, score]) => ({
      assetId: "US:AAPL",
      factorId,
      date: "2026-06-17",
      horizon: horizons[factorId] || "medium",
      score,
      signalLabel: score === null ? "insufficient_data" : score >= 30 ? "bullish" : score <= -30 ? "bearish" : "neutral",
      dataStatus: "cached",
      calculatedAt: "2026-06-17T00:00:00Z",
    }));
  };

  it("should aggregate scores with configured weights and compute horizons", () => {
    const scores = {
      momentum_return: 80,       // short, wt 0.20
      momentum_ma_slope: 40,     // medium, wt 0.15
      momentum_weinstein: 60,    // long, wt 0.15
      momentum_ichimoku: 50,     // medium, wt 0.15
      momentum_turtle: 20,       // short, wt 0.10
      momentum_darvas: 10,       // medium, wt 0.10
      momentum_volatility: 30,   // long, wt 0.075
      momentum_volume: 70,       // short, wt 0.075
    };

    const signals = createMockSignals(scores);
    const result = calculateMomentumFactorV1("US:AAPL", "SP500_SAMPLE", "2026-06-17", signals, "cached");

    expect(result.factorValue.rawValue).not.toBeNull();
    expect(result.factorValue.rawValue).toBeGreaterThan(0);
    expect(result.byHorizon.short.score).toBe(Math.round((80 + 20 + 70) / 3));
    expect(result.crossHorizonTension.detected).toBe(false);
  });

  it("should detect cross-horizon tension when short-term and long-term trends oppose", () => {
    const scores = {
      momentum_return: 80,       // short, wt 0.20 (bullish)
      momentum_ma_slope: 0,
      momentum_weinstein: -80,   // long, wt 0.15 (bearish)
      momentum_ichimoku: 0,
      momentum_turtle: 60,       // short (bullish)
      momentum_darvas: 0,
      momentum_volatility: -60,  // long (bearish)
      momentum_volume: 0,
    };

    const signals = createMockSignals(scores);
    const result = calculateMomentumFactorV1("US:AAPL", "SP500_SAMPLE", "2026-06-17", signals, "cached");

    expect(result.crossHorizonTension.detected).toBe(true);
    expect(result.crossHorizonTension.description).toContain("Cross-horizon tension detected");
  });
});

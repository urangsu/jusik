import { describe, it, expect } from "vitest";
import { calculateAtomicSignals } from "./atomic-signal-calculator";
import { TechnicalSignalsResult } from "./technical-signal-engine";

describe("Atomic Signal Calculator", () => {
  const mockTechResult: TechnicalSignalsResult = {
    assetId: "US:AAPL",
    date: "2026-06-17",
    ichimoku: {
      tenkanSen: 150,
      kijunSen: 145,
      senkouSpanA: 140,
      senkouSpanB: 138,
      chikouSpan: 152,
      cloudPosition: "above",
      tkCross: "bullish_cross",
    },
    darvasBox: { upperBound: 160, lowerBound: 140, breakout: "none", boxAge: 10 },
    turtleChannel: { entryBreakout: "none", exitBreakout: "none", channelHigh: 165, channelLow: 135 },
    weinsteinStage: "stage_2_uptrend",
    maSlope: { ma20: 145, slope5d: 0.01 },
    returnMomentum: { return20d: 0.05, return60d: 0.15, return120d: 0.25 },
    volatilityZScore: -1.2,
    volumeZScore: 2.5,
  };

  it("should standardise raw signals to [-100, 100] scores and set correct labels", () => {
    const signals = calculateAtomicSignals(mockTechResult, "cached", 155, 153);
    
    expect(signals).toHaveLength(8);

    // Ichimoku: position above (+50), tkCross bullish (+50) = 100 score
    const ichi = signals.find((s) => s.factorId === "momentum_ichimoku");
    expect(ichi).toBeDefined();
    expect(ichi?.score).toBe(100);
    expect(ichi?.signalLabel).toBe("bullish");

    // Weinstein: stage_2_uptrend = 80 score
    const weinstein = signals.find((s) => s.factorId === "momentum_weinstein");
    expect(weinstein).toBeDefined();
    expect(weinstein?.score).toBe(80);
    expect(weinstein?.signalLabel).toBe("bullish");

    // Volatility: zScore -1.2 -> score = -(-1.2) * 50 = 60
    const vol = signals.find((s) => s.factorId === "momentum_volatility");
    expect(vol).toBeDefined();
    expect(vol?.score).toBe(60);
    expect(vol?.signalLabel).toBe("bullish");
  });

  it("should output insufficient_data labels for null inputs", () => {
    const emptyResult: TechnicalSignalsResult = {
      assetId: "US:AAPL",
      date: "2026-06-17",
      ichimoku: { tenkanSen: null, kijunSen: null, senkouSpanA: null, senkouSpanB: null, chikouSpan: null, cloudPosition: "insufficient_data", tkCross: "none" },
      darvasBox: { upperBound: null, lowerBound: null, breakout: "none", boxAge: null },
      turtleChannel: { entryBreakout: "none", exitBreakout: "none", channelHigh: null, channelLow: null },
      weinsteinStage: "insufficient_data",
      maSlope: { ma20: null, slope5d: null },
      returnMomentum: { return20d: null, return60d: null, return120d: null },
      volatilityZScore: null,
      volumeZScore: null,
    };

    const signals = calculateAtomicSignals(emptyResult, "insufficient_data", 100, 100);
    for (const sig of signals) {
      expect(sig.score).toBeNull();
      expect(sig.signalLabel).toBe("insufficient_data");
    }
  });
});

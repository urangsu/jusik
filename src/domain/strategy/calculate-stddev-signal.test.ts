import { describe, expect, it } from "vitest";
import { calculateStdDevSignal } from "./calculate-stddev-signal";

const baseParams = {
  assetId: "KR:005930",
  symbol: "005930",
  date: "2026-06-16",
  window: 20 as const,
};

describe("calculateStdDevSignal", () => {
  it("returns insufficient_data when closes length is smaller than the window", () => {
    const signal = calculateStdDevSignal({ ...baseParams, closes: [100, 101, 102] });

    expect(signal.status).toBe("insufficient_data");
    expect(signal.zScore).toBeNull();
    expect(signal.signalStrength).toBeNull();
  });

  it("returns insufficient_data when standardDeviation is zero", () => {
    const signal = calculateStdDevSignal({ ...baseParams, closes: Array(20).fill(100) });

    expect(signal.status).toBe("insufficient_data");
    expect(signal.standardDeviation).toBeNull();
    expect(signal.zScore).toBeNull();
  });

  it("classifies zScore <= -2 as deep_oversold", () => {
    const signal = calculateStdDevSignal({
      ...baseParams,
      closes: [...Array(19).fill(100), 80],
    });

    expect(signal.position).toBe("deep_oversold");
    expect(signal.direction).toBe("mean_reversion_watch");
  });

  it("classifies zScore >= 2 as deep_overbought", () => {
    const signal = calculateStdDevSignal({
      ...baseParams,
      closes: [...Array(19).fill(100), 120],
    });

    expect(signal.position).toBe("deep_overbought");
    expect(signal.direction).toBe("overextension_risk");
  });

  it("returns insufficient_data when NaN or Infinity is present", () => {
    const signal = calculateStdDevSignal({
      ...baseParams,
      closes: [...Array(19).fill(100), Number.NaN],
    });

    expect(signal.status).toBe("insufficient_data");
    expect(signal.zScore).toBeNull();
  });

  it("does not replace failed calculation values with zero", () => {
    const signal = calculateStdDevSignal({ ...baseParams, closes: [Infinity] });

    expect(signal.lastPrice).toBeNull();
    expect(signal.movingAverage).toBeNull();
    expect(signal.standardDeviation).toBeNull();
    expect(signal.zScore).toBeNull();
    expect(signal.signalStrength).toBeNull();
  });
});

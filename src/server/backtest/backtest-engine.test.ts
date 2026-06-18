import { describe, it, expect } from "vitest";
import { calculateSpearmanIC } from "./backtest-ic-calculator";

describe("IC score linkage", () => {
  it("uses actual signalScore values instead of null scores", () => {
    const pairs = [
      { score: 90, forwardReturn: 0.05 },
      { score: 80, forwardReturn: 0.03 },
      { score: 70, forwardReturn: 0.02 },
      { score: 60, forwardReturn: 0.01 },
      { score: 50, forwardReturn: -0.01 },
    ];

    const result = calculateSpearmanIC(pairs);
    expect(result.validSampleSize).toBe(5);
    expect(result.ic).not.toBeNull();
  });

  it("excludes null or non-finite scores from IC calculation", () => {
    const pairs = [
      { score: 90, forwardReturn: 0.05 },
      { score: null, forwardReturn: 0.03 },
      { score: Number.NaN, forwardReturn: 0.02 },
      { score: 60, forwardReturn: 0.01 },
      { score: 50, forwardReturn: null },
      { score: 40, forwardReturn: 0.04 },
      { score: 30, forwardReturn: 0.03 },
      { score: 20, forwardReturn: 0.02 },
    ];

    const result = calculateSpearmanIC(pairs);
    expect(result.validSampleSize).toBe(5);
    expect(result.sampleSize).toBe(8);
  });
});

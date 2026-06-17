import { describe, it, expect } from "vitest";
import { calculateSpearmanIC } from "./backtest-ic-calculator";

describe("calculateSpearmanIC", () => {
  it("returns null when sample size < 5", () => {
    const pairs = [
      { score: 50, forwardReturn: 0.05 },
      { score: -20, forwardReturn: -0.02 },
    ];
    const result = calculateSpearmanIC(pairs);
    expect(result.ic).toBeNull();
    expect(result.rankIc).toBeNull();
    expect(result.hitRate).toBeNull();
  });

  it("returns null when all returns are null", () => {
    const pairs = Array.from({ length: 10 }, (_, i) => ({
      score: i * 10,
      forwardReturn: null,
    }));
    const result = calculateSpearmanIC(pairs);
    expect(result.ic).toBeNull();
  });

  it("calculates positive IC for perfectly correlated signal/return", () => {
    const pairs = [
      { score: 10, forwardReturn: 0.01 },
      { score: 20, forwardReturn: 0.02 },
      { score: 30, forwardReturn: 0.03 },
      { score: 40, forwardReturn: 0.04 },
      { score: 50, forwardReturn: 0.05 },
    ];
    const result = calculateSpearmanIC(pairs);
    expect(result.ic).not.toBeNull();
    expect(result.ic!).toBeCloseTo(1.0, 1);
  });

  it("calculates negative IC for perfectly anti-correlated signal/return", () => {
    const pairs = [
      { score: 50, forwardReturn: 0.01 },
      { score: 40, forwardReturn: 0.02 },
      { score: 30, forwardReturn: 0.03 },
      { score: 20, forwardReturn: 0.04 },
      { score: 10, forwardReturn: 0.05 },
    ];
    const result = calculateSpearmanIC(pairs);
    expect(result.ic).not.toBeNull();
    expect(result.ic!).toBeCloseTo(-1.0, 1);
  });

  it("calculates hit rate correctly", () => {
    // 4 correct, 1 wrong out of 5
    const pairs = [
      { score: 50, forwardReturn: 0.05 },   // correct
      { score: 30, forwardReturn: 0.03 },   // correct
      { score: -10, forwardReturn: -0.01 }, // correct
      { score: -30, forwardReturn: -0.03 }, // correct
      { score: 20, forwardReturn: -0.02 },  // wrong
    ];
    const result = calculateSpearmanIC(pairs);
    expect(result.hitRate).not.toBeNull();
    expect(result.hitRate!).toBeCloseTo(0.8, 1);
  });

  it("excludes null score/return pairs from calculation", () => {
    const pairs = [
      { score: 50, forwardReturn: 0.05 },
      { score: null, forwardReturn: 0.01 },   // excluded
      { score: 30, forwardReturn: null },      // excluded
      { score: 20, forwardReturn: 0.02 },
      { score: 10, forwardReturn: 0.01 },
      { score: 40, forwardReturn: 0.04 },
      { score: -10, forwardReturn: -0.01 },
    ];
    const result = calculateSpearmanIC(pairs);
    expect(result.validSampleSize).toBe(5);
    expect(result.sampleSize).toBe(7);
    expect(result.ic).not.toBeNull();
  });

  it("IC and rankIC are the same value", () => {
    const pairs = [
      { score: 10, forwardReturn: 0.01 },
      { score: 20, forwardReturn: 0.02 },
      { score: 30, forwardReturn: 0.03 },
      { score: 40, forwardReturn: 0.04 },
      { score: 50, forwardReturn: 0.05 },
    ];
    const result = calculateSpearmanIC(pairs);
    expect(result.ic).toBe(result.rankIc);
  });
});

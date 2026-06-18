import { describe, it, expect } from "vitest";
import {
  compoundPeriodReturns,
  calculateMaxDrawdownFromReturns,
} from "./return-metrics";

describe("compoundPeriodReturns", () => {
  it("returns null for an empty series", () => {
    expect(compoundPeriodReturns([])).toBeNull();
  });

  it("compounds period returns instead of summing them", () => {
    const total = compoundPeriodReturns([0.1, 0.1]);
    expect(total).not.toBe(0.2);
    expect(total!).toBeCloseTo(0.21, 5);
  });

  it("handles negative returns", () => {
    const total = compoundPeriodReturns([0.1, -0.05]);
    expect(total!).toBeCloseTo(0.045, 5);
  });
});

describe("calculateMaxDrawdownFromReturns", () => {
  it("returns null for an empty series", () => {
    expect(calculateMaxDrawdownFromReturns([])).toBeNull();
  });

  it("returns a negative drawdown from an equity curve", () => {
    const drawdown = calculateMaxDrawdownFromReturns([0.1, -0.2, 0.05]);
    expect(drawdown).not.toBeNull();
    expect(drawdown!).toBeLessThan(0);
  });
});

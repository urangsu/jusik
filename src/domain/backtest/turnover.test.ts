import { describe, it, expect } from "vitest";
import { calculateTurnover } from "./turnover";

describe("calculateTurnover", () => {
  it("returns null when there is no previous window", () => {
    expect(calculateTurnover(null, { A: 0.5, B: 0.5 })).toBeNull();
    expect(calculateTurnover(undefined, new Map([["A", 1]]))).toBeNull();
  });

  it("returns 0 when positions are unchanged", () => {
    const weights = { A: 0.5, B: 0.5 };
    expect(calculateTurnover(weights, weights)).toBe(0);
  });

  it("returns 1 when the portfolio is fully replaced", () => {
    const previous = { A: 0.5, B: 0.5 };
    const current = { C: 0.5, D: 0.5 };
    expect(calculateTurnover(previous, current)).toBe(1);
  });

  it("returns a value between 0 and 1 for partial replacement", () => {
    const previous = { A: 0.5, B: 0.5 };
    const current = { A: 0.5, C: 0.5 };
    const turnover = calculateTurnover(previous, current);
    expect(turnover).not.toBeNull();
    expect(turnover!).toBeGreaterThan(0);
    expect(turnover!).toBeLessThan(1);
    expect(turnover!).toBeCloseTo(0.5, 5);
  });
});

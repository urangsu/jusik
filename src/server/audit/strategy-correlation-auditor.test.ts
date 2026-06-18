import { describe, it, expect } from "vitest";
import {
  calculatePearsonCorrelation,
  auditStrategyCorrelation,
  auditAllStrategyCorrelations,
} from "@/server/audit/strategy-correlation-auditor";

describe("StrategyCorrelationAuditor", () => {
  it("should calculate Pearson correlation correctly", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [2, 4, 6, 8, 10]; // perfect positive correlation
    const r = calculatePearsonCorrelation(a, b);
    expect(r).toBe(1.0);
  });

  it("should return null for arrays shorter than 2", () => {
    const r = calculatePearsonCorrelation([1], [1]);
    expect(r).toBeNull();
  });

  it("should classify danger when |correlation| >= 0.75", () => {
    // Create highly correlated scores (length >= 30)
    const n = 30;
    const scoresA = Array.from({ length: n }, (_, i) => i * 0.01);
    const scoresB = Array.from({ length: n }, (_, i) => i * 0.01 + 0.001);

    const result = auditStrategyCorrelation("strategy_a", scoresA, "strategy_b", scoresB);
    expect(result.severity).toBe("danger");
    expect(result.strategyA).toBe("strategy_a");
    expect(result.strategyB).toBe("strategy_b");
    expect(result.sampleSize).toBe(n);
  });

  it("should classify insufficient_sample when sampleSize < 30", () => {
    const scoresA = [0.1, 0.2, 0.3];
    const scoresB = [0.1, 0.2, 0.3];
    const result = auditStrategyCorrelation("a", scoresA, "b", scoresB);
    expect(result.severity).toBe("insufficient_sample");
  });

  it("should generate all pairs in batch audit", () => {
    const strategies = [
      { id: "s1", scores: Array(30).fill(0.1) },
      { id: "s2", scores: Array(30).fill(0.2) },
      { id: "s3", scores: Array(30).fill(0.3) },
    ];
    const results = auditAllStrategyCorrelations(strategies);
    // 3 choose 2 = 3 pairs
    expect(results).toHaveLength(3);
    const pairs = results.map((r) => `${r.strategyA}/${r.strategyB}`);
    expect(pairs).toContain("s1/s2");
    expect(pairs).toContain("s1/s3");
    expect(pairs).toContain("s2/s3");
  });

  it("should include a diagnostic message in results", () => {
    const n = 30;
    const scoresA = Array.from({ length: n }, (_, i) => Math.sin(i));
    const scoresB = Array.from({ length: n }, (_, i) => Math.cos(i));
    const result = auditStrategyCorrelation("a", scoresA, "b", scoresB);
    expect(result.message).toBeTruthy();
    expect(typeof result.message).toBe("string");
  });
});

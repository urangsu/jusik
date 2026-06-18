import { describe, it, expect } from "vitest";
import { auditMarketExposure } from "@/server/audit/market-exposure-auditor";

describe("MarketExposureAuditor", () => {
  it("should return insufficient_data when observations < 10", () => {
    const result = auditMarketExposure({
      strategyId: "test_strategy",
      universeId: "KOSPI_SAMPLE",
      observations: [
        { strategyReturn: 0.01, benchmarkReturn: 0.01 },
        { strategyReturn: -0.01, benchmarkReturn: -0.01 },
      ],
    });
    expect(result.marketNeutralityAssessment).toBe("insufficient_data");
    expect(result.betaToBenchmark).toBeNull();
  });

  it("should classify high_beta when betaToBenchmark > 1.2", () => {
    // Strategy that moves 2x the benchmark → beta ≈ 2.0
    const n = 30;
    const observations = Array.from({ length: n }, (_, i) => ({
      strategyReturn: (i % 2 === 0 ? 0.02 : -0.02),
      benchmarkReturn: (i % 2 === 0 ? 0.01 : -0.01),
    }));
    const result = auditMarketExposure({
      strategyId: "high_beta_strategy",
      universeId: "KOSPI_SAMPLE",
      observations,
    });
    expect(result.betaToBenchmark).not.toBeNull();
    if (result.betaToBenchmark !== null) {
      expect(result.betaToBenchmark).toBeGreaterThan(1.2);
    }
    expect(result.warnings).toContain("high_market_beta");
    expect(result.marketNeutralityAssessment).toBe("high_beta");
  });

  it("should classify regime_dependency_high when riskOffReturn < -5%", () => {
    const n = 20;
    const base = Array.from({ length: n }, () => ({
      strategyReturn: 0.01,
      benchmarkReturn: 0.01,
    }));
    const riskOffObs = Array.from({ length: 10 }, () => ({
      strategyReturn: -0.08, // -8% → below -5% threshold
      benchmarkReturn: -0.03,
      regime: "risk_off",
    }));

    const result = auditMarketExposure({
      strategyId: "regime_dependent",
      universeId: "KOSPI_SAMPLE",
      observations: [...base, ...riskOffObs],
    });
    expect(result.riskOffReturn).not.toBeNull();
    if (result.riskOffReturn !== null) {
      expect(result.riskOffReturn).toBeLessThan(-0.05);
    }
    expect(result.warnings).toContain("regime_dependency_high");
  });

  it("should always include sample_universe_only warning", () => {
    const n = 15;
    const observations = Array.from({ length: n }, () => ({
      strategyReturn: 0.01,
      benchmarkReturn: 0.01,
    }));
    const result = auditMarketExposure({
      strategyId: "any_strategy",
      universeId: "SP500_SAMPLE",
      observations,
    });
    expect(result.warnings).toContain("sample_universe_only");
  });

  it("should not output trading recommendation strings", () => {
    const n = 20;
    const observations = Array.from({ length: n }, () => ({
      strategyReturn: 0.005,
      benchmarkReturn: 0.004,
    }));
    const result = auditMarketExposure({
      strategyId: "safe_strategy",
      universeId: "KOSPI_SAMPLE",
      observations,
    });

    // The result should not contain any trading recommendation
    const resultStr = JSON.stringify(result);
    const forbiddenTerms = ["매수", "매도", "추천", "buy", "sell", "order", "signal"];
    for (const term of forbiddenTerms) {
      expect(resultStr.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});

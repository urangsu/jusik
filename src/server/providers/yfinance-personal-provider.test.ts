import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { YfinancePersonalProvider } from "./yfinance-personal-provider";
import { validateStrategyEligibility, StrategyScore } from "@/domain/strategy/strategy-score";
import { DataEnvelope } from "@/domain/common/data-status";

describe("YfinancePersonalProvider Fallback Guardrails", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return personal_fallback tier and unofficial warning on quotes", async () => {
    process.env.ALLOW_PERSONAL_FALLBACK = "true";
    process.env.ENABLE_YFINANCE_PERSONAL = "true";

    const provider = new YfinancePersonalProvider();
    const res = await provider.getQuote("AAPL");

    expect(res.sourceTier).toBe("personal_fallback");
    expect(res.warnings).toContain("unofficial");
    expect(res.warnings).toContain("personal_use_only");
  });

  it("should veto strategy eligibility when backed purely by yfinance fallback data", () => {
    const mockScore: StrategyScore = {
      assetId: "US:AAPL",
      date: "2026-06-16",
      strategyId: "large_cap_momentum",
      score: 80,
      rank: 5,
      regime: "risk_on",
      eligible: true, // initially eligible
      vetoReasons: [],
      explanation: "수익률 호조",
      dataQualityScore: 100
    };

    const yfinanceDataEnvelope: DataEnvelope<number> = {
      value: 180,
      status: "cached",
      source: "yfinance",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: "2026-06-16T00:00:00Z"
    };

    // Run strategy validation using yfinance-only envelope
    const validated = validateStrategyEligibility(mockScore, [yfinanceDataEnvelope]);

    // Veto rules should make it ineligible
    expect(validated.eligible).toBe(false);
    expect(validated.vetoReasons).toContain("personal_fallback_data_veto");
  });
});

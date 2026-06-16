import { describe, it, expect } from "vitest";
import { validateStrategyEligibility, StrategyScore } from "./strategy-score";
import { DataEnvelope } from "../common/data-status";

describe("Strategy Score yfinance Veto Guard", () => {
  it("should veto eligibility when only personal_fallback data is provided", () => {
    const score: StrategyScore = {
      assetId: "KR:005930",
      date: "2026-06-16",
      strategyId: "wolcheon_pullback",
      score: 85,
      rank: 2,
      regime: "risk_on",
      eligible: true,
      vetoReasons: [],
      explanation: "Good price pullback signal",
      dataQualityScore: 100
    };

    const env: DataEnvelope<number> = {
      value: 72000,
      status: "cached",
      source: "yfinance",
      sourceTier: "personal_fallback",
      warnings: ["unofficial"],
      updatedAt: "2026-06-16T12:00:00Z"
    };

    const validated = validateStrategyEligibility(score, [env]);
    expect(validated.eligible).toBe(false);
    expect(validated.vetoReasons).toContain("personal_fallback_data_veto");
  });

  it("should NOT veto eligibility when official data is present", () => {
    const score: StrategyScore = {
      assetId: "KR:005930",
      date: "2026-06-16",
      strategyId: "wolcheon_pullback",
      score: 85,
      rank: 2,
      regime: "risk_on",
      eligible: true,
      vetoReasons: [],
      explanation: "Good price pullback signal",
      dataQualityScore: 100
    };

    const fallbackEnv: DataEnvelope<number> = {
      value: 72000,
      status: "cached",
      source: "yfinance",
      sourceTier: "personal_fallback",
      warnings: ["unofficial"],
      updatedAt: "2026-06-16T12:00:00Z"
    };

    const officialEnv: DataEnvelope<number> = {
      value: 72000,
      status: "cached",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-06-16T12:00:00Z"
    };

    const validated = validateStrategyEligibility(score, [fallbackEnv, officialEnv]);
    expect(validated.eligible).toBe(true);
    expect(validated.vetoReasons).not.toContain("personal_fallback_data_veto");
  });
});

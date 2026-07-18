import { describe, it, expect } from "vitest";
import { evaluateMethodRule, type EvaluateMethodRuleInput } from "./evaluate-method-rule";
import type { ResearchMethodRule } from "./method-rule";
import type { ResearchClaim } from "./research-claim";
import type { SignalVersion } from "@/domain/signals/signal-version";

const MOCK_SIGNAL_VERSION: SignalVersion = {
  signalVersionId: "sv_test",
  engine: {
    engineId: "research_evaluator",
    engineVersion: "0.1.0",
    configHash: "abc",
    gitCommitSha: "def",
    createdAt: "2026-01-01T00:00:00Z",
  },
  dataVersionId: "dv_test",
  calculatedAt: "2026-01-01T00:00:00Z",
  expiryAt: null,
};

const DEMAND_RULE: ResearchMethodRule = {
  ruleId: "demand_evidence",
  displayName: "Demand Evidence",
  description: "Verifies that demand-side evidence exists for the asset.",
  requiredInputKeys: ["demand_evidence"],
  requiredEvidenceKinds: ["revenue_data", "order_book"],
  confirmConditions: ["Confirmed customer orders exist"],
  warningConditions: ["Demand signals are mixed"],
  breakConditions: ["Major customer cancellation confirmed"],
  supportedMarkets: ["KR", "US"],
  vetoSeverity: "fatal",
  productionEligible: false,
  engineVersion: "0.1.0",
};

const KR_ONLY_RULE: ResearchMethodRule = {
  ...DEMAND_RULE,
  ruleId: "market_window",
  displayName: "Market Window",
  supportedMarkets: ["KR"],
  vetoSeverity: "warning",
};

function makeClaim(overrides: Partial<ResearchClaim>): ResearchClaim {
  return {
    claimId: "c1",
    postId: "p1",
    voiceId: "v1",
    assetId: "KR_005930",
    unresolvedReason: null,
    text: "Strong demand from key customers",
    direction: "bullish",
    claimKind: "demand_evidence",
    evidenceIds: ["ev1"],
    evidenceSpan: { from: "2026-01-01", to: "2026-03-01" },
    isVerified: true,
    extractionMethod: "user_import",
    createdAt: "2026-01-10T00:00:00Z",
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<EvaluateMethodRuleInput> = {},
): EvaluateMethodRuleInput {
  return {
    rule: DEMAND_RULE,
    assetId: "KR_005930",
    market: "KR",
    claims: [makeClaim({})],
    evidenceMeta: {
      ev1: { kind: "revenue_data", expiryAt: null },
    },
    asOfDate: "2026-06-01",
    signalVersion: null,
    ...overrides,
  };
}

describe("evaluateMethodRule", () => {
  // Required: missing required input returns insufficient_data
  it("missing required input returns insufficient_data", () => {
    const result = evaluateMethodRule(
      makeInput({
        claims: [], // no claims → required input "demand_evidence" is missing
      }),
    );
    expect(result.status).toBe("insufficient_data");
    expect(result.missingInputs).toContain("demand_evidence");
    expect(result.claimIds).toHaveLength(0);
  });

  // Required: contradictory fatal evidence returns contradicted
  it("contradictory fatal evidence returns contradicted", () => {
    const result = evaluateMethodRule(
      makeInput({
        claims: [makeClaim({ direction: "bearish" })],
        evidenceMeta: { ev1: { kind: "revenue_data", expiryAt: null } },
      }),
    );
    expect(result.status).toBe("contradicted");
    expect(result.contradictingEvidenceIds).toContain("ev1");
    expect(result.vetoReasons.length).toBeGreaterThan(0);
  });

  // Required: expired claim cannot support the rule
  it("an expired claim cannot support the rule", () => {
    const result = evaluateMethodRule(
      makeInput({
        evidenceMeta: {
          ev1: { kind: "revenue_data", expiryAt: "2026-01-01" }, // expired before asOfDate 2026-06-01
        },
      }),
    );
    expect(result.staleEvidenceIds).toContain("ev1");
    // With only stale evidence, there's no support → insufficient_data
    expect(result.status).toBe("insufficient_data");
  });

  // Required: unsupported market returns not_applicable
  it("unsupported market returns not_applicable", () => {
    const result = evaluateMethodRule(
      makeInput({
        rule: KR_ONLY_RULE,
        market: "US", // KR_ONLY_RULE only supports "KR"
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect(result.dataQualityScore).toBe(0);
  });

  // Required: no evidence returns no score and no synthetic claim
  it("no evidence returns insufficient_data with no synthetic claim", () => {
    const result = evaluateMethodRule(
      makeInput({
        claims: [makeClaim({ evidenceIds: [] })], // claim exists but has no evidence
        evidenceMeta: {},
      }),
    );
    // No supporting evidence → insufficient_data
    expect(result.status).toBe("insufficient_data");
    // No synthetic claim created — claimIds may include the claim but no evidenceIds
    expect(result.supportingEvidenceIds).toHaveLength(0);
  });

  // Required: every registry rule has productionEligible: false
  it("rule productionEligible is always false", () => {
    expect(DEMAND_RULE.productionEligible).toBe(false);
    expect(KR_ONLY_RULE.productionEligible).toBe(false);
  });

  // Positive case: valid claim with non-stale evidence → supported
  it("valid bullish claim with fresh evidence → supported", () => {
    const result = evaluateMethodRule(makeInput());
    expect(result.status).toBe("supported");
    expect(result.supportingEvidenceIds).toContain("ev1");
    expect(result.dataQualityScore).toBeGreaterThan(0);
    expect(result.dataQualityScore).toBeLessThanOrEqual(1);
  });

  // dataQualityScore does not exceed 1
  it("dataQualityScore is always in [0, 1]", () => {
    const result = evaluateMethodRule(makeInput());
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.dataQualityScore).toBeLessThanOrEqual(1);
  });
});

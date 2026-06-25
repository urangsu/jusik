import { describe, it, expect } from "vitest";
import { validateGroundedClaims } from "./grounded-claim-guard";
import { AiGroundedClaim } from "@/domain/ai/structured-ai-output";

describe("validateGroundedClaims", () => {
  const validBaseClaim: AiGroundedClaim = {
    id: "claim_1",
    text: "상관관계 계수가 기준치를 초과했습니다.",
    sourceType: "audit_finding",
    sourceId: "fc_123",
    source: "factor_correlation_auditor",
    status: "cached",
    updatedAt: "2026-06-25T12:00:00Z",
    warnings: [],
    riskLevel: "low",
  };

  it("should accept valid claim", () => {
    const res = validateGroundedClaims([validBaseClaim]);
    expect(res.valid).toBe(true);
    expect(res.rejectedClaimIds).toHaveLength(0);
  });

  it("should reject claim with missing sourceId", () => {
    const badClaim = { ...validBaseClaim, sourceId: "" };
    const res = validateGroundedClaims([badClaim]);
    expect(res.valid).toBe(false);
    expect(res.rejectedClaimIds).toContain("claim_1");
  });

  it("should reject claim with missing status", () => {
    const badClaim = { ...validBaseClaim, status: "" } as any;
    const res = validateGroundedClaims([badClaim]);
    expect(res.valid).toBe(false);
    expect(res.rejectedClaimIds).toContain("claim_1");
  });

  it("should reject claim with missing warnings", () => {
    const badClaim = { ...validBaseClaim, warnings: undefined } as any;
    const res = validateGroundedClaims([badClaim]);
    expect(res.valid).toBe(false);
    expect(res.rejectedClaimIds).toContain("claim_1");
  });

  it("should reject claim with undefined updatedAt", () => {
    const badClaim = { ...validBaseClaim } as any;
    delete badClaim.updatedAt;
    const res = validateGroundedClaims([badClaim]);
    expect(res.valid).toBe(false);
    expect(res.rejectedClaimIds).toContain("claim_1");
  });

  it("should allow claim with null updatedAt", () => {
    const okClaim = { ...validBaseClaim, updatedAt: null };
    const res = validateGroundedClaims([okClaim]);
    expect(res.valid).toBe(true);
  });

  it("should reject status error claim when riskLevel is low/medium", () => {
    const badClaim: AiGroundedClaim = {
      ...validBaseClaim,
      status: "error",
      riskLevel: "medium",
    };
    const res = validateGroundedClaims([badClaim]);
    expect(res.valid).toBe(false);
  });

  it("should accept status error claim when riskLevel is high/blocked", () => {
    const okClaim1: AiGroundedClaim = {
      ...validBaseClaim,
      status: "error",
      riskLevel: "high",
    };
    const okClaim2: AiGroundedClaim = {
      ...validBaseClaim,
      status: "error",
      riskLevel: "blocked",
    };
    const res1 = validateGroundedClaims([okClaim1]);
    const res2 = validateGroundedClaims([okClaim2]);
    expect(res1.valid).toBe(true);
    expect(res2.valid).toBe(true);
  });
});

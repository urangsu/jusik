import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { StructuredAiOutput } from "@/domain/ai/structured-ai-output";

describe("POST /api/ai/structured-output/validate", () => {
  const validBaseOutput: StructuredAiOutput = {
    id: "out_123",
    intent: "audit_finding_explanation",
    title: "감사 결과 진단 정보",
    summary: "검토용 분석 내용입니다.",
    claims: [
      {
        id: "c_1",
        text: "상관관계가 기준치인 0.8 이하입니다.",
        sourceType: "audit_finding",
        sourceId: "f_1",
        source: "finding_store",
        status: "cached",
        updatedAt: "2026-06-25T12:00:00Z",
        warnings: [],
        riskLevel: "low",
      },
    ],
    limitations: ["이 정보는 과거 시점의 검증 데이터입니다."],
    requiredDisclaimers: ["본 내용은 감사 Finding의 진단 설명이며 투자 지시가 아닙니다."],
    blockedTerms: [],
    isBlocked: false,
    blockReasons: [],
    generatedAt: "2026-06-25T12:00:00Z",
    engineVersion: "1.0.0",
  };

  it("should validate and return 200 for valid output", async () => {
    const req = new NextRequest("http://localhost/api/ai/structured-output/validate", {
      method: "POST",
      body: JSON.stringify(validBaseOutput),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.sourceTier).toBe("manual_import");
    expect(json.value.isBlocked).toBe(false);
  });

  it("should return isBlocked=true if forbidden wording is present", async () => {
    const badOutput = { ...validBaseOutput, summary: "이 종목은 매수 추천입니다." };
    const req = new NextRequest("http://localhost/api/ai/structured-output/validate", {
      method: "POST",
      body: JSON.stringify(badOutput),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.value.isBlocked).toBe(true);
    expect(json.value.blockedTerms).toContain("매수");
  });

  it("should fail with 400 when body is not an object", async () => {
    const req = new NextRequest("http://localhost/api/ai/structured-output/validate", {
      method: "POST",
      body: "not an object",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.status).toBe("error");
  });
});

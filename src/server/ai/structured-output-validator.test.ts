import { describe, it, expect } from "vitest";
import { validateStructuredAiOutput } from "./structured-output-validator";
import { StructuredAiOutput } from "@/domain/ai/structured-ai-output";

describe("validateStructuredAiOutput", () => {
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

  it("should accept a fully valid output", () => {
    const res = validateStructuredAiOutput(validBaseOutput);
    expect(res.isBlocked).toBe(false);
    expect(res.blockReasons).toHaveLength(0);
  });

  it("should block output containing forbidden words in text fields", () => {
    const badOutput: StructuredAiOutput = {
      ...validBaseOutput,
      summary: "이 종목의 적극 매수 추천 요약입니다.",
    };
    const res = validateStructuredAiOutput(badOutput);
    expect(res.isBlocked).toBe(true);
    expect(res.blockedTerms).toContain("매수");
    expect(res.blockedTerms).toContain("추천");
  });

  it("should block output if required disclaimer for intent is missing", () => {
    const badOutput: StructuredAiOutput = {
      ...validBaseOutput,
      requiredDisclaimers: ["일반적인 설명입니다."],
    };
    const res = validateStructuredAiOutput(badOutput);
    expect(res.isBlocked).toBe(true);
    expect(res.blockReasons.some((r) => r.includes("필수 면책 조항"))).toBe(true);
  });

  it("should block output if updatedAt is null but no freshness limitation is provided", () => {
    const badOutput: StructuredAiOutput = {
      ...validBaseOutput,
      claims: [
        {
          ...validBaseOutput.claims[0],
          updatedAt: null,
        },
      ],
      limitations: ["상관관계 분석 제한 사항."], // missing '시간', '업데이트', etc.
    };
    const res = validateStructuredAiOutput(badOutput);
    expect(res.isBlocked).toBe(true);
    expect(res.blockReasons.some((r) => r.includes("업데이트 시간이 누락되었으나"))).toBe(true);
  });

  it("should accept output if updatedAt is null and appropriate freshness limitation is provided", () => {
    const okOutput: StructuredAiOutput = {
      ...validBaseOutput,
      claims: [
        {
          ...validBaseOutput.claims[0],
          updatedAt: null,
        },
      ],
      limitations: ["일부 데이터의 업데이트 시간이 확인되지 않습니다."],
    };
    const res = validateStructuredAiOutput(okOutput);
    expect(res.isBlocked).toBe(false);
  });

  it("should block if claims validation fails", () => {
    const badOutput: StructuredAiOutput = {
      ...validBaseOutput,
      claims: [
        {
          ...validBaseOutput.claims[0],
          sourceId: "", // invalid sourceId
        },
      ],
    };
    const res = validateStructuredAiOutput(badOutput);
    expect(res.isBlocked).toBe(true);
    expect(res.blockReasons.some((r) => r.includes("sourceId"))).toBe(true);
  });
});

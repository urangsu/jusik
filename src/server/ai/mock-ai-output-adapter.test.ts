import { describe, it, expect } from "vitest";
import { createMockStructuredAiOutput } from "./mock-ai-output-adapter";
import { buildAiPromptInputFromContextPack } from "./ai-prompt-input-builder";
import { validateStructuredAiOutput } from "./structured-output-validator";
import { AiContextPack } from "@/domain/ai/structured-ai-output";

describe("createMockStructuredAiOutput", () => {
  const sampleContextPack: AiContextPack = {
    id: "finding_123",
    intent: "audit_finding_explanation",
    sourceRefs: [
      {
        sourceType: "individual_signal_ic",
        sourceId: "ic_1",
        source: "audit_finding_store",
        status: "cached",
        updatedAt: "2026-06-25T12:00:00Z",
        warnings: [],
      },
    ],
    facts: [
      { key: "severity", value: "warning" },
      { key: "asset_specific", value: "false" },
    ],
    limitations: ["과거 시점 데이터입니다."],
    createdAt: "2026-06-25T12:00:00Z",
  };

  const promptInput = buildAiPromptInputFromContextPack({
    contextPack: sampleContextPack,
    intent: "audit_finding_explanation",
  });

  it("should generate a safe output that passes validation in 'safe' mode", () => {
    const mockOutput = createMockStructuredAiOutput({
      promptInput,
      mode: "safe",
    });

    expect(mockOutput.intent).toBe("audit_finding_explanation");
    expect(mockOutput.requiredDisclaimers).toContain(
      "본 내용은 감사 Finding의 진단 설명이며 투자 지시가 아닙니다."
    );

    const validationRes = validateStructuredAiOutput(mockOutput);
    expect(validationRes.isBlocked).toBe(false);
    expect(validationRes.blockReasons).toHaveLength(0);
  });

  it("should generate a blocked output containing forbidden terms in 'forbidden_wording' mode", () => {
    const mockOutput = createMockStructuredAiOutput({
      promptInput,
      mode: "forbidden_wording",
    });

    const validationRes = validateStructuredAiOutput(mockOutput);
    expect(validationRes.isBlocked).toBe(true);
    expect(validationRes.blockedTerms).toContain("매수");
    expect(validationRes.blockedTerms).toContain("수익 보장");
    expect(validationRes.blockReasons.some(r => r.includes("금지 단어"))).toBe(true);
  });

  it("should generate a blocked output due to missing ground source details in 'ungrounded_claim' mode", () => {
    const mockOutput = createMockStructuredAiOutput({
      promptInput,
      mode: "ungrounded_claim",
    });

    const validationRes = validateStructuredAiOutput(mockOutput);
    expect(validationRes.isBlocked).toBe(true);
    expect(validationRes.blockReasons.some(r => r.includes("sourceId가 누락"))).toBe(true);
  });

  it("should generate a blocked output due to missing required disclaimer in 'missing_disclaimer' mode", () => {
    const mockOutput = createMockStructuredAiOutput({
      promptInput,
      mode: "missing_disclaimer",
    });

    const validationRes = validateStructuredAiOutput(mockOutput);
    expect(validationRes.isBlocked).toBe(true);
    expect(validationRes.blockReasons.some(r => r.includes("필수 면책 조항"))).toBe(true);
  });
});

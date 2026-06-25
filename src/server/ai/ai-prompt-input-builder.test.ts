import { describe, it, expect } from "vitest";
import { buildAiPromptInputFromContextPack } from "./ai-prompt-input-builder";
import { AiContextPack } from "@/domain/ai/structured-ai-output";

describe("buildAiPromptInputFromContextPack", () => {
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

  it("should build prompt input with correct default values and Korean locale", () => {
    const res = buildAiPromptInputFromContextPack({
      contextPack: sampleContextPack,
      intent: "audit_finding_explanation",
    });

    expect(res.intent).toBe("audit_finding_explanation");
    expect(res.systemPolicy.language).toBe("ko");
    expect(res.systemPolicy.forbiddenActions).toHaveLength(5);
    expect(res.systemPolicy.forbiddenActions[0]).toContain("매수, 매도, 추천");
    expect(res.systemPolicy.requiredDisclaimers).toContain(
      "본 내용은 감사 Finding의 진단 설명이며 투자 지시가 아닙니다."
    );
    expect(res.allowedClaimSourceIds).toContain("ic_1");
    expect(res.userInstruction).toBeNull();
  });

  it("should apply English locale policies when requested", () => {
    const res = buildAiPromptInputFromContextPack({
      contextPack: sampleContextPack,
      intent: "audit_finding_explanation",
      locale: "en",
      userInstruction: "Describe this finding",
    });

    expect(res.systemPolicy.language).toBe("en");
    expect(res.systemPolicy.forbiddenActions[0]).toContain("Forbidden to use words like buy, sell");
    expect(res.systemPolicy.requiredDisclaimers).toContain(
      "This content is a diagnostic explanation of the audit finding and is not an investment instruction."
    );
    expect(res.userInstruction).toBe("Describe this finding");
  });

  it("should match required disclaimer for strategy trial explanation intent", () => {
    const res = buildAiPromptInputFromContextPack({
      contextPack: sampleContextPack,
      intent: "strategy_trial_explanation",
      locale: "ko",
    });

    expect(res.systemPolicy.requiredDisclaimers).toContain(
      "본 내용은 백테스트 및 전략 시도 기록의 설명이며 운용 성과를 보장하지 않습니다."
    );
  });
});

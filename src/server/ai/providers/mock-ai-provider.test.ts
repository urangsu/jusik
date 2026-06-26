import { describe, it, expect } from "vitest";
import { createMockAiProvider } from "./mock-ai-provider";
import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";

const samplePromptInput: AiPromptInput = {
  id: "pi_mock_test",
  intent: "audit_finding_explanation",
  systemPolicy: {
    language: "ko",
    forbiddenActions: [],
    requiredDisclaimers: ["본 내용은 감사 Finding의 진단 설명이며 투자 지시가 아닙니다."],
    outputFormat: "structured_json_only",
  },
  contextPack: {
    id: "finding_mock_test",
    intent: "audit_finding_explanation",
    sourceRefs: [
      {
        sourceType: "audit_finding",
        sourceId: "finding_mock_test",
        source: "audit_finding_store",
        status: "cached",
        updatedAt: "2026-06-25T00:00:00Z",
        warnings: [],
      },
    ],
    facts: [],
    limitations: [],
    createdAt: "2026-06-25T00:00:00Z",
  },
  userInstruction: null,
  allowedClaimSourceIds: ["finding_mock_test"],
  requiredOutputSchema: "StructuredAiOutput",
  createdAt: "2026-06-25T00:00:00Z",
};

describe("mock-ai-provider", () => {
  it("should return status=available and non-null output in safe mode", async () => {
    const provider = createMockAiProvider({ mode: "safe" });

    const result = await provider.generateStructuredOutput({
      providerId: "mock",
      promptInput: samplePromptInput,
      requestHash: "hash_mock_safe",
      locale: "ko",
      createdAt: new Date().toISOString(),
    });

    expect(result.status).toBe("available");
    expect(result.output).not.toBeNull();
    expect(result.errorCode).toBeNull();
    expect(result.output?.isBlocked).toBe(false);
    expect(result.warnings).toContain("mock_provider_only");
  });

  it("should return output with forbidden wording in forbidden_wording mode (unvalidated)", async () => {
    const provider = createMockAiProvider({ mode: "forbidden_wording" });

    const result = await provider.generateStructuredOutput({
      providerId: "mock",
      promptInput: samplePromptInput,
      requestHash: "hash_mock_fw",
      locale: "ko",
      createdAt: new Date().toISOString(),
    });

    // Raw mock output — not yet validated by the guard
    expect(result.status).toBe("available");
    expect(result.output).not.toBeNull();
    // The output itself has isBlocked=false (guard not applied yet)
    expect(result.output?.isBlocked).toBe(false);
  });

  it("descriptor should show available status and no streaming", () => {
    const provider = createMockAiProvider();

    expect(provider.descriptor.status).toBe("available");
    expect(provider.descriptor.supportsStreaming).toBe(false);
    expect(provider.descriptor.kind).toBe("mock");
    expect(provider.descriptor.requiresApiKey).toBe(false);
    expect(provider.descriptor.capabilities).toContain("structured_output");
  });
});

import { describe, expect, it } from "vitest";
import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";
import { runAiProviderDryRun } from "./ai-provider-dry-run-service";

function promptInput(sourceRefs: AiPromptInput["contextPack"]["sourceRefs"]): AiPromptInput {
  return {
    id: "prompt_test",
    intent: "audit_finding_explanation",
    systemPolicy: {
      language: "ko",
      forbiddenActions: [],
      requiredDisclaimers: [],
      outputFormat: "structured_json_only",
    },
    contextPack: {
      id: "ctx_test",
      intent: "audit_finding_explanation",
      sourceRefs,
      facts: [],
      limitations: [],
      createdAt: "2026-07-02T00:00:00.000Z",
    },
    userInstruction: null,
    allowedClaimSourceIds: sourceRefs.map((ref) => ref.sourceId),
    requiredOutputSchema: "StructuredAiOutput",
    createdAt: "2026-07-02T00:00:00.000Z",
  };
}

describe("runAiProviderDryRun", () => {
  it("blocks disabled external providers without external calls", () => {
    const result = runAiProviderDryRun({
      providerId: "disabled_openai",
      promptInput: promptInput([
        {
          sourceType: "provider_health",
          sourceId: "src1",
          source: "test",
          status: "cached",
          updatedAt: "2026-07-02T00:00:00.000Z",
          warnings: [],
        },
      ]),
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedByPolicy).toBe(true);
    expect(result.wouldCallExternalProvider).toBe(false);
  });

  it("allows mock provider only when sourceRefs exist", () => {
    const result = runAiProviderDryRun({
      providerId: "mock",
      promptInput: promptInput([
        {
          sourceType: "data_envelope",
          sourceId: "src1",
          source: "test",
          status: "cached",
          updatedAt: "2026-07-02T00:00:00.000Z",
          warnings: [],
        },
      ]),
    });

    expect(result.allowed).toBe(true);
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("blocks prompt inputs without sourceRefs", () => {
    const result = runAiProviderDryRun({ providerId: "mock", promptInput: promptInput([]) });

    expect(result.allowed).toBe(false);
    expect(result.warnings).toContain("source_refs_required");
  });
});

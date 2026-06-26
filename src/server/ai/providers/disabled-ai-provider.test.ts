import { describe, it, expect } from "vitest";
import { createDisabledAiProvider } from "./disabled-ai-provider";
import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";

const samplePromptInput: AiPromptInput = {
  id: "pi_test",
  intent: "audit_finding_explanation",
  systemPolicy: {
    language: "ko",
    forbiddenActions: [],
    requiredDisclaimers: [],
    outputFormat: "structured_json_only",
  },
  contextPack: {
    id: "finding_test",
    intent: "audit_finding_explanation",
    sourceRefs: [],
    facts: [],
    limitations: [],
    createdAt: "2026-06-25T00:00:00Z",
  },
  userInstruction: null,
  allowedClaimSourceIds: ["finding_test"],
  requiredOutputSchema: "StructuredAiOutput",
  createdAt: "2026-06-25T00:00:00Z",
};

describe("disabled-ai-provider", () => {
  it("should return status=not_supported and output=null", async () => {
    const provider = createDisabledAiProvider({
      id: "disabled_openai",
      displayName: "OpenAI (Disabled)",
      kind: "external_disabled",
      disabledReason: "External AI providers are disabled by product policy.",
      requiresApiKey: true,
    });

    const result = await provider.generateStructuredOutput({
      providerId: "disabled_openai",
      promptInput: samplePromptInput,
      requestHash: "hash_test_disabled",
      locale: "ko",
      createdAt: new Date().toISOString(),
    });

    expect(result.status).toBe("not_supported");
    expect(result.output).toBeNull();
    expect(result.errorCode).toBe("AI_PROVIDER_DISABLED");
    expect(result.warnings).toContain("provider_disabled_by_policy");
  });

  it("descriptor should reflect disabled state", () => {
    const provider = createDisabledAiProvider({
      id: "disabled_anthropic",
      displayName: "Anthropic (Disabled)",
      kind: "external_disabled",
      disabledReason: "Disabled.",
      requiresApiKey: true,
    });

    expect(provider.descriptor.status).toBe("disabled");
    expect(provider.descriptor.supportsStreaming).toBe(false);
    expect(provider.descriptor.kind).toBe("external_disabled");
    expect(provider.descriptor.capabilities).toHaveLength(0);
    expect(provider.descriptor.policyWarnings).toContain("provider_disabled_by_policy");
  });

  it("local disabled provider should have kind=local_disabled", () => {
    const provider = createDisabledAiProvider({
      id: "disabled_local",
      displayName: "Local LLM (Disabled)",
      kind: "local_disabled",
      disabledReason: "Local LLM disabled by policy.",
      requiresApiKey: false,
    });

    expect(provider.descriptor.kind).toBe("local_disabled");
    expect(provider.descriptor.requiresApiKey).toBe(false);
  });
});

import type {
  AiProviderDescriptor,
  AiProviderRequest,
  AiProviderResult,
} from "@/domain/ai/ai-provider";
import type { AiProvider } from "./ai-provider-interface";
import { createMockStructuredAiOutput } from "../mock-ai-output-adapter";

type MockMode =
  | "safe"
  | "forbidden_wording"
  | "ungrounded_claim"
  | "missing_disclaimer";

/**
 * Creates the mock AI provider, which wraps the deterministic mock adapter.
 *
 * This is the only "available" provider. It generates StructuredAiOutput
 * deterministically from the prompt input — no external calls are made.
 */
export function createMockAiProvider(input?: {
  mode?: MockMode;
}): AiProvider {
  const mode: MockMode = input?.mode ?? "safe";

  const descriptor: AiProviderDescriptor = {
    id: "mock",
    kind: "mock",
    displayName: "Mock Provider (Deterministic Test)",
    status: "available",
    capabilities: [
      "structured_output",
      "audit_finding_explanation",
      "strategy_trial_explanation",
      "filing_explanation",
    ],
    supportsStreaming: false,
    requiresApiKey: false,
    disabledReason: null,
    policyWarnings: [
      "mock_provider_only",
      "not_for_production_ai_output",
    ],
  };

  return {
    descriptor,

    async generateStructuredOutput(
      request: AiProviderRequest
    ): Promise<AiProviderResult> {
      const rawOutput = createMockStructuredAiOutput({
        promptInput: request.promptInput,
        mode,
      });

      return {
        providerId: "mock",
        status: "available",
        output: rawOutput,
        errorCode: null,
        message: null,
        warnings: ["mock_provider_only"],
        createdAt: new Date().toISOString(),
      };
    },
  };
}

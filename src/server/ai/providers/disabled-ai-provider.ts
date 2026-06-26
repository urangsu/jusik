import type {
  AiProviderId,
  AiProviderKind,
  AiProviderDescriptor,
  AiProviderRequest,
  AiProviderResult,
} from "@/domain/ai/ai-provider";
import type { AiProvider } from "./ai-provider-interface";

/**
 * Creates a disabled AI provider that always returns status="not_supported".
 *
 * Used for external (OpenAI, Anthropic, Gemini) and local providers that
 * are disabled by product policy. No external API calls are made.
 */
export function createDisabledAiProvider(input: {
  id: AiProviderId;
  displayName: string;
  kind: "external_disabled" | "local_disabled";
  disabledReason: string;
  requiresApiKey: boolean;
}): AiProvider {
  const descriptor: AiProviderDescriptor = {
    id: input.id,
    kind: input.kind,
    displayName: input.displayName,
    status: "disabled",
    capabilities: [],
    supportsStreaming: false,
    requiresApiKey: input.requiresApiKey,
    disabledReason: input.disabledReason,
    policyWarnings: [
      "provider_disabled_by_policy",
      "no_external_ai_calls_permitted",
    ],
  };

  return {
    descriptor,

    async generateStructuredOutput(
      request: AiProviderRequest
    ): Promise<AiProviderResult> {
      return {
        providerId: request.providerId,
        status: "not_supported",
        output: null,
        errorCode: "AI_PROVIDER_DISABLED",
        message: input.disabledReason,
        warnings: ["provider_disabled_by_policy"],
        createdAt: new Date().toISOString(),
      };
    },
  };
}

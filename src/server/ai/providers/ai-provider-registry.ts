import type { AiProviderId, AiProviderDescriptor } from "@/domain/ai/ai-provider";
import type { AiProvider } from "./ai-provider-interface";
import { createMockAiProvider } from "./mock-ai-provider";
import { createDisabledAiProvider } from "./disabled-ai-provider";

const DISABLED_REASON =
  "External AI providers are disabled by product policy. No external LLM API calls are permitted.";

// Build registry entries once at module load.
const PROVIDER_REGISTRY: AiProvider[] = [
  createMockAiProvider(),
  createDisabledAiProvider({
    id: "disabled_openai",
    displayName: "OpenAI (Disabled)",
    kind: "external_disabled",
    disabledReason: DISABLED_REASON,
    requiresApiKey: true,
  }),
  createDisabledAiProvider({
    id: "disabled_anthropic",
    displayName: "Anthropic (Disabled)",
    kind: "external_disabled",
    disabledReason: DISABLED_REASON,
    requiresApiKey: true,
  }),
  createDisabledAiProvider({
    id: "disabled_gemini",
    displayName: "Gemini (Disabled)",
    kind: "external_disabled",
    disabledReason: DISABLED_REASON,
    requiresApiKey: true,
  }),
  createDisabledAiProvider({
    id: "disabled_local",
    displayName: "Local LLM (Disabled)",
    kind: "local_disabled",
    disabledReason: "Local LLM providers are disabled by product policy.",
    requiresApiKey: false,
  }),
];

const REGISTRY_MAP = new Map<AiProviderId, AiProvider>(
  PROVIDER_REGISTRY.map((p) => [p.descriptor.id, p])
);

/**
 * Returns descriptors for all registered AI providers.
 * All external providers are disabled by default.
 */
export function listAiProviders(): AiProviderDescriptor[] {
  return PROVIDER_REGISTRY.map((p) => p.descriptor);
}

/**
 * Returns the AiProvider implementation for the given providerId.
 * Throws if the providerId is not registered.
 */
export function getAiProvider(providerId: AiProviderId): AiProvider {
  const provider = REGISTRY_MAP.get(providerId);
  if (!provider) {
    throw new Error(
      `AI provider '${providerId}' is not registered in the provider registry.`
    );
  }
  return provider;
}

/**
 * Returns true only if the provider status is "available".
 * All external providers return false.
 */
export function isAiProviderEnabled(providerId: AiProviderId): boolean {
  const provider = REGISTRY_MAP.get(providerId);
  if (!provider) return false;
  return provider.descriptor.status === "available";
}

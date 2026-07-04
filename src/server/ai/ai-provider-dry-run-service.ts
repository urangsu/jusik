import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";
import type { AiProviderId } from "@/domain/ai/ai-provider";
import type { AiProviderDryRunResult } from "@/domain/ai/ai-provider-dry-run";
import { getAiProvider } from "./providers/ai-provider-registry";

function estimateTokens(promptInput: AiPromptInput): number {
  const text = JSON.stringify(promptInput);
  return Math.ceil(text.length / 4);
}

export function runAiProviderDryRun(input: {
  providerId: AiProviderId;
  promptInput: AiPromptInput;
}): AiProviderDryRunResult {
  const provider = getAiProvider(input.providerId);
  const sourceRefCount = input.promptInput.contextPack.sourceRefs.length;
  const missingSourceRefs = sourceRefCount === 0;
  const blockedByPolicy = provider.descriptor.status !== "available" || provider.descriptor.kind !== "mock";
  const warnings: string[] = [];

  if (missingSourceRefs) warnings.push("source_refs_required");
  if (blockedByPolicy) warnings.push("external_provider_disabled");

  return {
    providerId: input.providerId,
    allowed: !blockedByPolicy && !missingSourceRefs,
    blockedByPolicy,
    wouldCallExternalProvider: false,
    tokenEstimate: estimateTokens(input.promptInput),
    sourceRefCount,
    missingSourceRefs,
    warnings,
    message: blockedByPolicy
      ? provider.descriptor.disabledReason ?? "Provider is disabled by policy."
      : missingSourceRefs
        ? "Prompt input must include at least one sourceRef before AI dry-run can pass."
        : null,
    checkedAt: new Date().toISOString(),
  };
}

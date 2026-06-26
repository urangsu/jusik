import type { AiProviderId, AiProviderResult } from "@/domain/ai/ai-provider";
import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";
import type { StructuredAiOutput } from "@/domain/ai/structured-ai-output";
import { getAiProvider } from "./providers/ai-provider-registry";
import { validateStructuredAiOutput } from "./structured-output-validator";

/**
 * Guarded AI Provider Service.
 *
 * Orchestrates: provider lookup → generateStructuredOutput → Structured Output Guard.
 * Disabled providers return validatedOutput=null, blocked=false (no content to validate).
 * Enabled providers must pass the guard before their output is usable.
 *
 * No external AI API calls are made from this service.
 */
export async function runGuardedAiProvider(input: {
  providerId: AiProviderId;
  promptInput: AiPromptInput;
  requestHash: string;
  locale?: "ko" | "en";
}): Promise<{
  providerResult: AiProviderResult;
  validatedOutput: StructuredAiOutput | null;
  blocked: boolean;
  blockReasons: string[];
}> {
  const { providerId, promptInput, requestHash, locale = "ko" } = input;

  // 1. Resolve provider from registry
  const provider = getAiProvider(providerId);

  // 2. Invoke provider (disabled providers return output=null immediately)
  const providerResult = await provider.generateStructuredOutput({
    providerId,
    promptInput,
    requestHash,
    locale,
    createdAt: new Date().toISOString(),
  });

  // 3. If provider output is null (disabled), skip validation
  if (providerResult.output === null) {
    return {
      providerResult,
      validatedOutput: null,
      blocked: false,
      blockReasons: [],
    };
  }

  // 4. Run Structured Output Guard on non-null output
  const validatedOutput = validateStructuredAiOutput(providerResult.output);

  return {
    providerResult: {
      ...providerResult,
      // Reflect the post-guard blocked state in the provider result status
      status: validatedOutput.isBlocked ? "error" : providerResult.status,
    },
    validatedOutput,
    blocked: validatedOutput.isBlocked,
    blockReasons: validatedOutput.blockReasons,
  };
}

import type {
  AiProviderDescriptor,
  AiProviderRequest,
  AiProviderResult,
} from "@/domain/ai/ai-provider";

/**
 * AiProvider interface contract.
 *
 * All AI providers — mock, disabled external, or disabled local — must
 * implement this interface. No plain text or markdown output is permitted;
 * only StructuredAiOutput (or null for disabled providers) may be returned.
 *
 * Streaming is not supported and must never be implemented.
 */
export interface AiProvider {
  descriptor: AiProviderDescriptor;

  generateStructuredOutput(
    request: AiProviderRequest
  ): Promise<AiProviderResult>;
}

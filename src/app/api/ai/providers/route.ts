import { createSafeResponse } from "@/server/security/safe-api-response";
import { listAiProviders } from "@/server/ai/providers/ai-provider-registry";
import { DataEnvelope } from "@/domain/common/data-status";
import type { AiProviderDescriptor } from "@/domain/ai/ai-provider";

/**
 * GET /api/ai/providers
 *
 * Returns all registered AI provider descriptors.
 * All external providers are disabled by default.
 * sourceTier = manual_import (no live data dependency).
 */
export async function GET() {
  try {
    const providers = listAiProviders();

    const envelope: DataEnvelope<AiProviderDescriptor[]> = {
      value: providers,
      status: "cached",
      source: "ai_provider_registry",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "ai_provider_registry",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류가 발생했습니다.",
    };
    return createSafeResponse(envelope, 500);
  }
}

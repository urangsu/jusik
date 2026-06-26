import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { runGuardedAiProvider } from "@/server/ai/guarded-ai-provider-service";
import { DataEnvelope } from "@/domain/common/data-status";
import type { AiProviderId } from "@/domain/ai/ai-provider";
import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";
import type { StructuredAiOutput } from "@/domain/ai/structured-ai-output";
import type { AiProviderResult } from "@/domain/ai/ai-provider";

type RunResponseValue = {
  providerResult: AiProviderResult;
  validatedOutput: StructuredAiOutput | null;
  blocked: boolean;
  blockReasons: string[];
};

const VALID_PROVIDER_IDS: AiProviderId[] = [
  "mock",
  "disabled_openai",
  "disabled_anthropic",
  "disabled_gemini",
  "disabled_local",
];

/**
 * POST /api/ai/providers/run
 *
 * Executes the guarded provider pipeline for the given providerId + promptInput.
 * Disabled providers return HTTP 200 with status="not_supported" and output=null.
 * No external AI API calls are made.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "요청 본문이 유효하지 않습니다.",
        source: "ai_provider_run",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const { providerId, promptInput, requestHash, locale } = body as {
      providerId: unknown;
      promptInput: unknown;
      requestHash: unknown;
      locale: unknown;
    };

    if (
      !providerId ||
      typeof providerId !== "string" ||
      !VALID_PROVIDER_IDS.includes(providerId as AiProviderId)
    ) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: `providerId는 다음 중 하나여야 합니다: ${VALID_PROVIDER_IDS.join(", ")}`,
        source: "ai_provider_run",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (!promptInput || typeof promptInput !== "object") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "promptInput은 필수 항목입니다.",
        source: "ai_provider_run",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    if (!requestHash || typeof requestHash !== "string") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "requestHash는 필수 항목입니다.",
        source: "ai_provider_run",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const result = await runGuardedAiProvider({
      providerId: providerId as AiProviderId,
      promptInput: promptInput as AiPromptInput,
      requestHash: requestHash as string,
      locale: locale === "en" ? "en" : "ko",
    });

    // Disabled providers: status = not_supported (HTTP 200 per policy)
    const envelopeStatus =
      result.providerResult.status === "not_supported"
        ? "not_supported"
        : result.blocked
        ? "error"
        : "cached";

    const envelope: DataEnvelope<RunResponseValue> = {
      value: result,
      status: envelopeStatus,
      source: "ai_provider_run",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const isNotFound = err.message?.includes("not registered");
    const envelope: DataEnvelope<null> = {
      value: null,
      status: isNotFound ? "not_found" : "error",
      message: err.message || "서버 오류가 발생했습니다.",
      source: "ai_provider_run",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
    };
    return createSafeResponse(envelope, isNotFound ? 404 : 500);
  }
}

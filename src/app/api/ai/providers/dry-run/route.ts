import { NextRequest } from "next/server";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { AiProviderDryRunResult } from "@/domain/ai/ai-provider-dry-run";
import type { AiProviderId } from "@/domain/ai/ai-provider";
import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";
import { runAiProviderDryRun } from "@/server/ai/ai-provider-dry-run-service";
import { createSafeResponse } from "@/server/security/safe-api-response";

function isProviderId(value: unknown): value is AiProviderId {
  return (
    value === "mock" ||
    value === "disabled_openai" ||
    value === "disabled_anthropic" ||
    value === "disabled_gemini" ||
    value === "disabled_local"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!isProviderId(body?.providerId) || !body?.promptInput) {
      return createSafeResponse({
        value: null,
        status: "error",
        source: "ai_provider_dry_run",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "providerId and promptInput are required.",
      } satisfies DataEnvelope<null>, 400);
    }

    const result = runAiProviderDryRun({
      providerId: body.providerId,
      promptInput: body.promptInput as AiPromptInput,
    });
    return createSafeResponse({
      value: result,
      status: result.allowed ? "cached" : "not_supported",
      source: "ai_provider_dry_run",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: result.checkedAt,
    } satisfies DataEnvelope<AiProviderDryRunResult>);
  } catch (error) {
    return createSafeResponse({
      value: null,
      status: "error",
      source: "ai_provider_dry_run",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: error instanceof Error ? error.message : "AI dry-run failed.",
    } satisfies DataEnvelope<null>, 500);
  }
}

export const dynamic = "force-dynamic";

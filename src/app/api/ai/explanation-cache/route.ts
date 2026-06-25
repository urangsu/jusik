import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listAiExplanationCacheRecords } from "@/server/ai/ai-explanation-cache-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { AiOutputIntent } from "@/domain/ai/structured-ai-output";
import { AiExplanationRequestSourceType } from "@/domain/ai/ai-explanation-request";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = (searchParams.get("sourceType") as AiExplanationRequestSourceType) || undefined;
    const sourceId = searchParams.get("sourceId") || undefined;
    const intent = (searchParams.get("intent") as AiOutputIntent) || undefined;

    const records = await listAiExplanationCacheRecords({
      sourceType,
      sourceId,
      intent,
    });

    const envelope = {
      value: records,
      status: "cached" as const,
      source: "ai_explanation_cache_store",
      sourceTier: "manual_import" as const,
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      message: err.message || "서버 오류가 발생했습니다.",
      source: "AI Explanation Cache API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
    };
    return createSafeResponse(envelope, 500);
  }
}

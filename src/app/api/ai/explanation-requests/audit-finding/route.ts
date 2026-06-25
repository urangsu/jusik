import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { createAuditFindingExplanationRequest } from "@/server/ai/ai-explanation-request-service";
import { DataEnvelope } from "@/domain/common/data-status";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "요청 본문이 유효하지 않습니다.",
        source: "AI Explanation Request API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const { findingId, locale, userPrompt } = body;
    if (!findingId || typeof findingId !== "string" || findingId.trim() === "") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "findingId는 필수 항목입니다.",
        source: "AI Explanation Request API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const result = await createAuditFindingExplanationRequest({
      findingId,
      locale: locale === "en" ? "en" : "ko",
      userPrompt: userPrompt || null,
    });

    const envelope = {
      value: result,
      status: result.cached ? ("cached" as const) : ("real_time" as const),
      source: "ai_explanation_request_service",
      sourceTier: "manual_import" as const,
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const status = err.message?.includes("not found") ? 404 : 500;
    const envelope: DataEnvelope<null> = {
      value: null,
      status: err.message?.includes("not found") ? "not_found" : "error",
      message: err.message || "서버 오류가 발생했습니다.",
      source: "AI Explanation Request API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
    };
    return createSafeResponse(envelope, status);
  }
}

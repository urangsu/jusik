import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { validateStructuredAiOutput } from "@/server/ai/structured-output-validator";
import { DataEnvelope } from "@/domain/common/data-status";
import { StructuredAiOutput } from "@/domain/ai/structured-ai-output";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "요청 본문이 유효하지 않은 JSON 객체입니다.",
        source: "Structured Output Validate API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const validated = validateStructuredAiOutput(body as StructuredAiOutput);

    const envelope: DataEnvelope<StructuredAiOutput> = {
      value: validated,
      status: "cached",
      source: "structured_output_validator",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      message: err.message || "서버 오류가 발생했습니다.",
      source: "Structured Output Validate API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
    };
    return createSafeResponse(envelope, 400);
  }
}

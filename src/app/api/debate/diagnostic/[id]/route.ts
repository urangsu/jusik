import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getDiagnosticDebate } from "@/server/debate/diagnostic-debate-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { DiagnosticDebateReport } from "@/domain/debate/diagnostic-debate";

/**
 * GET /api/debate/diagnostic/[id]
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = params.id;
    const debate = await getDiagnosticDebate(id);

    if (!debate) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "diagnostic_debate_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Debate report not found",
      };
      return createSafeResponse(envelope, 200);
    }

    const envelope: DataEnvelope<DiagnosticDebateReport> = {
      value: debate,
      status: debate.isBlocked ? "error" : "cached",
      source: "diagnostic_debate_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: debate.createdAt,
      message: debate.isBlocked ? "Blocked due to policy wording" : undefined,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "diagnostic_debate_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

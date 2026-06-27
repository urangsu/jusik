import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getFindingSynthesisReport } from "@/server/report/finding-synthesis-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { FindingSynthesisReport } from "@/domain/report/report-section";

/**
 * GET /api/reports/finding-synthesis/[id]
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = params.id;
    const report = await getFindingSynthesisReport(id);

    if (!report) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "finding_synthesis_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Synthesis report not found",
      };
      return createSafeResponse(envelope, 200);
    }

    const envelope: DataEnvelope<FindingSynthesisReport> = {
      value: report,
      status: report.isBlocked ? "error" : "cached",
      source: "finding_synthesis_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report.createdAt,
      message: report.isBlocked ? "Blocked due to policy wording" : undefined,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "finding_synthesis_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

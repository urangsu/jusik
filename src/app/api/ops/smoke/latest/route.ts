import { createSafeResponse } from "@/server/security/safe-api-response";
import { getLatestOperationalSmokeReport } from "@/server/ops/operational-smoke-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { OperationalSmokeReport } from "@/domain/ops/operational-smoke";

/**
 * GET /api/ops/smoke/latest
 *
 * Returns the latest stored operational smoke report.
 * Returns null if no report has been run yet.
 */
export async function GET() {
  try {
    const report = await getLatestOperationalSmokeReport();

    const envelope: DataEnvelope<OperationalSmokeReport | null> = {
      value: report,
      status: report ? (report.failureCount > 0 ? "error" : "cached") : "not_found",
      source: "operational_smoke_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report?.createdAt ?? null,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "operational_smoke_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류가 발생했습니다.",
    };
    return createSafeResponse(envelope, 500);
  }
}

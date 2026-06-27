import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { runOperationalSmoke } from "@/server/ops/operational-smoke-runner";
import { saveOperationalSmokeReport } from "@/server/ops/operational-smoke-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { OperationalSmokeReport } from "@/domain/ops/operational-smoke";

/**
 * POST /api/ops/smoke/run
 *
 * Executes the operational smoke harness.
 * Returns DataEnvelope<OperationalSmokeReport>.
 * status = "cached" if all passed, "error" if failureCount > 0.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sampleFindingId =
      body && typeof body.sampleFindingId === "string"
        ? body.sampleFindingId
        : null;
    const baseUrl =
      body && typeof body.baseUrl === "string"
        ? body.baseUrl
        : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const report = await runOperationalSmoke({
      baseUrl,
      sampleFindingId,
    });

    await saveOperationalSmokeReport(report).catch(() => {
      // Storage failure should not block the response
    });

    const envelopeStatus = report.failureCount > 0 ? "error" : "cached";

    const envelope: DataEnvelope<OperationalSmokeReport> = {
      value: report,
      status: envelopeStatus,
      source: "operational_smoke_runner",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report.createdAt,
      message:
        report.failureCount > 0
          ? `${report.failureCount}개 대상에서 오류가 발생했습니다.`
          : undefined,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "operational_smoke_runner",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류가 발생했습니다.",
    };
    return createSafeResponse(envelope, 500);
  }
}

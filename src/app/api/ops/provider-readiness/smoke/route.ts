import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { runProviderRealDataSmoke } from "@/server/ops/provider-real-data-smoke-runner";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { ProviderReadinessReport } from "@/domain/ops/provider-readiness";

/**
 * POST /api/ops/provider-readiness/smoke
 *
 * Runs real data smoke tests for all ready providers.
 * Requires the server to be running at baseUrl.
 *
 * Body: { includePersonalFallback?: boolean, baseUrl?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const includePersonalFallback =
      body && typeof body.includePersonalFallback === "boolean"
        ? body.includePersonalFallback
        : false;
    const baseUrl =
      body && typeof body.baseUrl === "string"
        ? body.baseUrl
        : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const report = await runProviderRealDataSmoke({
      includePersonalFallback,
      baseUrl,
    });

    const hasFailures = report.failureCount > 0;
    const envelopeStatus = hasFailures ? "error" : "cached";

    const envelope: DataEnvelope<ProviderReadinessReport> = {
      value: report,
      status: envelopeStatus,
      source: "provider_real_data_smoke_runner",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report.createdAt,
      message: hasFailures
        ? `${report.failureCount}개 provider에서 smoke 실패가 발생했습니다.`
        : undefined,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "provider_real_data_smoke_runner",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

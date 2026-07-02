import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { runRealProviderSmoke } from "@/server/ops/real-provider-smoke-runner";
import { saveRealProviderSmokeReport } from "@/server/ops/real-provider-smoke-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { RealProviderSmokeReport } from "@/domain/ops/real-provider-smoke";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const baseUrl =
      body && typeof body.baseUrl === "string"
        ? body.baseUrl
        : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const report = await runRealProviderSmoke({ baseUrl });
    await saveRealProviderSmokeReport(report).catch(() => {
      // Smoke result is still useful even if runtime store is unavailable.
    });

    const envelope: DataEnvelope<RealProviderSmokeReport> = {
      value: report,
      status: report.passed ? "cached" : "error",
      source: "real_provider_smoke_runner",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report.createdAt,
      message: report.passed ? undefined : `${report.failureCount} real provider smoke target(s) failed.`,
    };

    return createSafeResponse(envelope, 200);
  } catch (error) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "real_provider_smoke_runner",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: error instanceof Error ? error.message : "Real provider smoke failed.",
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

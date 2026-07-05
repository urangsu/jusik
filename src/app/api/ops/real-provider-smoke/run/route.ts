import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { checkJobRouteEnabled } from "@/server/security/job-route-guard";
import { runRealProviderSmoke } from "@/server/ops/real-provider-smoke-runner";
import { saveRealProviderSmokeReport } from "@/server/ops/real-provider-smoke-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type {
  RealProviderSmokeExpectationMode,
  RealProviderSmokeReport,
} from "@/domain/ops/real-provider-smoke";

function parseMode(value: unknown): RealProviderSmokeExpectationMode {
  if (value === "auto" || value === "without_key" || value === "with_key") return value;
  return "auto";
}

export async function POST(request: NextRequest) {
  const guard = checkJobRouteEnabled({
    routeFlag: process.env.REAL_PROVIDER_SMOKE_ROUTE_ENABLED,
    routeName: "real-provider-smoke/run",
  });
  if (guard) return guard;

  try {
    // baseUrl is always derived from the incoming request — never accepted from body
    // to prevent arbitrary outbound fetch to external hosts.
    const baseUrl = request.nextUrl.origin;
    const body = await request.json().catch(() => ({}));

    const report = await runRealProviderSmoke({ baseUrl, mode: parseMode(body?.mode) });
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

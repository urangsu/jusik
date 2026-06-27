import { createSafeResponse } from "@/server/security/safe-api-response";
import { resolveProviderReadiness } from "@/server/ops/provider-readiness-resolver";
import { runProviderRealDataSmoke } from "@/server/ops/provider-real-data-smoke-runner";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { ProviderReadinessReport } from "@/domain/ops/provider-readiness";

/**
 * GET /api/ops/provider-readiness
 *
 * Returns provider configuration readiness check.
 * No smoke tests are executed — only config state is returned.
 */
export async function GET() {
  try {
    const readiness = resolveProviderReadiness();

    const readyCount = readiness.filter((r) => r.status === "ready").length;
    const notConfiguredCount = readiness.filter(
      (r) =>
        r.status === "not_configured" || r.status === "personal_fallback_disabled"
    ).length;

    const report: ProviderReadinessReport = {
      id: `readiness_check_${Date.now()}`,
      readiness,
      smokeResults: [],
      readyCount,
      notConfiguredCount,
      failureCount: 0,
      createdAt: new Date().toISOString(),
    };

    const envelope: DataEnvelope<ProviderReadinessReport> = {
      value: report,
      status: "cached",
      source: "provider_readiness_resolver",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report.createdAt,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "provider_readiness_resolver",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

import { createSafeResponse } from "@/server/security/safe-api-response";
import { getLatestRealProviderSmokeReport } from "@/server/ops/real-provider-smoke-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { RealProviderSmokeReport } from "@/domain/ops/real-provider-smoke";

export async function GET() {
  try {
    const report = await getLatestRealProviderSmokeReport();
    const envelope: DataEnvelope<RealProviderSmokeReport | null> = {
      value: report,
      status: report ? (report.passed ? "cached" : "error") : "not_found",
      source: "real_provider_smoke_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report?.createdAt ?? null,
    };

    return createSafeResponse(envelope, 200);
  } catch (error) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "real_provider_smoke_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: error instanceof Error ? error.message : "Failed to load latest real provider smoke report.",
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getResearchDiagnosticData } from "@/server/research/research-workspace-service";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { SignalVersion } from "@/domain/signals/signal-version";

type RouteParams = {
  params: Promise<{ assetId: string }> | { assetId: string };
};

/**
 * GET /api/research/assets/[assetId]
 * Returns research diagnostic data for the given asset.
 */
export async function GET(request: NextRequest, props: RouteParams) {
  try {
    const params = await props.params;
    const { assetId } = params;
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get("asOfDate") || new Date().toISOString().slice(0, 10);

    const signalVersion: SignalVersion = {
      signalVersionId: "sv_research_workspace",
      engine: {
        engineId: "research_workspace_service",
        engineVersion: "1.0.0",
        configHash: "default",
        createdAt: new Date().toISOString(),
      },
      dataVersionId: "dv_default",
      calculatedAt: new Date().toISOString(),
      expiryAt: null,
    };

    const result = await getResearchDiagnosticData(assetId, asOfDate, signalVersion);

    return createSafeResponse(result, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "research_workspace_api",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "Server Error",
    };
    return createSafeResponse(envelope, 500);
  }
}

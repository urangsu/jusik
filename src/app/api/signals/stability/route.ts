import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { signalStabilityService } from "@/server/signals/signal-stability-service";
import { DataEnvelope } from "@/domain/common/data-status";
import { SignalStability } from "@/domain/signals/signal-stability";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  const signalId = searchParams.get("signalId");
  const universeId = searchParams.get("universeId") || undefined;
  // Default to today's date if not provided
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  if (!assetId || !signalId) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "signal_stability_service",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: "Missing required parameters: assetId and signalId.",
    };
    return createSafeResponse(envelope, 400);
  }

  try {
    const stability = await signalStabilityService.getStability({
      assetId,
      signalId,
      date,
      universeId,
    });

    const isInsufficient = stability.status === "insufficient_data";

    const envelope: DataEnvelope<SignalStability> = {
      value: stability,
      status: isInsufficient ? "insufficient_data" : "cached",
      source: "signal_stability_service",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "signal_stability_service",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

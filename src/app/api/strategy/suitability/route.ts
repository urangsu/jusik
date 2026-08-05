import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { strategySuitabilityService } from "@/server/strategy/strategy-suitability-service";
import { DataEnvelope } from "@/domain/common/data-status";
import { StrategySuitability } from "@/domain/strategy/strategy-suitability";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  const symbol = searchParams.get("symbol");
  const signalId = searchParams.get("signalId");
  const asOf = searchParams.get("asOf");
  const universeId = searchParams.get("universeId");

  if (!assetId || !symbol || !signalId || !asOf || !universeId) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "StrategySuitabilityService",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "Missing required parameters: assetId, symbol, signalId, asOf, and universeId.",
    };
    return createSafeResponse(envelope, 400);
  }

  try {
    const suitability = await strategySuitabilityService.calculateSuitability(
      assetId,
      symbol,
      signalId,
      asOf,
      universeId
    );

    const isInsufficient = suitability.adjustedLabel === "insufficient_data";
    const envelopeStatus = isInsufficient ? "insufficient_data" : "real_time";

    const envelope: DataEnvelope<StrategySuitability> = {
      value: suitability,
      status: envelopeStatus,
      source: "StrategySuitabilityService",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "StrategySuitabilityService",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

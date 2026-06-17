import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { calculateReliabilityAdjustedMomentumPreview } from "@/server/reliability/reliability-adjusted-momentum-preview";
import { DataEnvelope } from "@/domain/common/data-status";
import { ReliabilityAdjustedMomentumPreview } from "@/domain/reliability/reliability-adjusted-momentum";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const universe = searchParams.get("universe") || "KOSPI_SAMPLE";
  const assetId = searchParams.get("assetId");

  if (!assetId) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "insufficient_data",
      source: "Momentum Preview API",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: "Query parameter 'assetId' is required.",
    };
    return createSafeResponse(envelope, 400);
  }

  if (universe !== "KOSPI_SAMPLE" && universe !== "SP500_SAMPLE") {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "not_supported",
      source: "Momentum Preview API",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: `Universe [${universe}] not supported.`,
    };
    return createSafeResponse(envelope, 400);
  }

  try {
    const preview = await calculateReliabilityAdjustedMomentumPreview({
      universeId: universe,
      assetId,
    });

    if (!preview) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "Momentum Preview API",
        sourceTier: "personal_fallback",
        warnings: [],
        updatedAt: null,
        message: `Asset [${assetId}] not found in snapshot signals. Make sure to calculate technical factors first.`,
      };
      return createSafeResponse(envelope, 404);
    }

    const envelope: DataEnvelope<ReliabilityAdjustedMomentumPreview> = {
      value: preview,
      status: "cached",
      source: "Momentum Adjusted Preview Engine",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: preview.calculatedAt,
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Momentum Preview API",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

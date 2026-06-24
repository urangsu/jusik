import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getMarketExposureResultByTrial } from "@/server/audit/market-exposure-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { MarketExposureResult } from "@/domain/audit/market-exposure-result";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trialId = searchParams.get("trialId");

    if (!trialId) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Missing trialId parameter.",
        source: "Market Exposure API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const result = await getMarketExposureResultByTrial(trialId);

    if (!result) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        message: "Market exposure audit result not found for this trial. Please run audit first.",
        source: "Market Exposure API",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope);
    }

    const envelope: DataEnvelope<MarketExposureResult> = {
      value: result,
      status: "cached",
      source: "Market Exposure API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Market Exposure API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

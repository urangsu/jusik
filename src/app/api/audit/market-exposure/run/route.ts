import { NextRequest } from "next/server";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { auditMarketExposureFromTrial } from "@/server/audit/market-exposure-auditor";
import { saveMarketExposureResult } from "@/server/audit/market-exposure-store";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";
import { MarketExposureResult } from "@/domain/audit/market-exposure-result";

export async function POST(request: NextRequest) {
  const guardResponse = checkSettingsWriteEnabled({ routeName: "POST /api/audit/market-exposure/run" });
  if (guardResponse) return guardResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const trialId = body.trialId;

    if (!trialId) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        message: "Missing trialId",
        source: "Market Exposure Run API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
      return createSafeResponse(envelope, 400);
    }

    const result = await auditMarketExposureFromTrial({ trialId });

    await saveMarketExposureResult(result);

    const envelope: DataEnvelope<MarketExposureResult> = {
      value: result,
      status: "cached",
      source: "Market Exposure Run API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Market Exposure Run API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

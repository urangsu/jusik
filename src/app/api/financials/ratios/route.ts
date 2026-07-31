import { NextRequest } from "next/server";
import { financialDataService } from "@/server/financials/financial-data-service";
import { createSafeEnvelopeResponse } from "@/server/security/data-envelope-response";
import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const region = (searchParams.get("region") || "KR") as MarketRegion;

  if (!symbol) {
    const errorEnvelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "financials-ratios-api",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "Query parameter 'symbol' is required.",
    };
    return createSafeEnvelopeResponse(errorEnvelope, 400);
  }

  const envelope = await financialDataService.getFinancialRatios({
    symbol,
    region,
  });

  return createSafeEnvelopeResponse(envelope, 200);
}

export const dynamic = "force-dynamic";

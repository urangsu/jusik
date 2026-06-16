import { NextRequest } from "next/server";
import { marketDataService } from "@/server/services/market-data-service";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { MarketRegion } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const region = (searchParams.get("region") || "KR") as MarketRegion;

  if (!symbol) {
    return createSafeResponse({ error: "Missing symbol parameter" }, 400);
  }

  try {
    const quote = await marketDataService.getQuote(symbol, region);
    return createSafeResponse(quote);
  } catch (err) {
    return createSafeResponse({ error: (err as Error).message }, 500);
  }
}

export const dynamic = "force-dynamic";

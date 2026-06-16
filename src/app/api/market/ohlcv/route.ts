import { NextRequest } from "next/server";
import { marketDataService } from "@/server/services/market-data-service";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { MarketRegion } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const region = (searchParams.get("region") || "KR") as MarketRegion;
  const range = (searchParams.get("range") || "6M") as "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
  const interval = (searchParams.get("interval") || "1D") as "1D" | "1W" | "1M";

  if (!symbol) {
    return createSafeResponse({ error: "Missing symbol parameter" }, 400);
  }

  try {
    const ohlcv = await marketDataService.getOhlcv({ symbol, region, range, interval });
    return createSafeResponse(ohlcv);
  } catch (err) {
    return createSafeResponse({ error: (err as Error).message }, 500);
  }
}

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { marketDataService, MarketDataProviderId } from "@/server/services/market-data-service";
import { createSafeResponse } from "@/server/security/safe-api-response";
import type { MarketRegion, DataEnvelope } from "@/domain/common/data-status";
import { withMarketDataRuntimeGate } from "@/server/services/market-data-runtime-wrapper";
import type { RuntimeProviderId } from "@/domain/providers/provider-runtime-policy";

const VALID_PROVIDER_IDS = new Set<MarketDataProviderId>([
  "kis",
  "yfinance_personal",
  "finnhub_free",
  "fmp_free",
  "alpha_vantage_free",
]);

function isValidProviderId(value: string | null): value is MarketDataProviderId {
  return value !== null && VALID_PROVIDER_IDS.has(value as MarketDataProviderId);
}

function getAssetId(symbol: string, region: MarketRegion, assetId: string | null): string {
  if (assetId) return assetId;
  return `${region}_${symbol}`;
}

function missingSymbolEnvelope(): DataEnvelope<null> {
  return {
    value: null,
    status: "error",
    source: "market-data-route",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: null,
    message: "Missing required parameter: symbol.",
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const region = (searchParams.get("region") || "KR") as MarketRegion;
  const assetId = searchParams.get("assetId");
  const range = (searchParams.get("range") || "6M") as "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
  const interval = (searchParams.get("interval") || "1D") as "1D" | "1W" | "1M";

  const internalKey = request.headers.get("x-internal-smoke-key");
  const expectedKey = process.env.INTERNAL_SMOKE_KEY;
  const isInternal = Boolean(expectedKey) && internalKey === expectedKey;

  const providerIdParam = isInternal ? searchParams.get("providerId") : null;

  if (!symbol) {
    return createSafeResponse(missingSymbolEnvelope(), 400);
  }

  try {
    const ohlcvParams: any = { symbol, region, range, interval };
    if (assetId) {
      ohlcvParams.assetId = assetId;
    }

    // If a specific providerId is requested, bypass the priority chain.
    // This ensures provider-specific smoke tests measure the actual target provider.
    if (isValidProviderId(providerIdParam)) {
      const ohlcv = await marketDataService.getOhlcvForProvider(ohlcvParams, providerIdParam);
      return createSafeResponse(ohlcv);
    }

    // Default: priority-chain fallback
    const ohlcv = await marketDataService.getOhlcv(ohlcvParams);
    return createSafeResponse(ohlcv);
  } catch (err) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "market-data-route",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err instanceof Error ? err.message : "Internal server error.",
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

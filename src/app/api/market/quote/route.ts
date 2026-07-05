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

  const internalKey = request.headers.get("x-internal-smoke-key");
  const expectedKey = process.env.INTERNAL_SMOKE_KEY;
  const isInternal = Boolean(expectedKey) && internalKey === expectedKey;

  const providerIdParam = isInternal ? searchParams.get("providerId") : null;

  if (!symbol) {
    return createSafeResponse(missingSymbolEnvelope(), 400);
  }

  try {
    // If a specific providerId is requested internally (e.g. from smoke runner), bypass the priority chain.
    if (isValidProviderId(providerIdParam)) {
      const providerId = providerIdParam;
      const quote = await withMarketDataRuntimeGate({
        providerId: providerId as RuntimeProviderId,
        market: region,
        assetId: getAssetId(symbol, region, assetId),
        symbol,
        capability: "quote",
        fetcher: () => marketDataService.getQuoteForProvider(symbol, providerId),
      });
      return createSafeResponse(quote);
    }

    // Default: priority-chain fallback
    const quote = await withMarketDataRuntimeGate({
      providerId: region === "KR" ? "kis" : "fmp_free",
      market: region,
      assetId: getAssetId(symbol, region, assetId),
      symbol,
      capability: "quote",
      fetcher: () => marketDataService.getQuote(symbol, region),
    });
    return createSafeResponse(quote);
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

import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { getPriorityList } from "../providers/source-priority";
import { kisDomesticStockProvider } from "../providers/kis/kis-domestic-stock-provider";
import { yfinancePersonalProvider } from "../providers/yfinance-personal-provider";
import { finnhubFreeProvider } from "../providers/finnhub-free-provider";
import { fmpFreeProvider } from "../providers/fmp-free-provider";
import { alphaVantageProvider } from "../providers/alpha-vantage-provider";
import { withMarketDataRuntimeGate } from "./market-data-runtime-wrapper";
import { RuntimeProviderId } from "@/domain/providers/provider-runtime-policy";

export type MarketDataProviderId = "kis" | "yfinance_personal" | "finnhub_free" | "fmp_free" | "alpha_vantage_free";

function getAssetId(symbol: string, region: MarketRegion, customAssetId?: string | null): string {
  if (customAssetId) return customAssetId;
  return region === "KR" ? `KR:${symbol}` : `US:${symbol}`;
}

export class MarketDataService {
  /**
   * Resolves price quote from a single specific provider — no priority fallback.
   * Used for provider-specific smoke testing and provider-isolated calls.
   * Returns api_required (not error) if the provider is not configured.
   */
  public async getQuoteForProvider(
    symbol: string,
    providerId: MarketDataProviderId,
    region: MarketRegion = "US",
    assetId?: string | null
  ): Promise<DataEnvelope<Quote>> {
    const provider = this.getMarketDataProvider(providerId);
    if (!provider) {
      return {
        value: null,
        status: "not_supported",
        source: providerId,
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Provider '${providerId}' is not available.`,
      };
    }
    const resolvedAssetId = getAssetId(symbol, region, assetId);
    try {
      return await withMarketDataRuntimeGate({
        providerId: providerId as RuntimeProviderId,
        market: region,
        assetId: resolvedAssetId,
        symbol,
        capability: "quote",
        fetcher: () => provider.getQuote(symbol),
      });
    } catch (err) {
      return {
        value: null,
        status: "error",
        source: providerId,
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: err instanceof Error ? err.message : "Provider call failed.",
      };
    }
  }

  /**
   * Resolves OHLCV from a single specific provider — no priority fallback.
   */
  public async getOhlcvForProvider(
    params: {
      symbol: string;
      region: MarketRegion;
      range: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
      interval: "1D" | "1W" | "1M";
      assetId?: string | null;
    },
    providerId: MarketDataProviderId,
  ): Promise<DataEnvelope<unknown>> {
    const provider = this.getMarketDataProvider(providerId);
    if (!provider) {
      return {
        value: null,
        status: "not_supported",
        source: providerId,
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Provider '${providerId}' is not available.`,
      };
    }
    const resolvedAssetId = getAssetId(params.symbol, params.region, params.assetId);
    try {
      return await withMarketDataRuntimeGate({
        providerId: providerId as RuntimeProviderId,
        market: params.region,
        assetId: resolvedAssetId,
        symbol: params.symbol,
        capability: "ohlcv",
        range: params.range,
        interval: params.interval,
        fetcher: () => provider.getOhlcv(params),
      });
    } catch (err) {
      return {
        value: null,
        status: "error",
        source: providerId,
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: err instanceof Error ? err.message : "Provider call failed.",
      };
    }
  }

  /**
   * Resolves price quote from prioritized providers.
   * Falls through the priority chain and returns the first successful response.
   */
  public async getQuote(symbol: string, region: MarketRegion, assetId?: string | null): Promise<DataEnvelope<Quote>> {
    const priority = getPriorityList(region, "quote");
    const resolvedAssetId = getAssetId(symbol, region, assetId);

    if (priority.length === 0) {
      return {
        value: null,
        status: "not_supported",
        source: "market-data-service",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
    }

    for (const profile of priority) {
      const providerId = profile.id as MarketDataProviderId;
      const provider = this.getMarketDataProvider(providerId);
      if (provider) {
        try {
          const result = await withMarketDataRuntimeGate({
            providerId: providerId as RuntimeProviderId,
            market: region,
            assetId: resolvedAssetId,
            symbol,
            capability: "quote",
            fetcher: () => provider.getQuote(symbol),
          });
          if (result.status !== "api_required" && result.status !== "error") {
            return result;
          }
        } catch {
          // Fall back to next provider in priority list
        }
      }
    }

    return {
      value: null,
      status: "api_required",
      source: "market-data-service",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
    };
  }

  /**
   * Resolves historical OHLCV chart data from prioritized providers.
   */
  public async getOhlcv(params: {
    symbol: string;
    region: MarketRegion;
    range: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
    interval: "1D" | "1W" | "1M";
    assetId?: string | null;
  }): Promise<DataEnvelope<unknown>> {
    const priority = getPriorityList(params.region, "ohlcv");
    const resolvedAssetId = getAssetId(params.symbol, params.region, params.assetId);

    if (priority.length === 0) {
      return {
        value: null,
        status: "not_supported",
        source: "market-data-service",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
      };
    }

    for (const profile of priority) {
      const providerId = profile.id as MarketDataProviderId;
      const provider = this.getMarketDataProvider(providerId);
      if (provider) {
        try {
          const result = await withMarketDataRuntimeGate({
            providerId: providerId as RuntimeProviderId,
            market: params.region,
            assetId: resolvedAssetId,
            symbol: params.symbol,
            capability: "ohlcv",
            range: params.range,
            interval: params.interval,
            fetcher: () => provider.getOhlcv(params),
          });
          if (result.status !== "api_required" && result.status !== "error") {
            return result;
          }
        } catch {
          // Fall back
        }
      }
    }

    return {
      value: null,
      status: "api_required",
      source: "market-data-service",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
    };
  }

  private getMarketDataProvider(id: MarketDataProviderId | string) {
    switch (id) {
      case "kis":
        return kisDomesticStockProvider;
      case "yfinance_personal":
        return yfinancePersonalProvider;
      case "finnhub_free":
        return finnhubFreeProvider;
      case "fmp_free":
        return fmpFreeProvider;
      case "alpha_vantage_free":
        return alphaVantageProvider;
      default:
        return null;
    }
  }
}

export const marketDataService = new MarketDataService();

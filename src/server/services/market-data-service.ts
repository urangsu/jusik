import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { getPriorityList } from "../providers/source-priority";
import { kisDomesticStockProvider } from "../providers/kis/kis-domestic-stock-provider";
import { yfinancePersonalProvider } from "../providers/yfinance-personal-provider";
import { finnhubFreeProvider } from "../providers/finnhub-free-provider";
import { fmpFreeProvider } from "../providers/fmp-free-provider";
import { alphaVantageProvider } from "../providers/alpha-vantage-provider";

export class MarketDataService {
  /**
   * Resolves price quote from prioritized providers.
   */
  public async getQuote(symbol: string, region: MarketRegion): Promise<DataEnvelope<Quote>> {
    const priority = getPriorityList(region, "quote");
    
    if (priority.length === 0) {
      return {
        value: null,
        status: "not_supported",
        source: "None",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    for (const profile of priority) {
      const provider = this.getMarketDataProvider(profile.id);
      if (provider) {
        try {
          const result = await provider.getQuote(symbol);
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
      source: "None",
      sourceTier: "official",
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
  }): Promise<DataEnvelope<unknown>> {
    const priority = getPriorityList(params.region, "ohlcv");
    
    if (priority.length === 0) {
      return {
        value: null,
        status: "not_supported",
        source: "None",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    for (const profile of priority) {
      const provider = this.getMarketDataProvider(profile.id);
      if (provider) {
        try {
          const result = await provider.getOhlcv(params);
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
      source: "None",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
    };
  }

  private getMarketDataProvider(id: string) {
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

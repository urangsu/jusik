import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { providerRegistry } from "./provider-registry";
import { providerBudgetManager } from "./provider-budget-manager";
import { MarketDataProvider } from "../adapters/types";

export class AlphaVantageProvider implements MarketDataProvider {
  private providerId = "alpha_vantage_free";

  async getQuote(symbol: string): Promise<DataEnvelope<Quote>> {
    void symbol;
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "Alpha Vantage Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
        message: "Alpha Vantage API Key가 설정되지 않았습니다.",
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Alpha Vantage Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Alpha Vantage Free",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: null,
    };
  }

  async getOhlcv(params: {
    symbol: string;
    region: MarketRegion;
    range: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
    interval: "1D" | "1W" | "1M";
  }): Promise<DataEnvelope<unknown>> {
    void params;
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "Alpha Vantage Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Alpha Vantage Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Alpha Vantage Free",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: null,
    };
  }
}

export const alphaVantageProvider = new AlphaVantageProvider();

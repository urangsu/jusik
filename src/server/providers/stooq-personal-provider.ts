import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { providerRegistry } from "./provider-registry";
import { providerBudgetManager } from "./provider-budget-manager";
import { MarketDataProvider } from "../adapters/types";

export class StooqPersonalProvider implements MarketDataProvider {
  private providerId = "stooq_personal";

  async getQuote(symbol: string): Promise<DataEnvelope<Quote>> {
    void symbol;
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "Stooq",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Stooq",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Stooq",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
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
        source: "Stooq",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Stooq",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Stooq",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: null,
    };
  }
}

export const stooqPersonalProvider = new StooqPersonalProvider();

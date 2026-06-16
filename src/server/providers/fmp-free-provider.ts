import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { providerRegistry } from "./provider-registry";
import { providerBudgetManager } from "./provider-budget-manager";
import { MarketDataProvider, FinancialProvider } from "../adapters/types";

export class FmpFreeProvider implements MarketDataProvider, FinancialProvider {
  private providerId = "fmp_free";

  async getQuote(symbol: string): Promise<DataEnvelope<Quote>> {
    void symbol;
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "Financial Modeling Prep Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
        message: "FMP API Key가 제공되지 않았습니다.",
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Financial Modeling Prep Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Financial Modeling Prep Free",
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
        source: "Financial Modeling Prep Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Financial Modeling Prep Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Financial Modeling Prep Free",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: null,
    };
  }

  async getFinancialStatements(params: {
    symbol: string;
    region: MarketRegion;
    basis: "CFS" | "OFS";
    period: "annual" | "quarter";
  }): Promise<DataEnvelope<unknown>> {
    void params;
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "Financial Modeling Prep Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Financial Modeling Prep Free",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Financial Modeling Prep Free",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: null,
    };
  }
}

export const fmpFreeProvider = new FmpFreeProvider();

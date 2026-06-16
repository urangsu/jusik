import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { providerRegistry } from "./provider-registry";
import { providerBudgetManager } from "./provider-budget-manager";
import { MarketDataProvider, FinancialProvider } from "../adapters/types";

export class YfinancePersonalProvider implements MarketDataProvider, FinancialProvider {
  private providerId = "yfinance_personal";

  async getQuote(symbol: string): Promise<DataEnvelope<Quote>> {
    void symbol;
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "Yahoo Finance via yfinance",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
        message: "yfinance 개인용 fallback은 환경 설정에서 비활성화 상태입니다.",
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Yahoo Finance via yfinance",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Yahoo Finance via yfinance",
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
        source: "Yahoo Finance via yfinance",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Yahoo Finance via yfinance",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Yahoo Finance via yfinance",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
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
        source: "Yahoo Finance via yfinance",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "Yahoo Finance via yfinance",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "Yahoo Finance via yfinance",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: null,
    };
  }
}

export const yfinancePersonalProvider = new YfinancePersonalProvider();

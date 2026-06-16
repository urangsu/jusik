import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Filing } from "@/domain/filing/filing";
import { providerRegistry } from "./provider-registry";
import { providerBudgetManager } from "./provider-budget-manager";
import { FilingProvider, FinancialProvider } from "../adapters/types";

export class OpendartProvider implements FilingProvider, FinancialProvider {
  private providerId = "opendart";

  async getFilings(params: { symbol: string; region: MarketRegion }): Promise<DataEnvelope<Filing[]>> {
    void params;
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: "OpenDART API Key가 설정되지 않았습니다.",
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "OpenDART",
      sourceTier: "official",
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
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: "OpenDART API Key가 설정되지 않았습니다.",
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
    };
  }
}

export const opendartProvider = new OpendartProvider();

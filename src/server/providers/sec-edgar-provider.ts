import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Filing } from "@/domain/filing/filing";
import { providerRegistry } from "./provider-registry";
import { providerBudgetManager } from "./provider-budget-manager";
import { FilingProvider, FinancialProvider } from "../adapters/types";

export class SecEdgarProvider implements FilingProvider, FinancialProvider {
  private providerId = "sec_edgar";

  async getFilings(params: { symbol: string; region: MarketRegion }): Promise<DataEnvelope<Filing[]>> {
    void params;
    if (!providerRegistry.isEnabled(this.providerId)) {
      return {
        value: null,
        status: "api_required",
        source: "SEC EDGAR",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "SEC EDGAR",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "SEC EDGAR",
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
        source: "SEC EDGAR",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "SEC EDGAR",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    return {
      value: null,
      status: "cached",
      source: "SEC EDGAR",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
    };
  }
}

export const secEdgarProvider = new SecEdgarProvider();

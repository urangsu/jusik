import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { getPriorityList } from "../providers/source-priority";
import { opendartProvider } from "../providers/opendart-provider";
import { secEdgarProvider } from "../providers/sec-edgar-provider";
import { fmpFreeProvider } from "../providers/fmp-free-provider";
import { yfinancePersonalProvider } from "../providers/yfinance-personal-provider";

export class FinancialDataService {
  /**
   * Resolves financial statements from prioritized providers.
   */
  public async getFinancialStatements(params: {
    symbol: string;
    region: MarketRegion;
    basis: "CFS" | "OFS";
    period: "annual" | "quarter";
  }): Promise<DataEnvelope<unknown>> {
    const priority = getPriorityList(params.region, "financials");

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
      const provider = this.getFinancialProvider(profile.id);
      if (provider) {
        try {
          const result = await provider.getFinancialStatements(params);
          if (result.status !== "api_required" && result.status !== "error") {
            return result;
          }
        } catch {
          // Fall back to next provider
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

  private getFinancialProvider(id: string) {
    switch (id) {
      case "opendart":
        return opendartProvider;
      case "sec_edgar":
        return secEdgarProvider;
      case "fmp_free":
        return fmpFreeProvider;
      case "yfinance_personal":
        return yfinancePersonalProvider;
      default:
        return null;
    }
  }
}

export const financialDataService = new FinancialDataService();

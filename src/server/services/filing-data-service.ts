/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { getPriorityList } from "../providers/source-priority";
import { opendartProvider } from "../providers/opendart-provider";
import { secEdgarProvider } from "../providers/sec-edgar-provider";

export class FilingDataService {
  /**
   * Resolves filings from prioritized providers.
   */
  public async getFilings(params: {
    symbol: string;
    region: MarketRegion;
  }): Promise<DataEnvelope<any[]>> {
    const priority = getPriorityList(params.region, "filings");

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
      const provider = this.getFilingProvider(profile.id);
      if (provider) {
        try {
          const result = await provider.getFilings(params);
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

  private getFilingProvider(id: string) {
    switch (id) {
      case "opendart":
        return opendartProvider;
      case "sec_edgar":
        return secEdgarProvider;
      default:
        return null;
    }
  }
}

export const filingDataService = new FilingDataService();

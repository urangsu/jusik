import { DataEnvelope } from "@/domain/common/data-status";
import { kisConfig } from "./kis-config";

export interface KisAccountBalance {
  accountNo: string;
  totalAsset: number;
  cashBalance: number;
  positions: Array<{
    symbol: string;
    name: string;
    qty: number;
    purchasePrice: number;
    currentPrice: number;
    evaluationAmount: number;
    profitAndLoss: number;
    profitAndLossRate: number;
  }>;
}

export class KisAccountProvider {
  /**
   * Retrieves account balance details (read-only skeleton).
   */
  public async getBalance(): Promise<DataEnvelope<KisAccountBalance>> {
    return {
      value: null,
      status: kisConfig.isConfigured ? "not_supported" : "api_required",
      source: "KIS Open API (Account)",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: kisConfig.isConfigured
        ? "Read-only account balance parsing is not implemented."
        : "KIS credentials are required.",
    };
  }
}

export const kisAccountProvider = new KisAccountProvider();

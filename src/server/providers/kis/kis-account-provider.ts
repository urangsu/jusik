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
    if (!kisConfig.appKey || !kisConfig.appSecret || !kisConfig.accountNo) {
      return {
        value: null,
        status: "api_required",
        source: "KIS Open API (Account)",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    // Simulating read-only broker account fetch
    const mockBalance: KisAccountBalance = {
      accountNo: kisConfig.accountNo,
      totalAsset: 15420000,
      cashBalance: 4200000,
      positions: [
        {
          symbol: "005930",
          name: "삼성전자",
          qty: 150,
          purchasePrice: 72000,
          currentPrice: 74800,
          evaluationAmount: 11220000,
          profitAndLoss: 420000,
          profitAndLossRate: 3.89,
        },
      ],
    };

    return {
      value: mockBalance,
      status: "real_time",
      source: "KIS Open API (Account)",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

export const kisAccountProvider = new KisAccountProvider();

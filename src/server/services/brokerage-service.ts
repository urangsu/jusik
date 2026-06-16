/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataEnvelope } from "@/domain/common/data-status";
import { kisAccountProvider, KisAccountBalance } from "../providers/kis/kis-account-provider";
import { kisOrderProvider } from "../providers/kis/kis-order-provider";

export class BrokerageService {
  /**
   * Retrieves read-only account balance.
   */
  public async getBalance(): Promise<DataEnvelope<KisAccountBalance>> {
    return kisAccountProvider.getBalance();
  }

  /**
   * Delegates placeOrder request (returns permanent disabled status).
   */
  public async placeOrder(params: {
    symbol: string;
    qty: number;
    price: number;
    side: "buy" | "sell";
  }): Promise<DataEnvelope<any>> {
    return kisOrderProvider.placeOrder(params);
  }
}

export const brokerageService = new BrokerageService();

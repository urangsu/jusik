 
import { DataEnvelope } from "@/domain/common/data-status";
import { kisAccountProvider, KisAccountBalance } from "../providers/kis/kis-account-provider";

export class BrokerageService {
  /**
   * Retrieves read-only account balance.
   */
  public async getBalance(): Promise<DataEnvelope<KisAccountBalance>> {
    return kisAccountProvider.getBalance();
  }
}

export const brokerageService = new BrokerageService();

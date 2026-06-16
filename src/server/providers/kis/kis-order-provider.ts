/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataEnvelope } from "@/domain/common/data-status";

export class KisOrderProvider {
  /**
   * Permanently disabled order method, returning not_supported.
   */
  public async placeOrder(params: {
    symbol: string;
    qty: number;
    price: number;
    side: "buy" | "sell";
  }): Promise<DataEnvelope<any>> {
    void params;
    return {
      value: null,
      status: "not_supported",
      source: "KIS Open API (Order)",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "실거래 주문 및 모의 투자는 지원하지 않는 서비스 범위입니다.",
    };
  }
}

export const kisOrderProvider = new KisOrderProvider();

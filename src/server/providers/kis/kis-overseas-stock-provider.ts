/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { MarketDataProvider } from "../../adapters/types";

export class KisOverseasStockProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<DataEnvelope<Quote>> {
    void symbol;
    return {
      value: null,
      status: "not_supported",
      source: "KIS Open API (Overseas)",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "해외 주식 시세 조회는 지원하지 않는 기능입니다.",
    };
  }

  async getOhlcv(params: {
    symbol: string;
    region: MarketRegion;
    range: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
    interval: "1D" | "1W" | "1M";
  }): Promise<DataEnvelope<any>> {
    void params;
    return {
      value: null,
      status: "not_supported",
      source: "KIS Open API (Overseas)",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "해외 주식 차트 데이터는 지원하지 않는 기능입니다.",
    };
  }
}

export const kisOverseasStockProvider = new KisOverseasStockProvider();

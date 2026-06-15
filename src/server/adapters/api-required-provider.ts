import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";
import { MarketDataProvider, FilingProvider, FinancialProvider } from "./types";

export class ApiRequiredProvider
  implements MarketDataProvider, FilingProvider, FinancialProvider
{
  private sourceName: string;

  constructor(sourceName: string = "System") {
    this.sourceName = sourceName;
  }

  async getQuote(symbol: string): Promise<DataEnvelope<Quote>> {
    void symbol;
    return {
      value: null,
      status: "api_required",
      source: this.sourceName,
      updatedAt: null,
      message: "API 연결이 필요합니다.",
    };
  }

  async getOhlcv(params: {
    symbol: string;
    region: MarketRegion;
    range: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
    interval: "1D" | "1W" | "1M";
  }): Promise<DataEnvelope<unknown>> {
    void params;
    return {
      value: null,
      status: "api_required",
      source: this.sourceName,
      updatedAt: null,
      message: "API 연결이 필요합니다.",
    };
  }

  async getFilings(params: {
    symbol: string;
    region: MarketRegion;
  }): Promise<DataEnvelope<unknown[]>> {
    void params;
    return {
      value: null,
      status: "api_required",
      source: this.sourceName,
      updatedAt: null,
      message: "API 연결이 필요합니다.",
    };
  }

  async getFinancialStatements(params: {
    symbol: string;
    region: MarketRegion;
    basis: "CFS" | "OFS";
    period: "annual" | "quarter";
  }): Promise<DataEnvelope<unknown>> {
    void params;
    return {
      value: null,
      status: "api_required",
      source: this.sourceName,
      updatedAt: null,
      message: "API 연결이 필요합니다.",
    };
  }
}
export const apiRequiredProvider = new ApiRequiredProvider();

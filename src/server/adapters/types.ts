import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Quote } from "@/domain/market/quote";

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<DataEnvelope<Quote>>;
  getOhlcv(params: {
    symbol: string;
    region: MarketRegion;
    range: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
    interval: "1D" | "1W" | "1M";
  }): Promise<DataEnvelope<unknown>>;
}

export interface FilingProvider {
  getFilings(params: {
    symbol: string;
    region: MarketRegion;
  }): Promise<DataEnvelope<unknown[]>>;
}

export interface FinancialProvider {
  getFinancialStatements(params: {
    symbol: string;
    region: MarketRegion;
    basis: "CFS" | "OFS";
    period: "annual" | "quarter";
  }): Promise<DataEnvelope<unknown>>;
}

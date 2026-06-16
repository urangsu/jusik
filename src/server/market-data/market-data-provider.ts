import { DataEnvelope } from "@/domain/common/data-status";
import { Market } from "@/domain/market/exchange";
import { OhlcvInterval, OhlcvRange, OhlcvSeries } from "@/domain/market/ohlcv";
import { Quote } from "@/domain/market/quote";

export type QuoteRequest = {
  assetId: string;
  market: Market;
  symbol: string;
};

export type OhlcvRequest = QuoteRequest & {
  range: OhlcvRange;
  interval: OhlcvInterval;
};

export type MarketDataRequestOptions = {
  signal?: AbortSignal;
};

export interface MarketDataProvider {
  providerId: string;
  getQuote(
    request: QuoteRequest,
    options?: MarketDataRequestOptions,
  ): Promise<DataEnvelope<Quote>>;
  getOhlcv(
    request: OhlcvRequest,
    options?: MarketDataRequestOptions,
  ): Promise<DataEnvelope<OhlcvSeries>>;
}

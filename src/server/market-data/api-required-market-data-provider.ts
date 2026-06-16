import { DataEnvelope } from "@/domain/common/data-status";
import { OhlcvSeries } from "@/domain/market/ohlcv";
import { Quote } from "@/domain/market/quote";
import { MarketDataProvider, MarketDataRequestOptions, OhlcvRequest, QuoteRequest } from "./market-data-provider";

const API_REQUIRED_MESSAGE = "API key or provider connection required.";

function throwIfAborted(options?: MarketDataRequestOptions): void {
  if (options?.signal?.aborted) {
    throw new Error("Market data request aborted.");
  }
}

export class ApiRequiredMarketDataProvider implements MarketDataProvider {
  constructor(public readonly providerId = "api_required_market_data") {}

  async getQuote(
    request: QuoteRequest,
    options?: MarketDataRequestOptions,
  ): Promise<DataEnvelope<Quote>> {
    void request;
    throwIfAborted(options);
    return {
      value: null,
      status: "api_required",
      source: this.providerId,
      updatedAt: null,
      message: API_REQUIRED_MESSAGE,
    };
  }

  async getOhlcv(
    request: OhlcvRequest,
    options?: MarketDataRequestOptions,
  ): Promise<DataEnvelope<OhlcvSeries>> {
    void request;
    throwIfAborted(options);
    return {
      value: null,
      status: "api_required",
      source: this.providerId,
      updatedAt: null,
      message: API_REQUIRED_MESSAGE,
    };
  }
}

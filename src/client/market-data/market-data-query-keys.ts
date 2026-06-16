import { Market } from "@/domain/market/exchange";
import { OhlcvInterval, OhlcvRange } from "@/domain/market/ohlcv";

export const marketDataQueryKeys = {
  quote: (params: {
    providerId: string;
    market: Market;
    assetId: string;
  }) => ["market-data", "quote", params.providerId, params.market, params.assetId] as const,

  ohlcv: (params: {
    providerId: string;
    market: Market;
    assetId: string;
    range: OhlcvRange;
    interval: OhlcvInterval;
  }) =>
    [
      "market-data",
      "ohlcv",
      params.providerId,
      params.market,
      params.assetId,
      params.range,
      params.interval,
    ] as const,
};

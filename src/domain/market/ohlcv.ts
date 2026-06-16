import { Market } from "./exchange";

export type OhlcvRange = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
export type OhlcvInterval = "1D" | "1W" | "1M";

export type OhlcvCandle = {
  assetId: string;
  market: Market;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
  dataVersionId: string;
};

export type OhlcvSeries = {
  assetId: string;
  market: Market;
  range: OhlcvRange;
  interval: OhlcvInterval;
  candles: OhlcvCandle[];
  source: string;
  dataVersionId: string | null;
  updatedAt: string | null;
};

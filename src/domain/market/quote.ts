import { MarketRegion } from "../common/data-status";

export type Quote = {
  assetId: string;
  symbol: string;
  region: MarketRegion;
  last: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  currency: "KRW" | "USD";
  marketTime: string | null;
};

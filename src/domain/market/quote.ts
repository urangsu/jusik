import { Market } from "./exchange";

export type Quote = {
  assetId: string;
  market: Market;
  symbol: string;
  price: number | null;
  currency: "KRW" | "USD";
  change: number | null;
  changePct: number | null;
  volume: number | null;
  tradeDate: string | null;
  updatedAt: string | null;
  source: string;
  dataVersionId: string | null;
};

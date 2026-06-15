import { MarketRegion } from "../common/data-status";

export type Asset = {
  id: string; // e.g., "KR:005930", "US:AAPL"
  region: MarketRegion;
  symbol: string;
  exchange: string;
  nameKo?: string;
  nameEn?: string;
  currency: "KRW" | "USD";
  sector?: string;
  industry?: string;

  identifiers?: {
    dartCorpCode?: string;
    secCik?: string;
    isin?: string;
  };
};

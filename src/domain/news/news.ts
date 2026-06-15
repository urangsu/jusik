import { MarketRegion } from "../common/data-status";

export type News = {
  id: string;
  title: string;
  summary?: string;
  source: string;
  url: string;
  publishedAt: string; // ISO datetime
  region: MarketRegion;
  relatedSymbols: string[];
};

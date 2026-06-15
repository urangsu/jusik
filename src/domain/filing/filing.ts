import { MarketRegion } from "../common/data-status";

export type Filing = {
  id: string;
  assetId: string;
  symbol: string;
  region: MarketRegion;
  title: string;
  publishedAt: string; // ISO datetime
  url: string;
  formType: string; // e.g., "10-K", "10-Q", "사업보고서", "분기보고서"
  uniqueIdentifier?: string; // DART 접수번호 or SEC accession number
};

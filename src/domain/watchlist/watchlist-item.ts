export type WatchlistItem = {
  id: string;

  assetId: string;
  symbol: string;
  nameKo: string | null;
  nameEn: string | null;

  market: "KR" | "US";
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE" | "CUSTOM";

  tags: string[];

  alertEnabled: boolean;
  reportInboxEnabled: boolean;

  createdAt: string;
  updatedAt: string;
};

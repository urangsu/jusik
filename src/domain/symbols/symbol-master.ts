export type SymbolAssetStatus = "active" | "inactive" | "delisted" | "trading_halt";

export type SymbolMasterRecord = {
  assetId: string;
  symbol: string;
  market: "KR" | "US";
  exchange: string;
  nameKo?: string;
  nameEn?: string;
  sector?: string;
  industry?: string;
  currency: "KRW" | "USD";
  assetType: "common_stock" | "preferred_stock" | "etf" | "adr" | "unknown";
  corpCode?: string;
  cik?: string;
  isin?: string;
  status: SymbolAssetStatus;
  source: "seed" | "manual_import" | "provider";
  updatedAt: string;
};

export type SymbolSearchResult = {
  records: SymbolMasterRecord[];
  query: string;
  total: number;
};

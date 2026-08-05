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
  /**
   * Market-level benchmark asset ID for outcome observation (seed metadata only, not live truth).
   * Example: "KR_INDEX_KOSPI" for Korean stocks, "US_SPY" for US stocks.
   */
  marketBenchmarkId?: string;
  /**
   * Sector-level benchmark asset ID for outcome observation (seed metadata only, not live truth).
   * Example: "KR_INDEX_KRX_SEMICONDUCTOR" for semiconductors, "US_XLK" for US tech.
   */
  sectorBenchmarkId?: string;
};

export type SymbolSearchResult = {
  records: SymbolMasterRecord[];
  query: string;
  total: number;
};

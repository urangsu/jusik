import { MarketUniverseId, KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "../universe/market-universe";
import { SourceSummary } from "../source/source-summary";
import { MarketMapTile } from "./market-map-tile";
import { MarketScreenerRow } from "./market-screener-row";

export type MissingDataItem = {
  symbol: string;
  name: string;
  missingFields: string[];
};

export type MarketBoardSnapshot = {
  universeId: MarketUniverseId;
  generatedAt: string;
  sourceSummary: SourceSummary[];
  tiles: MarketMapTile[];
  tableRows: MarketScreenerRow[];
  missingData: MissingDataItem[];
  warnings: string[];
};

// Default Source Summaries matching the PROVIDERS configuration
const DEFAULT_SOURCE_SUMMARIES: SourceSummary[] = [
  { providerId: "opendart", displayName: "OpenDART", tier: "official", status: "healthy", used: 0, limit: null, warnings: [], enabled: true },
  { providerId: "sec_edgar", displayName: "SEC EDGAR", tier: "official", status: "healthy", used: 0, limit: null, warnings: [], enabled: true },
  { providerId: "fmp_free", displayName: "Financial Modeling Prep Free", tier: "free_limited", status: "healthy", used: 0, limit: 250, warnings: [], enabled: true },
  { providerId: "finnhub_free", displayName: "Finnhub Free", tier: "free_limited", status: "disabled", used: 0, limit: 60, warnings: [], enabled: false },
  { providerId: "alpha_vantage_free", displayName: "Alpha Vantage Free", tier: "free_limited", status: "disabled", used: 0, limit: 25, warnings: [], enabled: false },
  { providerId: "yfinance_personal", displayName: "Yahoo Finance via yfinance", tier: "personal_fallback", status: "disabled", used: 0, limit: null, warnings: ["unofficial", "personal_use_only"], enabled: false },
  { providerId: "stooq_personal", displayName: "Stooq", tier: "personal_fallback", status: "disabled", used: 0, limit: null, warnings: ["unofficial", "personal_use_only"], enabled: false }
];

export function buildUnavailableMarketBoardSnapshot(params: {
  universeId: MarketUniverseId;
  constituents: Array<{ assetId: string; symbol: string; nameKo?: string; nameEn?: string; sector?: string; industry?: string }>;
  status?: "api_required" | "insufficient_data";
  generatedAt?: string;
}): MarketBoardSnapshot {
  const status = params.status || "api_required";
  const now = params.generatedAt || new Date().toISOString();

  const tiles: MarketMapTile[] = params.constituents.map((c) => ({
    assetId: c.assetId,
    symbol: c.symbol,
    name: c.nameKo || c.nameEn || c.symbol,
    sector: c.sector || null,
    industry: c.industry || null,
    price: null,
    changePercent: null,
    marketCap: null,
    weight: null,
    volume: null,
    tileSizeMetric: "market_cap",
    dataStatus: status,
    source: "System",
    sourceTier: "official",
    warnings: [],
    updatedAt: now,
  }));

  const tableRows: MarketScreenerRow[] = params.constituents.map((c) => ({
    assetId: c.assetId,
    symbol: c.symbol,
    name: c.nameKo || c.nameEn || c.symbol,
    sector: c.sector || null,
    industry: c.industry || null,
    price: null,
    changePercent: null,
    volume: null,
    turnover: null,
    marketCap: null,
    high52WeekPercent: null,
    return20Day: null,
    return60Day: null,
    per: null,
    pbr: null,
    roe: null,
    dividendYield: null,
    dataStatus: status,
    source: "System",
    sourceTier: "official",
    warnings: [],
    updatedAt: now,
  }));

  return {
    universeId: params.universeId,
    generatedAt: now,
    sourceSummary: DEFAULT_SOURCE_SUMMARIES,
    tiles,
    tableRows,
    missingData: [],
    warnings: ["API 연결 또는 최신 스냅샷 생성이 필요합니다."],
  };
}

export function getDefaultSnapshot(universeId: MarketUniverseId): MarketBoardSnapshot {
  const constituents = universeId === "KOSPI_SAMPLE"
    ? KOSPI_SAMPLE_CONSTITUENTS
    : universeId === "SP500_SAMPLE"
      ? SP500_SAMPLE_CONSTITUENTS
      : [];
  const generatedAt = new Date().toISOString();
  return buildUnavailableMarketBoardSnapshot({
    universeId,
    constituents,
    status: constituents.length > 0 ? "api_required" : "insufficient_data",
    generatedAt,
  });
}

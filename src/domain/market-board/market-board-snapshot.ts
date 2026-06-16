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

// Seed numbers for generating realistic Market Board snapshots
const KR_SEED_NUMBERS: Record<string, { price: number; changePercent: number; capT: number; per: number; pbr: number; roe: number; div: number }> = {
  "005930": { price: 72000, changePercent: 1.25, capT: 430, per: 12.4, pbr: 1.3, roe: 10.5, div: 2.1 },
  "000660": { price: 185000, changePercent: -2.3, capT: 135, per: 18.2, pbr: 2.1, roe: 12.0, div: 1.0 },
  "373220": { price: 380000, changePercent: 0.53, capT: 89, per: 45.0, pbr: 4.5, roe: 8.2, div: 0.1 },
  "207940": { price: 810000, changePercent: 1.12, capT: 58, per: 62.1, pbr: 6.8, roe: 11.2, div: 0.0 },
  "005380": { price: 250000, changePercent: 3.12, capT: 53, per: 5.4, pbr: 0.65, roe: 14.5, div: 4.8 },
  "068270": { price: 190000, changePercent: -0.45, capT: 41, per: 50.3, pbr: 4.2, roe: 7.9, div: 0.5 },
  "005490": { price: 395000, changePercent: -1.2, capT: 33, per: 9.8, pbr: 0.48, roe: 5.1, div: 3.0 },
  "051910": { price: 410000, changePercent: 0.24, capT: 29, per: 15.6, pbr: 1.05, roe: 6.8, div: 2.4 },
  "035420": { price: 180000, changePercent: -1.64, capT: 29, per: 24.3, pbr: 1.25, roe: 5.2, div: 0.9 },
  "000270": { price: 112000, changePercent: 2.45, capT: 45, per: 4.8, pbr: 0.72, roe: 17.2, div: 5.2 },
  "006400": { price: 420000, changePercent: -0.85, capT: 28, per: 21.0, pbr: 1.6, roe: 7.5, div: 0.2 },
  "035720": { price: 46000, changePercent: -2.12, capT: 20, per: 35.4, pbr: 1.8, roe: 4.1, div: 0.1 },
  "105560": { price: 78000, changePercent: 1.56, capT: 31, per: 6.1, pbr: 0.44, roe: 8.8, div: 4.2 },
  "055550": { price: 49000, changePercent: 0.82, capT: 25, per: 5.8, pbr: 0.38, roe: 8.5, div: 4.5 },
  "003550": { price: 82000, changePercent: 0.0, capT: 12, per: 8.2, pbr: 0.55, roe: 6.4, div: 3.5 },
  "012330": { price: 235000, changePercent: 1.15, capT: 22, per: 6.4, pbr: 0.52, roe: 8.1, div: 2.1 },
  "066570": { price: 102000, changePercent: 0.59, capT: 16, per: 9.1, pbr: 0.85, roe: 9.5, div: 1.8 },
  "096770": { price: 110000, changePercent: -1.35, capT: 10, per: 12.0, pbr: 0.45, roe: 3.8, div: 1.5 },
  "000810": { price: 310000, changePercent: 2.15, capT: 14, per: 7.5, pbr: 0.75, roe: 10.1, div: 4.9 },
  "086790": { price: 43000, changePercent: 0.93, capT: 12, per: 4.9, pbr: 0.32, roe: 8.2, div: 5.8 }
};

const US_SEED_NUMBERS: Record<string, { price: number; changePercent: number; capB: number; per: number; pbr: number; roe: number; div: number }> = {
  "AAPL": { price: 182.5, changePercent: 0.85, capB: 2850, per: 29.5, pbr: 38.2, roe: 154.2, div: 0.53 },
  "MSFT": { price: 415.2, changePercent: 1.45, capB: 3100, per: 36.4, pbr: 12.8, roe: 38.5, div: 0.72 },
  "NVDA": { price: 875.0, changePercent: 4.23, capB: 2180, per: 72.1, pbr: 48.0, roe: 91.5, div: 0.02 },
  "AMZN": { price: 175.4, changePercent: -0.65, capB: 1820, per: 60.5, pbr: 8.5, roe: 18.4, div: 0.0 },
  "GOOGL": { price: 148.2, changePercent: -1.12, capB: 1850, per: 25.2, pbr: 6.2, roe: 26.5, div: 0.0 },
  "META": { price: 505.4, changePercent: 2.15, capB: 1280, per: 32.8, pbr: 9.2, roe: 29.4, div: 0.4 },
  "BRK.B": { price: 408.0, changePercent: 0.12, capB: 880, per: 10.4, pbr: 1.55, roe: 14.2, div: 0.0 },
  "TSLA": { price: 171.2, changePercent: -3.45, capB: 545, per: 42.1, pbr: 8.2, roe: 21.0, div: 0.0 },
  "LLY": { price: 760.5, changePercent: 1.82, capB: 720, per: 115.4, pbr: 45.2, roe: 42.1, div: 0.68 },
  "AVGO": { price: 1350.0, changePercent: 2.34, capB: 625, per: 28.5, pbr: 11.2, roe: 34.0, div: 1.56 },
  "JPM": { price: 195.4, changePercent: -0.45, capB: 565, per: 11.8, pbr: 1.65, roe: 15.1, div: 2.3 },
  "UNH": { price: 480.0, changePercent: -1.56, capB: 445, per: 18.5, pbr: 4.8, roe: 25.4, div: 1.6 },
  "XOM": { price: 112.5, changePercent: 0.56, capB: 450, per: 12.2, pbr: 2.1, roe: 21.0, div: 3.4 },
  "V": { price: 275.4, changePercent: 0.43, capB: 560, per: 31.5, pbr: 32.5, roe: 45.2, div: 0.76 },
  "PG": { price: 160.2, changePercent: -0.22, capB: 380, per: 25.5, pbr: 7.8, roe: 31.2, div: 2.4 },
  "COST": { price: 725.5, changePercent: 0.95, capB: 320, per: 45.6, pbr: 15.5, roe: 28.4, div: 0.58 },
  "JNJ": { price: 155.4, changePercent: -0.82, capB: 375, per: 15.2, pbr: 5.2, roe: 32.5, div: 3.1 },
  "MA": { price: 470.0, changePercent: 0.65, capB: 435, per: 35.8, pbr: 52.4, roe: 121.2, div: 0.55 },
  "HD": { price: 382.4, changePercent: -0.15, capB: 380, per: 22.4, pbr: 155.0, roe: 642.1, div: 2.3 },
  "MRK": { price: 125.6, changePercent: 0.88, capB: 318, per: 17.5, pbr: 6.8, roe: 21.4, div: 2.45 }
};

export function getDefaultSnapshot(universeId: MarketUniverseId): MarketBoardSnapshot {
  if (universeId === "KOSPI_SAMPLE") {
    const tiles: MarketMapTile[] = KOSPI_SAMPLE_CONSTITUENTS.map((c) => {
      const stats = KR_SEED_NUMBERS[c.symbol] || { price: 0, changePercent: 0, capT: 0, per: 0, pbr: 0, roe: 0, div: 0 };
      return {
        assetId: c.assetId,
        symbol: c.symbol,
        name: c.nameKo || c.symbol,
        sector: c.sector || null,
        industry: c.industry || null,
        price: stats.price,
        changePercent: stats.changePercent,
        marketCap: stats.capT * 1_000_000_000_000,
        weight: null,
        volume: 1200000,
        tileSizeMetric: "market_cap",
        dataStatus: "cached",
        source: "FMP Free / OpenDART manual baseline",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: new Date().toISOString()
      };
    });

    const tableRows: MarketScreenerRow[] = KOSPI_SAMPLE_CONSTITUENTS.map((c) => {
      const stats = KR_SEED_NUMBERS[c.symbol] || { price: 0, changePercent: 0, capT: 0, per: 0, pbr: 0, roe: 0, div: 0 };
      return {
        assetId: c.assetId,
        symbol: c.symbol,
        name: c.nameKo || c.symbol,
        sector: c.sector || null,
        industry: c.industry || null,
        price: stats.price,
        changePercent: stats.changePercent,
        volume: 1200000,
        turnover: stats.price * 1200000,
        marketCap: stats.capT * 1_000_000_000_000,
        high52WeekPercent: -12.5,
        return20Day: 4.8,
        return60Day: -2.3,
        per: stats.per,
        pbr: stats.pbr,
        roe: stats.roe,
        dividendYield: stats.div,
        dataStatus: "cached",
        source: "FMP Free / OpenDART manual baseline",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: new Date().toISOString()
      };
    });

    return {
      universeId,
      generatedAt: new Date().toISOString(),
      sourceSummary: DEFAULT_SOURCE_SUMMARIES,
      tiles,
      tableRows,
      missingData: [],
      warnings: []
    };
  } else if (universeId === "SP500_SAMPLE") {
    const tiles: MarketMapTile[] = SP500_SAMPLE_CONSTITUENTS.map((c) => {
      const stats = US_SEED_NUMBERS[c.symbol] || { price: 0, changePercent: 0, capB: 0, per: 0, pbr: 0, roe: 0, div: 0 };
      return {
        assetId: c.assetId,
        symbol: c.symbol,
        name: c.nameEn || c.symbol,
        sector: c.sector || null,
        industry: c.industry || null,
        price: stats.price,
        changePercent: stats.changePercent,
        marketCap: stats.capB * 1_000_000_000,
        weight: null,
        volume: 3500000,
        tileSizeMetric: "market_cap",
        dataStatus: "cached",
        source: "FMP Free / SEC manual baseline",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: new Date().toISOString()
      };
    });

    const tableRows: MarketScreenerRow[] = SP500_SAMPLE_CONSTITUENTS.map((c) => {
      const stats = US_SEED_NUMBERS[c.symbol] || { price: 0, changePercent: 0, capB: 0, per: 0, pbr: 0, roe: 0, div: 0 };
      return {
        assetId: c.assetId,
        symbol: c.symbol,
        name: c.nameEn || c.symbol,
        sector: c.sector || null,
        industry: c.industry || null,
        price: stats.price,
        changePercent: stats.changePercent,
        volume: 3500000,
        turnover: stats.price * 3500000,
        marketCap: stats.capB * 1_000_000_000,
        high52WeekPercent: -8.4,
        return20Day: 2.1,
        return60Day: 8.5,
        per: stats.per,
        pbr: stats.pbr,
        roe: stats.roe,
        dividendYield: stats.div,
        dataStatus: "cached",
        source: "FMP Free / SEC manual baseline",
        sourceTier: "free_limited",
        warnings: [],
        updatedAt: new Date().toISOString()
      };
    });

    return {
      universeId,
      generatedAt: new Date().toISOString(),
      sourceSummary: DEFAULT_SOURCE_SUMMARIES,
      tiles,
      tableRows,
      missingData: [],
      warnings: []
    };
  }

  // default empty snapshot for full universes or fallback
  return {
    universeId,
    generatedAt: new Date().toISOString(),
    sourceSummary: DEFAULT_SOURCE_SUMMARIES,
    tiles: [],
    tableRows: [],
    missingData: [],
    warnings: ["Full universe is not initialized. Manual import of CSV required."]
  };
}

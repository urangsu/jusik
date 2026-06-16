import { DataStatus } from "../common/data-status";
import { SourceUsagePolicy, SourceWarning } from "../source/provider-tier";

export type MarketScreenerRow = {
  assetId: string;
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;

  price: number | null;
  changePercent: number | null;
  volume: number | null;
  turnover: number | null; // 거래대금
  marketCap: number | null;

  high52WeekPercent: number | null; // 52주 고점 대비
  return20Day: number | null; // 20일 수익률
  return60Day: number | null; // 60일 수익률

  per: number | null;
  pbr: number | null;
  roe: number | null;
  dividendYield: number | null;

  dataStatus: DataStatus;
  source: string;
  sourceTier: SourceUsagePolicy;
  warnings: SourceWarning[];
  updatedAt: string | null;
};

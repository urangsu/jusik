import { DataStatus } from "../common/data-status";
import { SourceUsagePolicy, SourceWarning } from "../source/provider-tier";

export type MarketMapTile = {
  assetId: string;
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;

  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  weight: number | null;
  volume: number | null;

  tileSizeMetric: "market_cap" | "index_weight" | "equal";
  dataStatus: DataStatus;
  source: string;
  sourceTier: SourceUsagePolicy;
  warnings: SourceWarning[];
  updatedAt: string | null;
};

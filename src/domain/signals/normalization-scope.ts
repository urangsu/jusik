import { MarketRegion } from "@/domain/common/data-status";

export type NormalizationMethod =
  | "zscore"
  | "rank_percentile"
  | "winsorized_zscore"
  | "sector_neutral_zscore";

export type NormalizationScope = {
  market: MarketRegion;
  universe: string;
  sector?: string;
  method: NormalizationMethod;
  winsorizePct?: number;
};

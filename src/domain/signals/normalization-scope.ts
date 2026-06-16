import { MarketRegion } from "@/domain/common/data-status";
import { UniverseId } from "@/domain/universe/universe";

export type NormalizationMethod =
  | "zscore"
  | "rank_percentile"
  | "winsorized_zscore"
  | "sector_neutral_zscore";

export type NormalizationScope = {
  market: MarketRegion;
  universeId: UniverseId;
  universe: string;
  sector?: string;
  method: NormalizationMethod;
  winsorizePct?: number;
  dataVersionId?: string;
};

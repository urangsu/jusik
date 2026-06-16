import { MarketRegion } from "@/domain/common/data-status";
import { NormalizationScope } from "./normalization-scope";

export type AtomicSignalStatus =
  | "valid"
  | "api_required"
  | "insufficient_data"
  | "stale"
  | "not_supported"
  | "error";

export type AtomicSignalName =
  | "roe_ttm"
  | "roic_ttm"
  | "gross_margin_ttm"
  | "accruals_ratio"
  | "leverage_ratio"
  | "book_to_market"
  | "earnings_yield"
  | "fcf_yield"
  | "return_12m_ex1m"
  | "return_6m_ex1m"
  | "relative_strength_60d"
  | "eps_revision_3m"
  | "realized_vol_60d"
  | "residual_vol_60d"
  | "stddev_z20"
  | "close_location_value"
  | "gap_recovery"
  | "volume_z20"
  | "foreign_flow_z20"
  | "short_interest_change";

export type AtomicSignal = {
  atomicSignalId: string;
  assetId: string;
  market: MarketRegion;
  universe: string;
  date: string;
  name: AtomicSignalName;
  rawValue: number | null;
  normalizedValue: number | null;
  percentile: number | null;
  zScore: number | null;
  status: AtomicSignalStatus;
  source: string;
  dataVersionId: string;
  calculatedAt: string;
  normalizationScope?: NormalizationScope;
};

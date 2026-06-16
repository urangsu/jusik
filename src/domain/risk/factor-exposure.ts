import { MarketRegion } from "@/domain/common/data-status";
import { FactorId } from "@/domain/factors/factor-id";

export type FactorExposureRecord = {
  assetId: string;
  date: string;
  market: MarketRegion;
  universe: string;
  exposures: Record<FactorId, number | null>;
  sectorExposure?: Record<string, number>;
  countryExposure?: Record<string, number>;
  currencyExposure?: Record<string, number>;
  dataQualityScore: number;
  engineVersion: string;
  dataVersionId: string;
};

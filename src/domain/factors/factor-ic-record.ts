import { MarketRegion } from "@/domain/common/data-status";
import { FactorId } from "./factor-id";

export type FactorHorizon = "1w" | "1m" | "3m";

export type FactorICRecord = {
  factorId: FactorId;
  market: MarketRegion;
  universe: string;
  calcDate: string;
  horizon: FactorHorizon;
  ic: number | null;
  rankIc: number | null;
  icir: number | null;
  rankIcir: number | null;
  hitRate: number | null;
  sampleSize: number;
  groupNeutral: boolean;
  sectorNeutral: boolean;
  startDate: string;
  endDate: string;
  engineVersion: string;
  dataVersionId: string;
};

import { FactorId } from "@/domain/factors/factor-id";

export type FactorCovarianceMatrix = {
  date: string;
  market: "KR" | "US" | "GLOBAL";
  universe: string;
  lookbackDays: 60 | 120 | 252;
  factorIds: FactorId[];
  covariance: number[][];
  shrinkageMethod: "none" | "diagonal" | "ledoit_wolf_like";
  annualized: boolean;
  engineVersion: string;
  configHash: string;
  dataVersionId: string;
};

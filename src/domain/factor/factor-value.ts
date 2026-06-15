import { DataStatus } from "../common/data-status";

export type FactorValue = {
  assetId: string;
  date: string;
  factorName: string;
  value: number | null;
  percentile: number | null;
  zScore: number | null;
  status: DataStatus;
  source: string;
};

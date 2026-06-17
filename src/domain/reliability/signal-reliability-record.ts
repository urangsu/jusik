import { ReliabilityWarning } from "./reliability-warning";

export type ReliabilityHorizon = "1w" | "1m" | "3m";

export type ReliabilitySampleStatus =
  | "insufficient_sample"
  | "usable"
  | "robust";

export type SignalReliabilityRecord = {
  id: string; // e.g. "KOSPI_SAMPLE_momentum_ichimoku_1m"

  signalId: string;
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  horizon: ReliabilityHorizon;

  sampleSize: number;
  sampleStatus: ReliabilitySampleStatus;

  avgForwardReturn: number | null;
  avgExcessReturn: number | null;

  positiveRate: number | null;
  hitRate: number | null;

  spearmanIcMean: number | null;
  spearmanIcStd: number | null;
  icir: number | null;

  shrunkHitRate: number | null;
  shrunkIc: number | null;

  reliabilityScore: number | null; // 0~100
  reliabilityLabel:
    | "insufficient_sample"
    | "low"
    | "medium"
    | "high";

  weightMultiplier: number | null; // preview only

  warnings: ReliabilityWarning[];

  calculatedAt: string;
  engineVersion: string;
};

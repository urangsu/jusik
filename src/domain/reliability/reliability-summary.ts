import { SignalReliabilityRecord } from "./signal-reliability-record";
import { ReliabilityWarning } from "./reliability-warning";

export type ReliabilitySummary = {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  calculatedAt: string;
  engineVersion: string;

  records: SignalReliabilityRecord[];

  aggregate: {
    totalSignals: number;
    robustSignals: number;
    insufficientSampleSignals: number;
    negativeIcSignals: number;
    personalFallbackAffectedSignals: number;
  };

  warnings: ReliabilityWarning[];
};

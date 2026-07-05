export type SignalStabilityStatus = "passed" | "blocked" | "insufficient_data";

export type SignalStability = {
  assetId: string;
  signalId: string;
  universeId?: string;
  date: string;
  consecutiveObservations: number;
  flipCount30d: number;
  rankAutocorrelation: number | null;
  status: SignalStabilityStatus;
  actionableThresholdMet: boolean;
  warnings: string[];
};

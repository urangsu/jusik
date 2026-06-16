export type SignalStability = {
  assetId: string;
  signalId: string;
  date: string;
  consecutiveDays: number;
  flipCount30d: number;
  rankAutocorrelation: number | null;
  actionableThresholdMet: boolean;
  warnings: string[];
};

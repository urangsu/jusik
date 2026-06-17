import { SignalHorizon } from "../factors/factor-horizon";

export type ViewReliabilityRecord = {
  viewId: string;
  horizon: SignalHorizon;
  universeId: string;

  sampleSize: number;
  hitRate: number | null;
  avgForwardReturn: number | null;
  ic: number | null;

  priorSource: "backtest" | "live_tracking" | "none";
  priorWeight: number;
  calculatedAt: string;
};

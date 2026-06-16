import { DataStatus } from "@/domain/common/data-status";

export type StdDevWindow = 20 | 60 | 120;

export type StdDevPosition =
  | "deep_oversold"
  | "oversold"
  | "neutral"
  | "overbought"
  | "deep_overbought"
  | "insufficient_data";

export type StdDevSignalDirection =
  | "mean_reversion_watch"
  | "overextension_risk"
  | "neutral"
  | "insufficient_data";

export type StdDevSignal = {
  assetId: string;
  symbol: string;
  date: string;
  window: StdDevWindow;

  lastPrice: number | null;
  movingAverage: number | null;
  standardDeviation: number | null;
  zScore: number | null;

  upper1: number | null;
  upper2: number | null;
  upper3: number | null;
  lower1: number | null;
  lower2: number | null;
  lower3: number | null;

  position: StdDevPosition;
  direction: StdDevSignalDirection;
  signalStrength: number | null;

  status: DataStatus;
  dataQualityScore: number;
  vetoReasons: string[];
  explanation: string;
};

import { DataStatus } from "@/domain/common/data-status";
import { SignalHorizon } from "./factor-horizon";

export type AtomicSignal = {
  assetId: string;
  factorId: string;
  date: string;
  horizon: SignalHorizon;
  score: number | null;
  signalLabel: "bullish" | "bearish" | "neutral" | "insufficient_data";
  dataStatus: DataStatus;
  calculatedAt: string;
  metadata?: Record<string, any>;
};

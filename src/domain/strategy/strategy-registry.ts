import { SignalHorizon } from "../factors/factor-horizon";
import { StrategyTrialRecord } from "./strategy-trial-record";

export type StrategySpec = {
  strategyId: string;
  name: string;
  description: string;
  factors: string[];
  horizon: SignalHorizon;
  active: boolean;
};

export type StrategyRegistryRecord = {
  strategySpecId: string;
  spec: StrategySpec;
  status: "draft" | "backtested" | "rejected" | "active" | "retired";
  rejectionReason?: string;
  allTrialResults: StrategyTrialRecord[];
  createdAt: string;
  updatedAt: string;
};

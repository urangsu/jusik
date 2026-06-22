export type StrategyTrialEventType =
  | "created"
  | "backtest_attached"
  | "status_changed"
  | "rejection_recorded"
  | "postmortem_attached"
  | "memo_updated";

export type StrategyTrialEvent = {
  id: string;
  trialId: string;
  type: StrategyTrialEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};

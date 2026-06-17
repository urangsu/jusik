export type StrategyTrialRecord = {
  strategyId: string;
  observedSharpe: number | null;
  sampleLength: number;
  triedAt: string;
  status: "rejected" | "backtested" | "active" | "retired";
  notes?: string;
};

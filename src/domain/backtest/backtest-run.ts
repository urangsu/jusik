export type BacktestRunStatus = "pending" | "running" | "done" | "error";

export type BacktestStrategy = "momentum_v1_long_only";

export type BacktestRun = {
  runId: string;
  strategy: BacktestStrategy;
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  startDate: string;
  endDate: string;
  status: BacktestRunStatus;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

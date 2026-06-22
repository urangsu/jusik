export type SignalPostmortemStatus =
  | "draft"
  | "auto_generated"
  | "reviewed"
  | "ignored";

export type SignalPostmortemOutcome =
  | "positive"
  | "negative"
  | "flat"
  | "missing_price"
  | "not_evaluable";

export type SignalPostmortem = {
  id: string;

  trialId: string;
  backtestRunId: string | null;

  strategyId: "momentum_v1_long_only";
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  windowIndex: number;
  testStart: string;
  testEnd: string;

  assetId: string;
  symbol: string;

  rank: number;
  signalScore: number;

  entryDate: string;
  entryPrice: number | null;

  exitDate: string | null;
  exitPrice: number | null;

  grossReturn: number | null;
  netReturn: number | null;

  benchmarkReturn: number | null;
  excessReturn: number | null;

  outcome: SignalPostmortemOutcome;

  dataWarnings: string[];
  biasWarnings: string[];

  reviewNotes: string | null;

  status: SignalPostmortemStatus;

  createdAt: string;
  updatedAt: string;
};

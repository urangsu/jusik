export type OutcomeSubjectType =
  | "signal"
  | "audit_finding"
  | "strategy_trial"
  | "watchlist_report";

export type OutcomeHorizon =
  | "forward_5d"
  | "forward_20d"
  | "forward_60d";

export type SignalOutcomeJournalRecord = {
  id: string;

  subjectType: OutcomeSubjectType;
  subjectId: string;

  assetId: string | null;
  signalId: string | null;
  strategyId: string | null;

  horizon: OutcomeHorizon;

  observedForwardReturn: number | null;
  benchmarkReturn: number | null;
  alphaReturn: number | null;

  initialWarnings: string[];
  finalWarnings: string[];

  outcomeStatus:
    | "pending"
    | "observed"
    | "insufficient_data"
    | "error";

  lesson: string | null;
  confidenceAdjustment:
    | "increase"
    | "decrease"
    | "unchanged"
    | "not_applicable";

  evidencePackIds: string[];
  benchmarkSourceRef: string | null;

  createdAt: string;
  observedAt: string | null;
};

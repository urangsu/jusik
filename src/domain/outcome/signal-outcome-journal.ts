export type OutcomeSubjectType =
  | "signal"
  | "audit_finding"
  | "strategy_trial"
  | "watchlist_report";

export type OutcomeHorizon =
  | "forward_5d"
  | "forward_20d"
  | "forward_60d";

/**
 * Immutable, append-only outcome record.
 *
 * Every observation creates a NEW record with a higher revision number;
 * the previous revision is never overwritten. To get the latest state
 * for a root outcome use `listLatestOutcomeRecords`.
 */
export type SignalOutcomeJournalRecord = {
  /** Unique ID for this revision: `{rootOutcomeId}_r{revision}` for observations, or original ID for revision 0 */
  id: string;

  /** Stable ID shared across all revisions of the same logical outcome */
  rootOutcomeId: string;

  /** ID of the record this one supersedes, or null for revision 0 */
  supersedesOutcomeId: string | null;

  /** Monotonically increasing revision counter; 0 = initial pending record */
  revision: number;

  subjectType: OutcomeSubjectType;
  subjectId: string;

  /** Canonical asset being tracked; required */
  assetId: string;

  /** Universe ID (e.g. KOSPI_SAMPLE, SP500_SAMPLE); required */
  universeId: string;

  signalId: string | null;
  strategyId: string | null;

  /**
   * The ISO-8601 timestamp at which observation was declared to start.
   * The base bar is the FIRST trading bar with date >= observationStartedAt.slice(0, 10).
   * Required.
   */
  observationStartedAt: string;

  /**
   * dataVersionId returned by the OHLCV loader at the time of observation.
   * Null when not yet observed.
   */
  basePriceDataVersionId: string | null;

  horizon: OutcomeHorizon;

  /** YYYY-MM-DD of the first trading bar that qualifies as the base */
  baseTradeDate: string | null;

  /** YYYY-MM-DD of the bar exactly N trading days after baseTradeDate */
  targetTradeDate: string | null;

  observedForwardReturn: number | null;

  /** Market-level benchmark (e.g. KOSPI, S&P 500 ETF) */
  marketBenchmarkAssetId: string | null;
  marketBenchmarkReturn: number | null;
  marketExcessReturn: number | null;
  marketBenchmarkDataVersionId: string | null;

  /** Sector-level benchmark (e.g. KRX Semiconductor ETF, XLK) */
  sectorBenchmarkAssetId: string | null;
  sectorBenchmarkReturn: number | null;
  sectorExcessReturn: number | null;
  sectorBenchmarkDataVersionId: string | null;

  initialWarnings: string[];
  finalWarnings: string[];

  outcomeStatus:
    | "pending"
    | "observed"
    | "insufficient_data"
    | "error";

  lesson: string | null;

  /**
   * A single observation never automatically changes confidence.
   * Multiple observations in aggregate are evaluated separately.
   */
  confidenceAdjustment: "not_applicable";

  evidencePackIds: string[];

  createdAt: string;
  observedAt: string | null;
};

export type BenchmarkMapping = {
  universeId: string;
  marketBenchmarkAssetId: string;
  sectorBenchmarkAssetId: string | null;
  provenance: string;
};

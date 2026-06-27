export type DiagnosticCaseType =
  | "bull_case"
  | "bear_case"
  | "neutral_risk"
  | "evidence_gap";

export type DiagnosticDebateCase = {
  id: string;
  type: DiagnosticCaseType;
  title: string;
  summary: string;

  evidencePackIds: string[];
  reportSectionIds: string[];

  strength: "low" | "medium" | "high";
  limitations: string[];
  warnings: string[];
};

export type DiagnosticDebateReport = {
  id: string;
  subjectType: "asset" | "watchlist" | "audit";
  subjectId: string;

  cases: DiagnosticDebateCase[];

  balanceSummary: string;
  unresolvedQuestions: string[];

  blockedTerms: string[];
  isBlocked: boolean;
  blockReasons: string[];

  createdAt: string;
};

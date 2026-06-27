export type ReportSectionType =
  | "technical"
  | "flow"
  | "financial"
  | "filing"
  | "risk"
  | "market"
  | "evidence_gap";

export type ReportSection = {
  id: string;
  type: ReportSectionType;
  title: string;
  summary: string;

  evidencePackIds: string[];
  claimSourceIds: string[];

  confidence: "low" | "medium" | "high";
  limitations: string[];
  warnings: string[];

  createdAt: string;
};

export type FindingSynthesisReport = {
  id: string;
  subjectType: "asset" | "watchlist" | "audit";
  subjectId: string;

  sections: ReportSection[];

  synthesisSummary: string;
  keyRisks: string[];
  evidenceGaps: string[];

  blockedTerms: string[];
  isBlocked: boolean;
  blockReasons: string[];

  createdAt: string;
  engineVersion: string;
};

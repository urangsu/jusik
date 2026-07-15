import type { ResearchMethodRuleId } from "./method-rule";

export type ThesisPillarStatus =
  | "confirming"
  | "mixed"
  | "deteriorating"
  | "unverified"
  | "stale";

export type ThesisPillar = {
  pillarId: string;
  assetId: string;
  title: string;
  methodRuleIds: ResearchMethodRuleId[];
  status: ThesisPillarStatus;
  claimIds: string[];
  confirmingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  missingInputs: string[];
  confirmIf: string[];
  warnIf: string[];
  breakIf: string[];
  nextEvidenceDueAt: string | null;
  corePillar: boolean;
};

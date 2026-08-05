import type { ThesisPillar } from "./thesis-pillar";
import type { SignalVersion } from "@/domain/signals/signal-version";

export type ThesisArcSnapshot = {
  snapshotId: string;
  assetId: string;
  asOfDate: string;
  companyThesisStatus: "confirming" | "mixed" | "deteriorating" | "insufficient_data";
  securityReadiness: "diagnostic_only" | "not_decision_grade";
  pillars: ThesisPillar[];
  firstClaimAt: string | null;
  latestClaimAt: string | null;
  changeReasons: string[];
  requiredNextEvidence: string[];
  dataVersionIds: string[];
  signalVersion: SignalVersion | null;
};

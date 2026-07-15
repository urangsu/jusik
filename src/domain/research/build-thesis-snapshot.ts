import type { ThesisPillar } from "./thesis-pillar";
import type { ThesisArcSnapshot } from "./thesis-snapshot";
import type { SignalVersion } from "@/domain/signals/signal-version";

export type BuildThesisSnapshotInput = {
  assetId: string;
  asOfDate: string;
  pillars: ThesisPillar[];
  priceEvidenceAvailable: boolean;
  valuationEvidenceAvailable: boolean;
  filingsAvailable: boolean;
  dataVersionIds: string[];
  signalVersion: SignalVersion;
  firstClaimAt: string | null;
  latestClaimAt: string | null;
  changeReasons: string[];
  requiredNextEvidence: string[];
};

export function buildThesisSnapshot(input: BuildThesisSnapshotInput): ThesisArcSnapshot {
  const {
    assetId,
    asOfDate,
    pillars,
    priceEvidenceAvailable,
    valuationEvidenceAvailable,
    filingsAvailable,
    dataVersionIds,
    signalVersion,
    firstClaimAt,
    latestClaimAt,
    changeReasons,
    requiredNextEvidence,
  } = input;

  const corePillars = pillars.filter((p) => p.corePillar);

  // 1. Determine company thesis status
  let companyThesisStatus: ThesisArcSnapshot["companyThesisStatus"] = "insufficient_data";

  if (!filingsAvailable || pillars.length === 0) {
    companyThesisStatus = "insufficient_data";
  } else {
    // Check nextEvidenceDueAt to flag stales
    const resolvedPillars = pillars.map((p) => {
      if (p.nextEvidenceDueAt && p.nextEvidenceDueAt < asOfDate) {
        return { ...p, status: "stale" as const };
      }
      return p;
    });

    const resolvedCorePillars = resolvedPillars.filter((p) => p.corePillar);

    const deterioratingCoreCount = resolvedCorePillars.filter(
      (p) => p.status === "deteriorating",
    ).length;

    const hasMixedCore = resolvedCorePillars.some((p) => p.status === "mixed");
    const hasStaleCore = resolvedCorePillars.some((p) => p.status === "stale");
    const allCoreConfirming =
      resolvedCorePillars.length > 0 &&
      resolvedCorePillars.every((p) => p.status === "confirming");

    if (deterioratingCoreCount >= 2) {
      companyThesisStatus = "deteriorating";
    } else if (deterioratingCoreCount === 1 || hasMixedCore || hasStaleCore) {
      // One deteriorating/contradicted or mixed/stale core pillar prevents aggregate confirming
      companyThesisStatus = "mixed";
    } else if (allCoreConfirming) {
      companyThesisStatus = "confirming";
    } else {
      companyThesisStatus = "mixed";
    }
  }

  // 2. Determine security readiness
  // Missing price or valuation always produces not_decision_grade
  let securityReadiness: ThesisArcSnapshot["securityReadiness"] = "not_decision_grade";
  if (priceEvidenceAvailable && valuationEvidenceAvailable) {
    securityReadiness = "diagnostic_only";
  }

  return {
    snapshotId: `snap_${assetId}_${Date.parse(asOfDate) || Date.now()}`,
    assetId,
    asOfDate,
    companyThesisStatus,
    securityReadiness,
    pillars,
    firstClaimAt,
    latestClaimAt,
    changeReasons,
    requiredNextEvidence,
    dataVersionIds,
    signalVersion,
  };
}

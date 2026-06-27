import type { EvidencePack, EvidenceRef, EvidenceClaimType, EvidenceSourceType } from "@/domain/evidence/evidence-pack";
import type { AuditFinding } from "@/domain/audit/audit-finding";
import type { WatchlistReportItem } from "@/domain/watchlist/watchlist-report-item";
import type { DataEnvelope } from "@/domain/common/data-status";

function determineClaimTypes(sourceType: string): EvidenceClaimType[] {
  switch (sourceType) {
    case "individual_signal_ic":
    case "strategy_trial":
      return ["signal", "factor"];
    case "factor_correlation":
      return ["correlation", "factor"];
    case "market_exposure":
      return ["market_exposure", "risk"];
    case "signal_postmortem":
      return ["risk", "signal"];
    case "opendart_filing":
      return ["filing"];
    case "market_quote":
      return ["price", "volume"];
    case "ohlcv":
      return ["price", "volume"];
    default:
      return ["unknown"];
  }
}

function evaluateFreshness(refs: EvidenceRef[]): "fresh" | "stale" | "mixed" | "unknown" {
  if (refs.length === 0) return "unknown";

  let hasFresh = false;
  let hasStale = false;

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const ref of refs) {
    const isStatusStale = ref.status === "stale";
    let isDateStale = false;
    if (ref.updatedAt) {
      const diff = now - new Date(ref.updatedAt).getTime();
      if (diff > ONE_DAY_MS) {
        isDateStale = true;
      }
    }

    if (isStatusStale || isDateStale) {
      hasStale = true;
    } else {
      hasFresh = true;
    }
  }

  if (hasFresh && hasStale) return "mixed";
  if (hasStale) return "stale";
  return "fresh";
}

export function buildEvidencePackFromAuditFinding(input: {
  finding: AuditFinding;
  relatedEnvelopes?: DataEnvelope<unknown>[];
}): EvidencePack {
  const { finding, relatedEnvelopes = [] } = input;
  const nowStr = new Date().toISOString();

  const evidenceRefs: EvidenceRef[] = [];
  const missingEvidence: string[] = [];
  const limitations: string[] = [];

  // 1. Add finding itself as a reference
  const findingRef: EvidenceRef = {
    id: `ref_finding_${finding.id}`,
    sourceType: "audit_finding",
    sourceId: finding.id,
    source: finding.title || "Audit Finding",
    sourceTier: finding.sourceTier || "unknown",
    status: "cached", // findings are aggregated and stored
    updatedAt: finding.calculatedAt || finding.detectedAt || nowStr,
    warnings: finding.warnings || [],
  };
  evidenceRefs.push(findingRef);

  // 2. Add related envelopes if provided
  relatedEnvelopes.forEach((env, idx) => {
    const srcType: EvidenceSourceType = "data_envelope";
    const refId = `ref_env_${finding.id}_${idx}`;

    const ref: EvidenceRef = {
      id: refId,
      sourceType: srcType,
      sourceId: env.source ? `${env.source}_${idx}` : `env_${idx}`,
      source: env.source || "",
      sourceTier: env.sourceTier || "",
      status: env.status || "",
      updatedAt: env.updatedAt || null,
      warnings: env.warnings || [],
    };

    // Validation checks for missing evidence
    if (!ref.source) {
      missingEvidence.push(`envelope_${idx}_source`);
      limitations.push(`Envelope ${idx} lacks source definition.`);
    }
    if (!ref.status) {
      missingEvidence.push(`envelope_${idx}_status`);
      limitations.push(`Envelope ${idx} lacks status indicator.`);
    }
    if (!ref.updatedAt) {
      missingEvidence.push(`envelope_${idx}_updatedAt`);
      limitations.push(`Envelope ${idx} lacks updatedAt timestamp.`);
    }

    evidenceRefs.push(ref);
  });

  const claimTypes: EvidenceClaimType[] = determineClaimTypes(finding.sourceType);
  const freshness = evaluateFreshness(evidenceRefs);

  return {
    id: `evp_${finding.id}`,
    subjectType: "audit",
    subjectId: finding.id,
    evidenceRefs,
    asOf: finding.calculatedAt || finding.detectedAt || nowStr,
    freshness,
    claimTypes,
    missingEvidence,
    blockedActions: [],
    limitations: limitations.length > 0 ? limitations : ["None"],
    createdAt: nowStr,
    engineVersion: finding.engineVersion || "1.0.0",
  };
}

export function buildEvidencePackFromWatchlistReport(input: {
  report: WatchlistReportItem;
  relatedFindings?: AuditFinding[];
}): EvidencePack {
  const { report, relatedFindings = [] } = input;
  const nowStr = new Date().toISOString();

  const evidenceRefs: EvidenceRef[] = [];
  const missingEvidence: string[] = [];
  const limitations: string[] = [];

  // 1. Add report itself as a reference
  const reportRef: EvidenceRef = {
    id: `ref_report_${report.id}`,
    sourceType: "watchlist_report",
    sourceId: report.id,
    source: report.source.sourceTitle || "Watchlist Report",
    sourceTier: report.source.sourceTier || "unknown",
    status: report.status || "unread",
    updatedAt: report.updatedAt || report.detectedAt || nowStr,
    warnings: report.source.warnings || [],
  };
  evidenceRefs.push(reportRef);

  // Validation checks for report details
  if (!report.source.sourceTitle) {
    missingEvidence.push("report_source_title");
    limitations.push("Report source title is missing.");
  }
  if (!report.source.sourceTier) {
    missingEvidence.push("report_source_tier");
    limitations.push("Report source tier is missing.");
  }
  if (!report.source.capturedAt) {
    missingEvidence.push("report_captured_at");
    limitations.push("Report lacks capturedAt timestamp.");
  }

  // 2. Add related findings
  relatedFindings.forEach((finding) => {
    const ref: EvidenceRef = {
      id: `ref_finding_link_${finding.id}`,
      sourceType: "audit_finding",
      sourceId: finding.id,
      source: finding.title || "Linked Finding",
      sourceTier: finding.sourceTier || "unknown",
      status: "cached",
      updatedAt: finding.calculatedAt || finding.detectedAt || nowStr,
      warnings: finding.warnings || [],
    };
    evidenceRefs.push(ref);
  });

  let claimTypes: EvidenceClaimType[] = [];
  switch (report.category) {
    case "filing":
      claimTypes = ["filing"];
      break;
    case "signal":
      claimTypes = ["signal"];
      break;
    case "data_quality":
      claimTypes = ["risk"];
      break;
    case "internal_research":
      claimTypes = ["factor"];
      break;
    default:
      claimTypes = ["unknown"];
  }

  const freshness = evaluateFreshness(evidenceRefs);

  return {
    id: `evp_rep_${report.id}`,
    subjectType: "report",
    subjectId: report.id,
    evidenceRefs,
    asOf: report.updatedAt || report.detectedAt || nowStr,
    freshness,
    claimTypes,
    missingEvidence,
    blockedActions: [],
    limitations: limitations.length > 0 ? limitations : ["None"],
    createdAt: nowStr,
    engineVersion: "1.0.0",
  };
}

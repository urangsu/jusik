import type { EvidencePack } from "@/domain/evidence/evidence-pack";
import type { ReportSection, ReportSectionType } from "@/domain/report/report-section";

function mapClaimToSectionType(claimType: string): ReportSectionType {
  switch (claimType) {
    case "price":
    case "volume":
    case "factor":
      return "technical";
    case "filing":
      return "filing";
    case "risk":
      return "risk";
    case "correlation":
    case "market_exposure":
      return "market";
    default:
      return "technical";
  }
}

function getSectionTitle(type: ReportSectionType): string {
  switch (type) {
    case "technical":
      return "Technical Analysis & Factors";
    case "flow":
      return "Market Flow Analysis";
    case "financial":
      return "Financial & Fundamentals Overview";
    case "filing":
      return "Corporate Filings & Disclosures";
    case "risk":
      return "Risk Diagnostics";
    case "market":
      return "Market & Strategy Exposures";
    case "evidence_gap":
      return "Evidence Gaps & Data Caveats";
    default:
      return "General Section";
  }
}

export function composeReportSectionsFromEvidencePack(input: {
  evidencePack: EvidencePack;
}): ReportSection[] {
  const { evidencePack } = input;
  const nowStr = new Date().toISOString();
  const sections: ReportSection[] = [];

  // Group claim sources
  const claimSourceIds = evidencePack.evidenceRefs.map((r) => r.sourceId);

  // Determine section types based on claim types in the evidence pack
  const activeTypes = new Set<ReportSectionType>();
  evidencePack.claimTypes.forEach((c) => {
    activeTypes.add(mapClaimToSectionType(c));
  });

  if (activeTypes.size === 0) {
    activeTypes.add("technical");
  }

  // Compose sections
  activeTypes.forEach((type) => {
    const summary = `Evidence-based diagnosis derived from pack "${evidencePack.id}". Subject: ${evidencePack.subjectId} (${evidencePack.subjectType}).`;
    
    sections.push({
      id: `sec_${evidencePack.id}_${type}`,
      type,
      title: getSectionTitle(type),
      summary,
      evidencePackIds: [evidencePack.id],
      claimSourceIds,
      confidence: evidencePack.freshness === "fresh" ? "high" : "medium",
      limitations: evidencePack.limitations,
      warnings: evidencePack.evidenceRefs.flatMap((r) => r.warnings),
      createdAt: nowStr,
    });
  });

  // If missingEvidence exists, compose an evidence_gap section
  if (evidencePack.missingEvidence.length > 0) {
    sections.push({
      id: `sec_${evidencePack.id}_gap`,
      type: "evidence_gap",
      title: getSectionTitle("evidence_gap"),
      summary: `Missing references: ${evidencePack.missingEvidence.join(", ")}. Complete assertions are restricted.`,
      evidencePackIds: [evidencePack.id],
      claimSourceIds: [],
      confidence: "low",
      limitations: [`Missing parameters: ${evidencePack.missingEvidence.join(", ")}`],
      warnings: ["incomplete_data_trail"],
      createdAt: nowStr,
    });
  }

  return sections;
}

import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";

/**
 * Pure helpers for resolving evidence freshness, confidence, and point-in-time date alignments.
 *
 * Rules:
 * - No supporting evidence → freshness=unknown, confidence=none.
 * - Stale IDs without supporting → freshness=stale if staleIds exist, else unknown.
 * - Only contradicting evidence without supporting → confidence=low.
 * - confidence must not be high based solely on count; requires multiple independent sources, fresh status, and official tier.
 */

export function resolveAppDate(dateInput?: string): string {
  if (dateInput) return dateInput;
  const d = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d); // YYYY-MM-DD
}

export function resolveKnownAt(asOfDate: string): string {
  const todayKst = resolveAppDate();
  if (asOfDate >= todayKst) {
    return new Date().toISOString();
  } else {
    const dateObj = new Date(`${asOfDate}T23:59:59.999+09:00`);
    return dateObj.toISOString();
  }
}

export function resolveEvidenceFreshness(
  supportingEvidenceIds: string[],
  staleEvidenceIds: string[]
): "fresh" | "stale" | "unknown" {
  if (supportingEvidenceIds.length === 0) {
    return "unknown";
  }

  if (staleEvidenceIds.some((id) => supportingEvidenceIds.includes(id))) {
    return "stale";
  }

  return "fresh";
}

export function resolveEvidenceConfidence(params: {
  supportingRecords: ResearchEvidenceRecord[];
  contradictingRecords: ResearchEvidenceRecord[];
  freshness: "fresh" | "stale" | "unknown";
}): "none" | "low" | "medium" | "high" {
  const { supportingRecords, contradictingRecords, freshness } = params;

  if (supportingRecords.length === 0) {
    return "none";
  }

  if (contradictingRecords.length > 0) {
    return "low";
  }

  if (freshness !== "fresh") {
    return "low";
  }

  // Count independent sources
  const uniqueSources = new Set(supportingRecords.map((r) => r.source));
  const independentSourceCount = uniqueSources.size;

  // Check for high-tier official sources (exchange, government, regulator)
  const hasOfficialSource = supportingRecords.some(
    (r) =>
      r.sourceTier === "official_exchange" ||
      r.sourceTier === "official_government" ||
      r.sourceTier === "official_regulator"
  );

  // High confidence needs: >= 3 supporting, >= 2 independent sources, at least one official source, and fresh
  if (supportingRecords.length >= 3 && independentSourceCount >= 2 && hasOfficialSource) {
    return "high";
  }

  // Medium confidence needs: >= 2 supporting, >= 1 independent sources, and fresh
  if (supportingRecords.length >= 2) {
    return "medium";
  }

  return "low";
}

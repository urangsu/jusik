/**
 * Pure helpers for resolving evidence freshness and confidence.
 *
 * Rules:
 * - No supporting evidence → freshness=unknown, confidence=none.
 * - Stale IDs without supporting → freshness=stale if staleIds exist, else unknown.
 * - Only contradicting evidence without supporting → confidence=low.
 */

/**
 * Resolves freshness based on actual evidence IDs.
 *
 * @param supportingEvidenceIds - IDs of supporting evidence records
 * @param staleEvidenceIds - IDs of evidence records that are past their expiryAt
 */
export function resolveEvidenceFreshness(
  supportingEvidenceIds: string[],
  staleEvidenceIds: string[],
): "fresh" | "stale" | "unknown" {
  // No supporting evidence at all → unknown
  if (supportingEvidenceIds.length === 0) {
    return "unknown";
  }

  // If any of the supporting evidence is stale → stale
  if (staleEvidenceIds.length > 0) {
    return "stale";
  }

  // Fresh supporting evidence exists and none is stale
  return "fresh";
}

/**
 * Resolves confidence level based on evidence counts.
 *
 * @param supportingEvidenceIds - IDs of supporting evidence records
 * @param contradictingEvidenceIds - IDs of contradicting evidence records
 */
export function resolveEvidenceConfidence(
  supportingEvidenceIds: string[],
  contradictingEvidenceIds: string[],
): "none" | "low" | "medium" | "high" {
  const supporting = supportingEvidenceIds.length;
  const contradicting = contradictingEvidenceIds.length;

  // No supporting evidence → none
  if (supporting === 0) {
    return "none";
  }

  // Only contradicting, no supporting
  if (supporting === 0 && contradicting > 0) {
    return "low";
  }

  // Contradicting signals present
  if (contradicting > 0) {
    return "low";
  }

  // Threshold-based confidence
  if (supporting >= 4) return "high";
  if (supporting >= 2) return "medium";
  return "low";
}

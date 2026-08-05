/**
 * A research claim extracted from a public research post.
 *
 * Design constraints:
 * - "unclear" must never be converted to "neutral"
 * - An unresolved ticker yields assetId: null (never guessed)
 * - evidenceSpan is required for any non-unclear claim
 */

export type ResearchClaimDirection =
  | "bullish"
  | "bearish"
  | "neutral"
  | "unclear";

export type ResearchClaimKind =
  | "demand_evidence"
  | "supply_chain_bottleneck"
  | "substitutability"
  | "qualification_cycle"
  | "capacity_elasticity"
  | "customer_validation"
  | "contract_counterparty_quality"
  | "gaap_financial_quality"
  | "dilution_financing_risk"
  | "valuation_absorption"
  | "market_window"
  | "other";

export type ResearchClaim = {
  claimId: string;
  postId: string | null;
  voiceId: string | null;
  /** Canonical asset ID — null when the ticker cannot be resolved */
  assetId: string | null;
  /** Missing-input reason when assetId is null */
  unresolvedReason: string | null;
  text: string;
  direction: ResearchClaimDirection;
  claimKind: ResearchClaimKind;
  /** IDs of evidence items that back this claim */
  evidenceIds: string[];
  /**
   * ISO-8601 date range covered by the claim's source evidence.
   * Required for all claims except those with direction "unclear".
   */
  evidenceSpan: { from: string; to: string } | null;
  /** Extraction method; AI-extracted claims require sourceUrl */
  extractionMethod: "provider_direct" | "deterministic_parser" | "ai_extraction" | "user_import";
  createdAt: string;
};

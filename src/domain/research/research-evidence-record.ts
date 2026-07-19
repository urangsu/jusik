/**
 * ResearchEvidenceRecord — canonical provenance record for a single piece of evidence.
 *
 * Rules:
 * - sourceUrl=null means no external link should be shown in UI.
 * - verificationStatus="unverified" must never be displayed as verified.
 * - expiryAt < asOfDate means the record is stale and must be labeled as such.
 */

import type { ResearchClaimKind } from "./research-claim";

export type EvidenceVerificationStatus =
  | "verified"
  | "unverified"
  | "stale"
  | "rejected";

export type ResearchEvidenceRecord = {
  evidenceId: string;
  assetId: string;
  evidenceKind: ResearchClaimKind;
  claimIds: string[];
  contentHash: string;
  dataVersionId: string;
  sourceAuthor: string | null;
  extractionMethod:
    | "provider_direct"
    | "deterministic_parser"
    | "ai_extraction"
    | "user_import";

  /** Human-readable source name (e.g. "OpenDART", "Bloomberg", "User Import") */
  source: string;
  /**
   * Usage policy tier for this evidence.
   * Mirrors SourceUsagePolicy from data-status.
   */
  sourceTier:
    | "official_exchange"
    | "official_government"
    | "official_regulator"
    | "licensed_commercial"
    | "personal_research"
    | "manual_import";

  /** Document or article title. */
  title: string;

  /** ISO date of original publication. null if unknown. */
  publishedAt: string | null;
  /**
   * ISO date the data was usable for analysis (may differ from publishedAt
   * due to embargo or processing delay).
   */
  dataAvailableAt: string | null;
  /** ISO timestamp the record was ingested into this system. */
  retrievedAt: string;

  /** External URL for the original document. null if unavailable. */
  sourceUrl: string | null;
  /** Internal document reference path or ID. null if not applicable. */
  internalDocumentRef: string | null;

  /** The specific passage that supports the claim. */
  quoteSpan: {
    text: string;
    page?: number;
    section?: string;
  } | null;

  verificationStatus: EvidenceVerificationStatus;

  /**
   * ISO datetime after which this record should be treated as stale.
   * null means no expiry.
   */
  expiryAt: string | null;
};

import type { DataStatus } from "@/domain/common/data-status";

/**
 * Granular evidence of data availability for one category.
 * Each field independently tracks whether a *real record* exists —
 * not just whether an identifier or config key is present.
 */
export type AvailabilityEvidence = {
  /** True only when at least one real data record exists and is valid as of asOfDate. */
  available: boolean;
  status: DataStatus;
  /** IDs of evidence records or data-version IDs that back this availability claim. */
  sourceRefs: string[];
  updatedAt: string | null;
  asOfDate: string;
  /**
   * Machine-readable reason code when available=false.
   * Never null when available=false.
   */
  reasonCode:
    | "price_data_unavailable"
    | "valuation_metrics_unavailable"
    | "filings_unavailable"
    | "supply_chain_graph_unavailable"
    | "signal_version_unavailable"
    | "provenance_unavailable"
    | null;
};

/**
 * Independently-tracked availability for each research data category.
 *
 * RULES (must not be violated):
 * - price.available=true does NOT imply valuation.available=true.
 * - supplyChain.available=true requires a real SupplyChainGraph record.
 * - filings.available=true requires at least one real filing record (receiptNo/accessionNo).
 *   Merely having a corpCode or CIK is NOT sufficient.
 * - valuation.available=true requires at least one real valuation metric (PER, PBR, EV/EBITDA, etc.)
 *   with a non-null value, a source reference, and an updatedAt.
 */
export type ResearchAvailability = {
  price: AvailabilityEvidence;
  valuation: AvailabilityEvidence;
  filings: AvailabilityEvidence;
  supplyChain: AvailabilityEvidence;
};

/** Sentinel: fully unavailable availability for a given asOfDate. */
export function makeUnavailableAvailability(asOfDate: string): ResearchAvailability {
  const unavailable = (reasonCode: AvailabilityEvidence["reasonCode"]): AvailabilityEvidence => ({
    available: false,
    status: "insufficient_data",
    sourceRefs: [],
    updatedAt: null,
    asOfDate,
    reasonCode,
  });

  return {
    price: unavailable("price_data_unavailable"),
    valuation: unavailable("valuation_metrics_unavailable"),
    filings: unavailable("filings_unavailable"),
    supplyChain: unavailable("supply_chain_graph_unavailable"),
  };
}

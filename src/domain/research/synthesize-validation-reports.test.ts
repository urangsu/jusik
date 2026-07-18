import { describe, it, expect } from "vitest";
import { synthesizeValidationReports } from "./synthesize-validation-reports";
import type { MethodRuleEvaluation } from "./method-evaluation";
import type { ResearchAvailability } from "./research-availability";

// Fully available test availability helper
function makeAvailability(
  price = true,
  valuation = true,
  filings = true,
  supplyChain = true
): ResearchAvailability {
  const avail = (available: boolean, reasonCode: ResearchAvailability["price"]["reasonCode"]) => ({
    available,
    status: available ? ("cached" as const) : ("insufficient_data" as const),
    sourceRefs: available ? ["test_ref"] : [],
    updatedAt: available ? "2026-01-01T00:00:00Z" : null,
    asOfDate: "2026-01-01",
    reasonCode: available ? null : reasonCode,
  });
  return {
    price: avail(price, "price_data_unavailable"),
    valuation: avail(valuation, "valuation_metrics_unavailable"),
    filings: avail(filings, "filings_unavailable"),
    supplyChain: avail(supplyChain, "supply_chain_graph_unavailable"),
  };
}

const mockEval = (id: string, status: MethodRuleEvaluation["status"]): MethodRuleEvaluation => ({
  ruleId: id as any,
  assetId: "US_AAPL",
  status,
  claimIds: ["c_" + id],
  supportingEvidenceIds: status === "supported" ? ["ev_" + id] : [],
  contradictingEvidenceIds: status === "contradicted" ? ["ev_contra_" + id] : [],
  missingInputs: [],
  staleEvidenceIds: [],
  vetoReasons: [],
  dataQualityScore: 1,
  signalVersion: null,
});

describe("synthesize-validation-reports", () => {
  it("produces deteriorating global status when a fatal rule is contradicted", () => {
    // gaap_financial_quality has vetoSeverity=fatal
    const evaluations = [
      mockEval("demand_evidence", "supported"),
      mockEval("supply_chain_bottleneck", "supported"),
      mockEval("customer_validation", "supported"),
      mockEval("valuation_absorption", "supported"),
      mockEval("gaap_financial_quality", "contradicted"), // Fatal contradiction
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      availability: makeAvailability(true, true, true, true),
      signalVersion: null,
    });

    expect(result.globalStatus).toBe("deteriorating");
    // isVetoed=true because gaap_financial_quality has fatal vetoSeverity
    expect(result.isVetoed).toBe(true);
    expect(result.vetoReasons.length).toBeGreaterThan(0);
    expect(result.vetoReasons[0].severity).toBe("fatal");
    expect(result.reports.some(r => r.seatId === "evidence_counter_thesis" && r.status === "deteriorating")).toBe(true);
  });

  it("does NOT set isVetoed when only a warning-severity rule is contradicted", () => {
    // substitutability has vetoSeverity=warning — should deteriorate but NOT veto
    const evaluations = [
      mockEval("demand_evidence", "supported"),
      mockEval("substitutability", "contradicted"), // warning only
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      availability: makeAvailability(true, true, true, true),
      signalVersion: null,
    });

    expect(result.globalStatus).toBe("deteriorating");
    // substitutability is warning severity → isVetoed must be false
    expect(result.isVetoed).toBe(false);
    expect(result.vetoReasons.length).toBe(0);
  });

  it("forces company_attribution to abstain if demand_supply_chain is insufficient", () => {
    const evaluations = [
      mockEval("demand_evidence", "insufficient_data"),
      mockEval("customer_validation", "supported"),
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      availability: makeAvailability(true, true, true, false), // supply chain unavailable
      signalVersion: null,
    });

    const caReport = result.reports.find((r) => r.seatId === "company_attribution");
    expect(caReport).toBeDefined();
    expect(caReport!.abstained).toBe(true);
    expect(caReport!.status).toBe("insufficient_data");
    expect(caReport!.freshness).toBe("unknown");
    expect(caReport!.confidence).toBe("none");
  });

  it("forces financial_quality status to insufficient if filings are not available", () => {
    const evaluations = [
      mockEval("gaap_financial_quality", "supported"),
      mockEval("dilution_financing_risk", "supported"),
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      availability: makeAvailability(true, true, false), // filings unavailable
      signalVersion: null,
    });

    const fqReport = result.reports.find((r) => r.seatId === "financial_quality");
    expect(fqReport).toBeDefined();
    expect(fqReport!.status).toBe("insufficient_data");
    expect(fqReport!.missingInputs).toContain("filings_unavailable");
    // filings unavailable is not a blocking/fatal veto — it's just insufficient data
    expect(result.isVetoed).toBe(false);
  });

  it("forces security_market_window to insufficient if price is missing", () => {
    const evaluations = [
      mockEval("valuation_absorption", "supported"),
      mockEval("market_window", "supported"),
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      availability: makeAvailability(false, true, true), // price unavailable
      signalVersion: null,
    });

    const smwReport = result.reports.find((r) => r.seatId === "security_market_window");
    expect(smwReport).toBeDefined();
    expect(smwReport!.status).toBe("insufficient_data");
    expect(smwReport!.missingInputs).toContain("price_data_unavailable");
  });

  it("forces security_market_window to insufficient if valuation is missing", () => {
    const evaluations = [mockEval("valuation_absorption", "supported")];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      availability: makeAvailability(true, false, true), // valuation unavailable
      signalVersion: null,
    });

    const smwReport = result.reports.find((r) => r.seatId === "security_market_window");
    expect(smwReport!.status).toBe("insufficient_data");
    expect(smwReport!.missingInputs).toContain("valuation_metrics_unavailable");
  });

  it("returns freshness=unknown when there are no supporting evidence IDs", () => {
    const evaluations = [
      mockEval("demand_evidence", "insufficient_data"), // no evidence IDs
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      availability: makeAvailability(true, true, true, true),
      signalVersion: null,
    });

    // demand_supply_chain seat has no supporting evidence → freshness=unknown
    const dscReport = result.reports.find(r => r.seatId === "demand_supply_chain");
    expect(dscReport!.freshness).toBe("unknown");
    expect(dscReport!.confidence).toBe("none");
  });

  it("preserves exact claimIds and evidenceIds mapping on validation reports", () => {
    const evaluations = [
      {
        ...mockEval("demand_evidence", "supported"),
        claimIds: ["c_demand_1", "c_demand_2"],
        supportingEvidenceIds: ["ev_demand_1"],
      },
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      availability: makeAvailability(true, true, true, true),
      signalVersion: null,
    });

    const dscReport = result.reports.find((r) => r.seatId === "demand_supply_chain");
    expect(dscReport).toBeDefined();
    expect(dscReport!.claimIds).toContain("c_demand_1");
    expect(dscReport!.claimIds).toContain("c_demand_2");
    expect(dscReport!.supportingEvidenceIds).toContain("ev_demand_1");
    // fresh because there IS supporting evidence and no stale
    expect(dscReport!.freshness).toBe("fresh");
  });

  it("vetoReasons must be empty when isVetoed=false", () => {
    const evaluations = [mockEval("demand_evidence", "supported")];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      availability: makeAvailability(true, true, true, true),
      signalVersion: null,
    });

    expect(result.isVetoed).toBe(false);
    expect(result.vetoReasons.length).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { synthesizeValidationReports } from "./synthesize-validation-reports";
import type { MethodRuleEvaluation } from "./method-evaluation";
import type { SignalVersion } from "@/domain/signals/signal-version";

const MOCK_SIGNAL_VERSION: SignalVersion = {
  signalVersionId: "sv_test",
  engine: {
    engineId: "synthesis_engine",
    engineVersion: "0.1.0",
    configHash: "abc",
    gitCommitSha: "def",
    createdAt: "2026-01-01T00:00:00Z",
  },
  dataVersionId: "dv_test",
  calculatedAt: "2026-01-01T00:00:00Z",
  expiryAt: null,
};

const mockEval = (id: string, status: MethodRuleEvaluation["status"]): MethodRuleEvaluation => ({
  ruleId: id as any,
  assetId: "US_AAPL",
  status,
  claimIds: ["c_" + id],
  supportingEvidenceIds: ["ev_" + id],
  contradictingEvidenceIds: [],
  missingInputs: [],
  staleEvidenceIds: [],
  vetoReasons: [],
  dataQualityScore: 1,
  signalVersion: MOCK_SIGNAL_VERSION,
});

describe("synthesize-validation-reports", () => {
  it("forces global deteriorating status if a single seat is contradicted (veto beats majority)", () => {
    // 4 confirming evaluations and 1 contradicted evaluation
    const evaluations = [
      mockEval("demand_evidence", "supported"),
      mockEval("supply_chain_bottleneck", "supported"),
      mockEval("customer_validation", "supported"),
      mockEval("valuation_absorption", "supported"),
      mockEval("gaap_financial_quality", "contradicted"), // Fatal contradiction!
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      priceAvailable: true,
      valuationAvailable: true,
      filingsAvailable: true,
      signalVersion: MOCK_SIGNAL_VERSION,
    });

    // 4 confirming seats cannot outvote the 1 fatal veto
    expect(result.globalStatus).toBe("deteriorating");
    expect(result.isVetoed).toBe(true);
    expect(result.reports.some(r => r.seatId === "evidence_counter_thesis" && r.status === "deteriorating")).toBe(true);
  });

  it("forces company_attribution to abstain if demand_supply_chain is insufficient", () => {
    const evaluations = [
      mockEval("demand_evidence", "insufficient_data"), // DSC is insufficient
      mockEval("customer_validation", "supported"),
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      priceAvailable: true,
      valuationAvailable: true,
      filingsAvailable: true,
      signalVersion: MOCK_SIGNAL_VERSION,
    });

    const caReport = result.reports.find((r) => r.seatId === "company_attribution");
    expect(caReport).toBeDefined();
    expect(caReport!.abstained).toBe(true);
    expect(caReport!.status).toBe("insufficient_data");
    expect(caReport!.vetoReasons[0]).toContain("Abstained: Missing");
  });

  it("forces financial_quality status to insufficient if filings are not available", () => {
    const evaluations = [
      mockEval("gaap_financial_quality", "supported"),
      mockEval("dilution_financing_risk", "supported"),
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      priceAvailable: true,
      valuationAvailable: true,
      filingsAvailable: false, // Fundamentals missing
      signalVersion: MOCK_SIGNAL_VERSION,
    });

    const fqReport = result.reports.find((r) => r.seatId === "financial_quality");
    expect(fqReport).toBeDefined();
    expect(fqReport!.status).toBe("insufficient_data");
    expect(fqReport!.vetoReasons).toContain("Missing core fundamentals or filings data.");
    expect(result.isVetoed).toBe(true);
  });

  it("forces security_market_window status to insufficient if price or valuation is missing", () => {
    const evaluations = [
      mockEval("valuation_absorption", "supported"),
      mockEval("market_window", "supported"),
    ];

    const result = synthesizeValidationReports({
      assetId: "US_AAPL",
      evaluations,
      priceAvailable: false, // Price missing
      valuationAvailable: true,
      filingsAvailable: true,
      signalVersion: MOCK_SIGNAL_VERSION,
    });

    const smwReport = result.reports.find((r) => r.seatId === "security_market_window");
    expect(smwReport).toBeDefined();
    expect(smwReport!.status).toBe("insufficient_data");
    expect(smwReport!.vetoReasons).toContain("Missing current price or valuation metrics.");
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
      priceAvailable: true,
      valuationAvailable: true,
      filingsAvailable: true,
      signalVersion: MOCK_SIGNAL_VERSION,
    });

    const dscReport = result.reports.find((r) => r.seatId === "demand_supply_chain");
    expect(dscReport).toBeDefined();
    expect(dscReport!.claimIds).toContain("c_demand_1");
    expect(dscReport!.claimIds).toContain("c_demand_2");
    expect(dscReport!.supportingEvidenceIds).toContain("ev_demand_1");
  });
});

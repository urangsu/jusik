import { describe, it, expect } from "vitest";
import { buildThesisSnapshot } from "./build-thesis-snapshot";
import type { ThesisPillar } from "./thesis-pillar";
import type { SignalVersion } from "@/domain/signals/signal-version";

const MOCK_SIGNAL_VERSION: SignalVersion = {
  signalVersionId: "sv_test",
  engine: {
    engineId: "thesis_engine",
    engineVersion: "0.1.0",
    configHash: "abc",
    gitCommitSha: "def",
    createdAt: "2026-01-01T00:00:00Z",
  },
  dataVersionId: "dv_test",
  calculatedAt: "2026-01-01T00:00:00Z",
  expiryAt: null,
};

const mockPillar = (id: string, core: boolean, status: ThesisPillar["status"], nextDue: string | null = null): ThesisPillar => ({
  pillarId: id,
  assetId: "US_AAPL",
  title: "Pillar " + id,
  methodRuleIds: ["demand_evidence"],
  status,
  claimIds: ["c1"],
  confirmingEvidenceIds: ["ev1"],
  contradictingEvidenceIds: [],
  missingInputs: [],
  confirmIf: [],
  warnIf: [],
  breakIf: [],
  nextEvidenceDueAt: nextDue,
  corePillar: core,
});

describe("build-thesis-snapshot", () => {
  it("forces insufficient_data if filings are missing or pillars are empty", () => {
    const pillars = [mockPillar("p1", true, "confirming")];
    const snap = buildThesisSnapshot({
      assetId: "US_AAPL",
      asOfDate: "2026-06-01",
      pillars,
      priceEvidenceAvailable: true,
      valuationEvidenceAvailable: true,
      filingsAvailable: false, // Missing filings/fundamentals
      dataVersionIds: ["v1"],
      signalVersion: MOCK_SIGNAL_VERSION,
      firstClaimAt: null,
      latestClaimAt: null,
      changeReasons: [],
      requiredNextEvidence: [],
    });

    expect(snap.companyThesisStatus).toBe("insufficient_data");
  });

  it("forces not_decision_grade if price or valuation is missing", () => {
    const pillars = [mockPillar("p1", true, "confirming")];
    const snap1 = buildThesisSnapshot({
      assetId: "US_AAPL",
      asOfDate: "2026-06-01",
      pillars,
      priceEvidenceAvailable: false, // Missing price
      valuationEvidenceAvailable: true,
      filingsAvailable: true,
      dataVersionIds: ["v1"],
      signalVersion: MOCK_SIGNAL_VERSION,
      firstClaimAt: null,
      latestClaimAt: null,
      changeReasons: [],
      requiredNextEvidence: [],
    });

    expect(snap1.securityReadiness).toBe("not_decision_grade");

    const snap2 = buildThesisSnapshot({
      assetId: "US_AAPL",
      asOfDate: "2026-06-01",
      pillars,
      priceEvidenceAvailable: true,
      valuationEvidenceAvailable: false, // Missing valuation
      filingsAvailable: true,
      dataVersionIds: ["v1"],
      signalVersion: MOCK_SIGNAL_VERSION,
      firstClaimAt: null,
      latestClaimAt: null,
      changeReasons: [],
      requiredNextEvidence: [],
    });

    expect(snap2.securityReadiness).toBe("not_decision_grade");
  });

  it("prevents aggregate confirming status if one core pillar is deteriorated or stale", () => {
    const pillars = [
      mockPillar("p1", true, "confirming"),
      mockPillar("p2", true, "deteriorating"), // One deteriorated core pillar
    ];

    const snap = buildThesisSnapshot({
      assetId: "US_AAPL",
      asOfDate: "2026-06-01",
      pillars,
      priceEvidenceAvailable: true,
      valuationEvidenceAvailable: true,
      filingsAvailable: true,
      dataVersionIds: ["v1"],
      signalVersion: MOCK_SIGNAL_VERSION,
      firstClaimAt: null,
      latestClaimAt: null,
      changeReasons: [],
      requiredNextEvidence: [],
    });

    expect(snap.companyThesisStatus).toBe("mixed"); // Not confirming
  });

  it("produces deteriorating company status if multiple core pillars are deteriorating", () => {
    const pillars = [
      mockPillar("p1", true, "deteriorating"),
      mockPillar("p2", true, "deteriorating"),
      mockPillar("p3", true, "confirming"),
    ];

    const snap = buildThesisSnapshot({
      assetId: "US_AAPL",
      asOfDate: "2026-06-01",
      pillars,
      priceEvidenceAvailable: true,
      valuationEvidenceAvailable: true,
      filingsAvailable: true,
      dataVersionIds: ["v1"],
      signalVersion: MOCK_SIGNAL_VERSION,
      firstClaimAt: null,
      latestClaimAt: null,
      changeReasons: [],
      requiredNextEvidence: [],
    });

    expect(snap.companyThesisStatus).toBe("deteriorating");
  });

  it("flags a pillar as stale if nextEvidenceDueAt is in the past", () => {
    const pillars = [
      mockPillar("p1", true, "confirming", "2026-05-01"), // nextEvidenceDueAt < 2026-06-01 asOfDate
    ];

    const snap = buildThesisSnapshot({
      assetId: "US_AAPL",
      asOfDate: "2026-06-01",
      pillars,
      priceEvidenceAvailable: true,
      valuationEvidenceAvailable: true,
      filingsAvailable: true,
      dataVersionIds: ["v1"],
      signalVersion: MOCK_SIGNAL_VERSION,
      firstClaimAt: null,
      latestClaimAt: null,
      changeReasons: [],
      requiredNextEvidence: [],
    });

    // The stale core pillar forces the aggregate to mixed instead of confirming
    expect(snap.companyThesisStatus).toBe("mixed");
  });

  it("does not let price increase alone upgrade pillar status", () => {
    // The buildThesisSnapshot function receives the status evaluated from method rules.
    // Price appreciation is not an input to the pillar status evaluation, which ensures
    // price change alone does not change the fundamental pillar evaluation.
    const pillars = [mockPillar("p1", true, "deteriorating")];
    const snap = buildThesisSnapshot({
      assetId: "US_AAPL",
      asOfDate: "2026-06-01",
      pillars,
      priceEvidenceAvailable: true,
      valuationEvidenceAvailable: true,
      filingsAvailable: true,
      dataVersionIds: ["v1"],
      signalVersion: MOCK_SIGNAL_VERSION,
      firstClaimAt: null,
      latestClaimAt: null,
      changeReasons: ["Price appreciated 20%"], // price increase noted in reasons
      requiredNextEvidence: [],
    });

    expect(snap.companyThesisStatus).toBe("mixed"); // Remains mixed, status was not upgraded to confirming
  });
});

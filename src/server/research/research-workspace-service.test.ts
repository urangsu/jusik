import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import { getResearchDiagnosticData } from "./research-workspace-service";
import { saveResearchClaim, clearAllResearchClaims } from "./research-claim-store";
import type { ResearchClaim } from "@/domain/research/research-claim";

describe("research-workspace-service", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("research-workspace-service-test");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it("returns insufficient_data if no claims exist for the asset", async () => {
    const envelope = await getResearchDiagnosticData({
      assetId: "US_AAPL",
      asOfDate: "2026-06-01",
      universeId: "SP500_SAMPLE",
    });
    expect(envelope.status).toBe("insufficient_data");
    expect(envelope.value).toBeNull();
    expect(envelope.message).toContain("연결");
  });

  it("correctly evaluates diagnostic data when claims exist", async () => {
    const claim: ResearchClaim = {
      claimId: "c_test_1",
      postId: "p1",
      voiceId: "v1",
      assetId: "US_AAPL",
      unresolvedReason: null,
      text: "Demand is extremely high.",
      direction: "bullish",
      claimKind: "demand_evidence",
      evidenceIds: ["ev_1"],
      evidenceSpan: { from: "2026-01-01", to: "2026-03-01" },
      isVerified: true,
      extractionMethod: "user_import",
      createdAt: new Date().toISOString(),
    };

    await saveResearchClaim(claim);

    const envelope = await getResearchDiagnosticData({
      assetId: "US_AAPL",
      asOfDate: "2026-06-01",
      universeId: "SP500_SAMPLE",
    });
    expect(envelope.status).toBe("cached");
    expect(envelope.value).not.toBeNull();

    const data = envelope.value!;
    expect(data.claims).toHaveLength(1);
    expect(data.evaluations.length).toBeGreaterThan(0);
    expect(data.thesisSnapshot).toBeDefined();
    expect(data.validationResult.reports.length).toBe(5); // 5 validator seats

    // Verify new fields exist
    expect(data.supplyChainGraph).toBeNull();
    expect(data.availability).toBeDefined();
    expect(data.availability.price).toBeDefined();
    expect(data.availability.valuation).toBeDefined();
    expect(data.availability.filings).toBeDefined();
    expect(data.availability.supplyChain).toBeDefined();
    expect(data.signalVersion).toBeNull();
    expect(data.dataVersionIds).toEqual([]);
    expect(data.evidenceRecords).toEqual([]);

    // Availability must be independently assessed (valuation != price)
    // Without real OHLCV or filings data in test, all should be unavailable
    expect(data.availability.valuation.available).toBe(false);
    expect(data.availability.valuation.reasonCode).toBe("valuation_metrics_unavailable");
  });

  it("returns null supplyChainGraph (no mock graph)", async () => {
    const claim: ResearchClaim = {
      claimId: "c_test_2",
      postId: "p2",
      voiceId: "v2",
      assetId: "KR_005930",
      unresolvedReason: null,
      text: "OLED demand growing.",
      direction: "bullish",
      claimKind: "demand_evidence",
      evidenceIds: ["ev_2"],
      evidenceSpan: { from: "2026-01-01", to: "2026-12-31" },
      isVerified: true,
      extractionMethod: "user_import",
      createdAt: new Date().toISOString(),
    };
    await saveResearchClaim(claim);

    const envelope = await getResearchDiagnosticData({
      assetId: "KR_005930",
      asOfDate: "2026-06-01",
      universeId: "KOSPI_SAMPLE",
    });

    expect(envelope.status).toBe("cached");
    expect(envelope.value!.supplyChainGraph).toBeNull();
  });
});

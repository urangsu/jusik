import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import { getResearchDiagnosticData } from "./research-workspace-service";
import { saveResearchClaim } from "./research-claim-store";
import { saveResearchPost, saveVoiceProfile } from "./research-voice-store";
import { saveEvidenceRecord } from "./research-evidence-store";
import type { ResearchClaim } from "@/domain/research/research-claim";
import type { PublicResearchPost, ResearchVoiceProfile } from "@/domain/research/research-voice";
import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";

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
    const profile: ResearchVoiceProfile = {
      voiceId: "v1",
      displayName: "Analyst A",
      publicHandle: "@analyst_a",
      sourcePlatforms: ["twitter"],
      affiliationStatus: "independent_tracker",
      productionEligible: false,
    };
    await saveVoiceProfile(profile);

    const post: PublicResearchPost = {
      postId: "p1",
      voiceId: "v1",
      externalId: "ext_1",
      text: "Apple demand is strong.",
      sourceUrl: "https://twitter.com/analyst_a/1",
      sourceMethod: "user_json",
      contentHash: "hash_p1",
      publishedAt: "2026-05-01T00:00:00.000Z",
      ingestedAt: "2026-05-01T00:00:00.000Z",
      status: "active",
      revisionOf: null,
    };
    await saveResearchPost(post);

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
      extractionMethod: "user_import",
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    await saveResearchClaim(claim);

    const evidence: ResearchEvidenceRecord = {
      evidenceId: "ev_1",
      assetId: "US_AAPL",
      evidenceKind: "demand_evidence",
      claimIds: ["c_test_1"],
      contentHash: "hash_ev_1",
      dataVersionId: "dv_test_ev",
      sourceAuthor: "Apple Corp",
      extractionMethod: "user_import",
      source: "Bloomberg",
      title: "Apple demand report",
      quoteSpan: null,
      sourceUrl: null,
      publishedAt: null,
      verificationStatus: "verified",
      retrievedAt: "2026-05-02T00:00:00.000Z",
      dataAvailableAt: "2026-05-02T00:00:00.000Z",
      expiryAt: null,
      internalDocumentRef: null,
      sourceTier: "licensed_commercial",
    };
    await saveEvidenceRecord(evidence);

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

    expect(data.supplyChainGraph).toBeNull();
    expect(data.availability).toBeDefined();
    expect(data.availability.price).toBeDefined();
    expect(data.availability.valuation).toBeDefined();
    expect(data.availability.filings).toBeDefined();
    expect(data.availability.supplyChain).toBeDefined();
    expect(data.signalVersion).toBeNull();
    expect(data.dataVersionIds).toEqual([]);
    expect(data.evidenceRecords).toHaveLength(1);

    expect(data.availability.valuation.available).toBe(false);
    expect(data.availability.valuation.reasonCode).toBe("valuation_metrics_unavailable");
  });

  it("returns null supplyChainGraph (no mock graph)", async () => {
    const profile: ResearchVoiceProfile = {
      voiceId: "v2",
      displayName: "Analyst B",
      publicHandle: "@analyst_b",
      sourcePlatforms: ["twitter"],
      affiliationStatus: "independent_tracker",
      productionEligible: false,
    };
    await saveVoiceProfile(profile);

    const post: PublicResearchPost = {
      postId: "p2",
      voiceId: "v2",
      externalId: "ext_2",
      text: "OLED demand growing.",
      sourceUrl: "https://twitter.com/analyst_b/2",
      sourceMethod: "user_json",
      contentHash: "hash_p2",
      publishedAt: "2026-05-01T00:00:00.000Z",
      ingestedAt: "2026-05-01T00:00:00.000Z",
      status: "active",
      revisionOf: null,
    };
    await saveResearchPost(post);

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
      extractionMethod: "user_import",
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    await saveResearchClaim(claim);

    const evidence: ResearchEvidenceRecord = {
      evidenceId: "ev_2",
      assetId: "KR_005930",
      evidenceKind: "demand_evidence",
      claimIds: ["c_test_2"],
      contentHash: "hash_ev_2",
      dataVersionId: "dv_test_ev2",
      sourceAuthor: "Samsung Display",
      extractionMethod: "user_import",
      source: "Naver",
      title: "OLED demand growth report",
      quoteSpan: null,
      sourceUrl: null,
      publishedAt: null,
      verificationStatus: "verified",
      retrievedAt: "2026-05-02T00:00:00.000Z",
      dataAvailableAt: "2026-05-02T00:00:00.000Z",
      expiryAt: null,
      internalDocumentRef: null,
      sourceTier: "licensed_commercial",
    };
    await saveEvidenceRecord(evidence);

    const envelope = await getResearchDiagnosticData({
      assetId: "KR_005930",
      asOfDate: "2026-06-01",
      universeId: "KOSPI_SAMPLE",
    });

    expect(envelope.status).toBe("cached");
    expect(envelope.value!.supplyChainGraph).toBeNull();
  });
});

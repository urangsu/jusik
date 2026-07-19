import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import { saveResearchClaim } from "@/server/research/research-claim-store";
import { saveResearchPost, saveVoiceProfile } from "@/server/research/research-voice-store";
import { saveEvidenceRecord } from "@/server/research/research-evidence-store";
import type { ResearchClaim } from "@/domain/research/research-claim";
import type { PublicResearchPost, ResearchVoiceProfile } from "@/domain/research/research-voice";
import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";

// Mock Symbol Master so tests don't need real symbol records
vi.mock("@/server/symbols/symbol-master-store", () => ({
  getSymbolMasterRecord: vi.fn().mockResolvedValue({
    id: "US_AAPL",
    symbol: "AAPL",
    market: "US",
    exchange: "NASDAQ",
  }),
}));

describe("Research asset API route", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("api-research-asset-test");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
    vi.clearAllMocks();
  });

  it("returns 400 if universeId is missing", async () => {
    const req = new NextRequest("http://localhost/api/research/assets/US_AAPL?asOfDate=2026-06-01");
    const res = await GET(req, { params: Promise.resolve({ assetId: "US_AAPL" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("universeId");
  });

  it("returns 400 if asOfDate is missing", async () => {
    const req = new NextRequest("http://localhost/api/research/assets/US_AAPL?universeId=SP500_SAMPLE");
    const res = await GET(req, { params: Promise.resolve({ assetId: "US_AAPL" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("asOfDate");
  });

  it("returns 400 if asOfDate is in the future", async () => {
    const futureDate = "2099-01-01";
    const req = new NextRequest(`http://localhost/api/research/assets/US_AAPL?asOfDate=${futureDate}&universeId=SP500_SAMPLE`);
    const res = await GET(req, { params: Promise.resolve({ assetId: "US_AAPL" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("future");
  });

  it("returns 400 if assetId is not in canonical format", async () => {
    const req = new NextRequest("http://localhost/api/research/assets/AAPL?asOfDate=2026-06-01&universeId=SP500_SAMPLE");
    const res = await GET(req, { params: Promise.resolve({ assetId: "AAPL" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("canonical");
  });

  it("returns 200 insufficient_data if no claims exist for the asset", async () => {
    const req = new NextRequest("http://localhost/api/research/assets/US_AAPL?asOfDate=2026-06-01&universeId=SP500_SAMPLE");
    const res = await GET(req, { params: Promise.resolve({ assetId: "US_AAPL" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("insufficient_data");
    expect(json.value).toBeNull();
    expect(json.message).toContain("연결");
  });

  it("returns 200 cached diagnostic data when claims exist for the asset", async () => {
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
      text: "GAAP financial health is good",
      direction: "bullish",
      claimKind: "gaap_financial_quality",
      evidenceIds: ["ev_1"],
      evidenceSpan: { from: "2026-01-01", to: "2026-03-01" },
      extractionMethod: "user_import",
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    await saveResearchClaim(claim);

    const evidence: ResearchEvidenceRecord = {
      evidenceId: "ev_1",
      assetId: "US_AAPL",
      evidenceKind: "gaap_financial_quality",
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

    const req = new NextRequest("http://localhost/api/research/assets/US_AAPL?asOfDate=2026-06-01&universeId=SP500_SAMPLE");
    const res = await GET(req, { params: Promise.resolve({ assetId: "US_AAPL" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("cached");
    expect(json.value).not.toBeNull();
    expect(json.value.claims).toHaveLength(1);
    expect(json.value.supplyChainGraph).toBeNull();
    expect(json.value.availability).toBeDefined();
    expect(json.value.availability.valuation.available).toBe(false);
    expect(json.value.availability.valuation.reasonCode).toBe("valuation_metrics_unavailable");
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import { saveResearchClaim } from "@/server/research/research-claim-store";
import type { ResearchClaim } from "@/domain/research/research-claim";

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
      isVerified: true,
      extractionMethod: "user_import",
      createdAt: new Date().toISOString(),
    };
    await saveResearchClaim(claim);

    const req = new NextRequest("http://localhost/api/research/assets/US_AAPL?asOfDate=2026-06-01&universeId=SP500_SAMPLE");
    const res = await GET(req, { params: Promise.resolve({ assetId: "US_AAPL" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("cached");
    expect(json.value).not.toBeNull();
    expect(json.value.claims).toHaveLength(1);
    // Verify no mock supply chain graph
    expect(json.value.supplyChainGraph).toBeNull();
    // Verify availability is structured
    expect(json.value.availability).toBeDefined();
    expect(json.value.availability.valuation.available).toBe(false);
    expect(json.value.availability.valuation.reasonCode).toBe("valuation_metrics_unavailable");
  });
});

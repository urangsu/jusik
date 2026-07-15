import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import {
  saveResearchClaim,
  getResearchClaim,
  listResearchClaims,
  clearAllResearchClaims,
} from "./research-claim-store";
import type { ResearchClaim } from "@/domain/research/research-claim";

describe("research-claim-store", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("research-claim-store-test");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  const mockClaim = (id: string, assetId: string | null, kind: string): ResearchClaim => ({
    claimId: id,
    postId: "post_1",
    voiceId: "voice_1",
    assetId,
    unresolvedReason: assetId ? null : "Ticker unresolvable",
    text: "Claim description text",
    direction: "bullish",
    claimKind: kind as any,
    evidenceIds: ["ev_1"],
    evidenceSpan: { from: "2026-01-01", to: "2026-03-01" },
    isVerified: true,
    extractionMethod: "user_import",
    createdAt: new Date().toISOString(),
  });

  it("saves and retrieves research claims", async () => {
    const claim = mockClaim("c_1", "US_AAPL", "demand_evidence");
    await saveResearchClaim(claim);

    const retrieved = await getResearchClaim("c_1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.claimId).toBe("c_1");
    expect(retrieved!.assetId).toBe("US_AAPL");
  });

  it("lists claims and filters by assetId and claimKind", async () => {
    await saveResearchClaim(mockClaim("c_1", "US_AAPL", "demand_evidence"));
    await saveResearchClaim(mockClaim("c_2", "KR_005930", "demand_evidence"));
    await saveResearchClaim(mockClaim("c_3", "US_AAPL", "supply_chain_bottleneck"));

    const all = await listResearchClaims();
    expect(all).toHaveLength(3);

    const aaplClaims = await listResearchClaims({ assetId: "US_AAPL" });
    expect(aaplClaims).toHaveLength(2);

    const bottleneckClaims = await listResearchClaims({ claimKind: "supply_chain_bottleneck" });
    expect(bottleneckClaims).toHaveLength(1);
    expect(bottleneckClaims[0].claimId).toBe("c_3");
  });
});

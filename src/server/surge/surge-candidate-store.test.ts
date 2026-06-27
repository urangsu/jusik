import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveSurgeCandidate,
  getSurgeCandidate,
  listSurgeCandidates,
} from "./surge-candidate-store";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import type { SurgeCandidate } from "@/domain/surge/surge-candidate";

describe("surge-candidate-store", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("surge-store-test");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  const dummyCandidate: SurgeCandidate = {
    id: "cnd_test",
    assetId: "US_AAPL",
    symbol: "AAPL",
    market: "US",
    reasons: ["price_change"],
    metrics: {
      priceChangePct: 0.06,
      volumeRatio: 1.0,
      volatilityRatio: 0.02,
      relativeStrength: 0.5,
    },
    score: 0.5,
    scoreBreakdown: {
      priceScore: 0.6,
      volumeScore: 0.2,
      volatilityScore: 0.4,
      relativeStrengthScore: 0.5,
    },
    sourceRefs: [],
    evidencePackId: null,
    status: "new",
    detectedAt: new Date().toISOString(),
    expiresAt: null,
    updatedAt: new Date().toISOString(),
  };

  it("should save and retrieve surge candidates", async () => {
    await saveSurgeCandidate(dummyCandidate);
    const retrieved = await getSurgeCandidate("cnd_test");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("cnd_test");
    expect(retrieved!.symbol).toBe("AAPL");
  });

  it("should list candidates filtered by market/status", async () => {
    await saveSurgeCandidate(dummyCandidate);
    await saveSurgeCandidate({
      ...dummyCandidate,
      id: "cnd_test_2",
      assetId: "KR_005930",
      symbol: "005930",
      market: "KR",
    });

    const all = await listSurgeCandidates();
    expect(all).toHaveLength(2);

    const listUS = await listSurgeCandidates({ market: "US" });
    expect(listUS).toHaveLength(1);
    expect(listUS[0].id).toBe("cnd_test");
  });
});

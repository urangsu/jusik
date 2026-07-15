import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import { getResearchDiagnosticData } from "./research-workspace-service";
import { saveResearchClaim, clearAllResearchClaims } from "./research-claim-store";
import type { ResearchClaim } from "@/domain/research/research-claim";
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
    const envelope = await getResearchDiagnosticData("US_AAPL", "2026-06-01", MOCK_SIGNAL_VERSION);
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

    const envelope = await getResearchDiagnosticData("US_AAPL", "2026-06-01", MOCK_SIGNAL_VERSION);
    expect(envelope.status).toBe("cached");
    expect(envelope.value).not.toBeNull();

    const data = envelope.value!;
    expect(data.claims).toHaveLength(1);
    expect(data.evaluations.length).toBeGreaterThan(0);
    expect(data.thesisSnapshot).toBeDefined();
    expect(data.validationResult.reports.length).toBe(5); // 5 validator seats
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { saveEvidencePack, getEvidencePack, listEvidencePacks } from "./evidence-pack-store";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";

describe("evidence-pack-store", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("evidence-store");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  const dummyPack: EvidencePack = {
    id: "pack_a",
    subjectType: "asset",
    subjectId: "AAPL",
    evidenceRefs: [],
    asOf: new Date().toISOString(),
    freshness: "fresh",
    claimTypes: ["price"],
    missingEvidence: [],
    blockedActions: [],
    limitations: ["None"],
    createdAt: new Date().toISOString(),
    engineVersion: "1.0.0",
  };

  it("should save and retrieve an evidence pack", async () => {
    await saveEvidencePack(dummyPack);
    const retrieved = await getEvidencePack("pack_a");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("pack_a");
    expect(retrieved!.subjectId).toBe("AAPL");
  });

  it("should return null for non-existing packs", async () => {
    const res = await getEvidencePack("pack_none");
    expect(res).toBeNull();
  });

  it("should list saved packs with query filters", async () => {
    await saveEvidencePack(dummyPack);
    await saveEvidencePack({ ...dummyPack, id: "pack_b", subjectId: "MSFT" });

    const listAll = await listEvidencePacks();
    expect(listAll).toHaveLength(2);

    const filterAAPL = await listEvidencePacks({ subjectId: "AAPL" });
    expect(filterAAPL).toHaveLength(1);
    expect(filterAAPL[0].id).toBe("pack_a");
  });
});

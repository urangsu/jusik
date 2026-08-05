import { describe, it, expect } from "vitest";
import { saveVersionedEnvelope } from "./file-pit-store";
import { selectPitRevision } from "./pit-revision-selector";

describe("PIT Store & Revision Selector", () => {
  it("selects correct point-in-time revision and rejects look-ahead revision", async () => {
    const assetId = `KR:TEST_ASSET_${Date.now()}`;

    const rev1 = await saveVersionedEnvelope({
      assetId,
      providerId: "kis",
      capability: "quote",
      effectiveAt: "2026-07-01T10:00:00.000Z",
      ingestedAt: "2026-07-01T10:05:00.000Z",
      schemaVersion: "1.0",
      supersededRevisionId: null,
      status: "real_time",
      sourceTier: "official",
      warnings: [],
      value: { price: 50000 },
    });

    const rev2 = await saveVersionedEnvelope({
      assetId,
      providerId: "kis",
      capability: "quote",
      effectiveAt: "2026-07-15T10:00:00.000Z",
      ingestedAt: "2026-07-15T10:05:00.000Z",
      schemaVersion: "1.0",
      supersededRevisionId: rev1.dataVersionId,
      status: "real_time",
      sourceTier: "official",
      warnings: [],
      value: { price: 55000 },
    });

    // Querying as-of July 10th should return rev1, NOT rev2 (which was ingested July 15th)
    const pitAsOfJuly10 = await selectPitRevision<{ price: number }>("quote", assetId, "2026-07-10T23:59:59.000Z");
    expect(pitAsOfJuly10).not.toBeNull();
    expect(pitAsOfJuly10?.dataVersionId).toBe(rev1.dataVersionId);
    expect(pitAsOfJuly10?.value.price).toBe(50000);

    // Querying as-of July 20th should return rev2
    const pitAsOfJuly20 = await selectPitRevision<{ price: number }>("quote", assetId, "2026-07-20T23:59:59.000Z");
    expect(pitAsOfJuly20).not.toBeNull();
    expect(pitAsOfJuly20?.dataVersionId).toBe(rev2.dataVersionId);
    expect(pitAsOfJuly20?.value.price).toBe(55000);
  });
});

import { describe, expect, it } from "vitest";
import { InMemoryDataVersionStore } from "./in-memory-data-version-store";

describe("InMemoryDataVersionStore", () => {
  it("creates data versions while preserving hash and source", async () => {
    const store = new InMemoryDataVersionStore();
    const version = await store.create({
      vendor: "seed",
      source: "SEED_DEMO",
      asOfDate: "2026-06-16",
      effectiveAt: "2026-06-16T00:00:00.000Z",
      ingestedAt: "2026-06-16T01:00:00.000Z",
      hash: "hash-a",
    });

    expect(version.dataVersionId).toMatch(/^dv_/);
    expect(version.source).toBe("SEED_DEMO");
    expect(version.hash).toBe("hash-a");
  });

  it("findLatest uses vendor, source, asOfDate, and latest ingestedAt", async () => {
    const store = new InMemoryDataVersionStore();
    await store.create({
      vendor: "seed",
      source: "SEED_DEMO",
      asOfDate: "2026-06-16",
      effectiveAt: "2026-06-16T00:00:00.000Z",
      ingestedAt: "2026-06-16T01:00:00.000Z",
      hash: "old",
    });
    const latest = await store.create({
      vendor: "seed",
      source: "SEED_DEMO",
      asOfDate: "2026-06-16",
      effectiveAt: "2026-06-16T00:00:00.000Z",
      ingestedAt: "2026-06-16T02:00:00.000Z",
      revisionId: "rev-1",
      hash: "new",
    });

    await expect(store.findLatest({ vendor: "seed", source: "SEED_DEMO", asOfDate: "2026-06-16" })).resolves.toEqual(latest);
  });
});

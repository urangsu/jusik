import { describe, expect, it } from "vitest";
import { SeedDemoUniverseBuilder } from "./seed-demo-universe-builder";

describe("SeedDemoUniverseBuilder", () => {
  it("only builds SEED_DEMO snapshots with a dataVersionId", async () => {
    const builder = new SeedDemoUniverseBuilder();
    const snapshot = await builder.buildSnapshot({
      universeId: "SEED_DEMO",
      asOfDate: "2026-06-16",
      knownAt: "2026-06-16T00:00:00.000Z",
    });

    expect(snapshot.universeId).toBe("SEED_DEMO");
    expect(snapshot.dataVersionId).toMatch(/^dv_seed_demo_/);
    expect(snapshot.assetIds).toEqual(expect.arrayContaining(["KR:005930", "US:AAPL"]));
  });

  it("rejects non-seed universe ids", async () => {
    const builder = new SeedDemoUniverseBuilder();

    await expect(
      builder.buildSnapshot({
        universeId: "KR_KOSPI200",
        asOfDate: "2026-06-16",
        knownAt: "2026-06-16T00:00:00.000Z",
      }),
    ).rejects.toThrow("SeedDemoUniverseBuilder only supports SEED_DEMO.");
  });
});

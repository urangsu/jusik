import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { getLatestMarketBackfillManifest, saveMarketBackfillManifest } from "./market-backfill-manifest-store";

describe("market backfill manifest store", () => {
  beforeEach(async () => {
    process.env.JUSIK_TEST_DATA_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), "market-backfill-manifest-"));
  });

  it("stores generated paths while marking the store as non-production", async () => {
    await saveMarketBackfillManifest({
      manifestId: "manifest_test",
      backfillReportId: "report_test",
      universe: "SP500_SAMPLE",
      capability: "ohlcv",
      generatedDataRoot: process.env.JUSIK_TEST_DATA_ROOT!,
      generatedPaths: ["/tmp/generated.json"],
      productionStore: false,
      createdAt: "2026-07-05T00:00:00.000Z",
    });

    const latest = await getLatestMarketBackfillManifest();
    expect(latest?.productionStore).toBe(false);
    expect(latest?.generatedPaths).toEqual(["/tmp/generated.json"]);
  });
});

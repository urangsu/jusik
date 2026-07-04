import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { getSurgeContext, saveSurgeContexts } from "./surge-context-store";

describe("surge context store", () => {
  beforeEach(async () => {
    process.env.JUSIK_TEST_DATA_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), "surge-context-"));
  });

  it("returns null when context is not available", async () => {
    await expect(getSurgeContext("US_AAPL")).resolves.toBeNull();
  });

  it("stores sector and filing context by asset", async () => {
    await saveSurgeContexts([
      {
        assetId: "US_AAPL",
        sectorReturn20dPct: 0.03,
        hasRecentFilingEvent: true,
        filingEventIds: ["filing_1"],
        updatedAt: "2026-07-05T00:00:00.000Z",
      },
    ]);

    const context = await getSurgeContext("US_AAPL");
    expect(context?.sectorReturn20dPct).toBe(0.03);
    expect(context?.filingEventIds).toEqual(["filing_1"]);
  });
});

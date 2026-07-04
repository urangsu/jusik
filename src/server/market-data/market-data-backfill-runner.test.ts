import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { runMarketDataBackfill } from "./market-data-backfill-runner";
import { getLatestMarketBackfillManifest } from "./market-backfill-manifest-store";

vi.mock("@/server/services/market-data-service", () => ({
  marketDataService: {
    getQuote: vi.fn().mockResolvedValue({
      value: null,
      status: "api_required",
      source: "test_provider",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "API required.",
    }),
    getOhlcv: vi.fn().mockResolvedValue({
      value: null,
      status: "api_required",
      source: "test_provider",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "API required.",
    }),
  },
}));

vi.mock("@/server/services/market-data-runtime-wrapper", () => ({
  withMarketDataRuntimeGate: vi.fn(async ({ fetcher }) => fetcher()),
}));

import { withMarketDataRuntimeGate } from "@/server/services/market-data-runtime-wrapper";

describe("runMarketDataBackfill", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "market-backfill-"));
    process.env.JUSIK_TEST_DATA_ROOT = tmpDir;
  });

  it("records api_required results instead of pretending data exists", async () => {
    const report = await runMarketDataBackfill({ universe: "SP500_SAMPLE", capability: "ohlcv", range: "1M" });

    expect(report.status).toBe("partial");
    expect(report.totalCount).toBe(3);
    expect(report.apiRequiredCount).toBe(3);
    expect(report.dataAvailableCount).toBe(0);
    expect(report.results[0].storedPath).toContain("data/market/ohlcv/SP500_SAMPLE");
    expect(withMarketDataRuntimeGate).toHaveBeenCalledWith(expect.objectContaining({
      providerId: "fmp_free",
      assetId: "US_AAPL",
      capability: "ohlcv",
      range: "1M",
      interval: "1D",
    }));

    const stored = await fs.readFile(report.results[0].storedPath!, "utf8");
    expect(JSON.parse(stored).status).toBe("api_required");

    const manifest = await getLatestMarketBackfillManifest();
    expect(manifest?.productionStore).toBe(false);
    expect(manifest?.generatedPaths.length).toBeGreaterThan(0);
  });
});

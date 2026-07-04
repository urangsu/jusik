import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { runMarketDataBackfill } from "./market-data-backfill-runner";

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

    const stored = await fs.readFile(report.results[0].storedPath!, "utf8");
    expect(JSON.parse(stored).status).toBe("api_required");
  });
});

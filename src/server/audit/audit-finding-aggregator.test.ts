import { describe, it, expect, vi, beforeEach } from "vitest";
import { aggregateAuditFindings } from "./audit-finding-aggregator";
import { listIndividualSignalIcResults } from "./individual-signal-ic-store";
import { listFactorCorrelationResults } from "./factor-correlation-store";
import { getMarketExposureLatestPath, getMarketExposureByTrialDir } from "./market-exposure-store-paths";
import fs from "fs/promises";

vi.mock("./individual-signal-ic-store", () => ({
  listIndividualSignalIcResults: vi.fn(),
}));

vi.mock("./factor-correlation-store", () => ({
  listFactorCorrelationResults: vi.fn(),
}));

vi.mock("./market-exposure-store-paths", () => ({
  getMarketExposureLatestPath: vi.fn().mockReturnValue("mock-exposure-latest.json"),
  getMarketExposureByTrialDir: vi.fn().mockReturnValue("mock-exposure-trial-dir"),
}));

vi.mock("./audit-finding-store", () => ({
  saveAuditFindings: vi.fn().mockResolvedValue(undefined),
  listAuditFindings: vi.fn().mockResolvedValue([]),
}));

describe("Audit Finding Aggregator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should aggregate findings and not crash when source stores are empty or throw error", async () => {
    vi.mocked(listIndividualSignalIcResults).mockRejectedValue(new Error("File not found"));
    vi.mocked(listFactorCorrelationResults).mockRejectedValue(new Error("File not found"));
    vi.spyOn(fs, "readdir").mockRejectedValue(new Error("ENOENT") as any);

    const result = await aggregateAuditFindings();
    expect(result.createdOrUpdated).toBe(0);
    expect(result.findings).toHaveLength(0);
  });
});

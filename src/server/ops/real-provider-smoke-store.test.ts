import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import type { RealProviderSmokeReport } from "@/domain/ops/real-provider-smoke";
import {
  getLatestRealProviderSmokeReport,
  listRealProviderSmokeReports,
  saveRealProviderSmokeReport,
} from "./real-provider-smoke-store";
import * as paths from "./real-provider-smoke-store-paths";

function report(id: string): RealProviderSmokeReport {
  return {
    id,
    targets: [],
    results: [],
    passed: true,
    failureCount: 0,
    dataAvailableCount: 0,
    apiRequiredCount: 0,
    createdAt: new Date().toISOString(),
    engineVersion: "test",
  };
}

describe("real-provider-smoke-store", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "real-provider-smoke-store-"));
    vi.spyOn(paths, "getRealProviderSmokeLatestPath").mockReturnValue(path.join(tmpDir, "latest.json"));
    vi.spyOn(paths, "getRealProviderSmokeHistoryDir").mockReturnValue(path.join(tmpDir, "history"));
    vi.spyOn(paths, "getRealProviderSmokeHistoryPath").mockImplementation((id) =>
      path.join(tmpDir, "history", `${id}.json`),
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("saves latest and history", async () => {
    await saveRealProviderSmokeReport(report("r1"));

    const latest = await getLatestRealProviderSmokeReport();
    const list = await listRealProviderSmokeReports();

    expect(latest?.id).toBe("r1");
    expect(list.map((item) => item.id)).toContain("r1");
  });

  it("returns null when latest report is absent", async () => {
    await expect(getLatestRealProviderSmokeReport()).resolves.toBeNull();
  });
});

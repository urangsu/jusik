import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  saveOperationalSmokeReport,
  getLatestOperationalSmokeReport,
  listOperationalSmokeReports,
} from "./operational-smoke-store";
import type { OperationalSmokeReport } from "@/domain/ops/operational-smoke";

// Override the store paths module to use a temp dir
import * as paths from "./operational-smoke-store-paths";
import { vi } from "vitest";

function makeSampleReport(id: string): OperationalSmokeReport {
  return {
    id,
    results: [],
    passed: true,
    failureCount: 0,
    warningCount: 0,
    createdAt: new Date().toISOString(),
    engineVersion: "1.0.0-test",
  };
}

describe("operational-smoke-store", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "smoke-store-test-"));

    vi.spyOn(paths, "getOpsSmokeDir").mockReturnValue(tmpDir);
    vi.spyOn(paths, "getOpsSmokeLatestPath").mockReturnValue(
      path.join(tmpDir, "latest.json")
    );
    vi.spyOn(paths, "getOpsSmokeHistoryDir").mockReturnValue(
      path.join(tmpDir, "history")
    );
    vi.spyOn(paths, "getOpsSmokeHistoryPath").mockImplementation(
      (id: string) => path.join(tmpDir, "history", `${id}.json`)
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should save and retrieve the latest report", async () => {
    const report = makeSampleReport("smoke_test_1");
    await saveOperationalSmokeReport(report);

    const retrieved = await getLatestOperationalSmokeReport();
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("smoke_test_1");
    expect(retrieved!.passed).toBe(true);
  });

  it("should return null when no report exists", async () => {
    const result = await getLatestOperationalSmokeReport();
    expect(result).toBeNull();
  });

  it("should list all historical reports", async () => {
    const r1 = makeSampleReport("smoke_a");
    const r2 = makeSampleReport("smoke_b");
    await saveOperationalSmokeReport(r1);
    await saveOperationalSmokeReport(r2);

    const list = await listOperationalSmokeReports();
    expect(list).toHaveLength(2);
    const ids = list.map((r) => r.id);
    expect(ids).toContain("smoke_a");
    expect(ids).toContain("smoke_b");
  });

  it("should return empty array when no history exists", async () => {
    const list = await listOperationalSmokeReports();
    expect(list).toHaveLength(0);
  });

  it("should overwrite latest.json on each save", async () => {
    await saveOperationalSmokeReport(makeSampleReport("smoke_first"));
    await saveOperationalSmokeReport(makeSampleReport("smoke_second"));

    const latest = await getLatestOperationalSmokeReport();
    expect(latest!.id).toBe("smoke_second");
  });
});

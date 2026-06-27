import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveFindingSynthesisReport,
  getFindingSynthesisReport,
  listFindingSynthesisReports,
} from "./finding-synthesis-store";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import type { FindingSynthesisReport } from "@/domain/report/report-section";

describe("finding-synthesis-store", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("synthesis-store");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  const dummyReport: FindingSynthesisReport = {
    id: "rep_1",
    subjectType: "asset",
    subjectId: "AAPL",
    sections: [],
    synthesisSummary: "Summary",
    keyRisks: [],
    evidenceGaps: [],
    blockedTerms: [],
    isBlocked: false,
    blockReasons: [],
    createdAt: new Date().toISOString(),
    engineVersion: "1.0.0",
  };

  it("should save and retrieve a synthesis report", async () => {
    await saveFindingSynthesisReport(dummyReport);
    const retrieved = await getFindingSynthesisReport("rep_1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("rep_1");
    expect(retrieved!.subjectId).toBe("AAPL");
  });

  it("should list saved reports", async () => {
    await saveFindingSynthesisReport(dummyReport);
    await saveFindingSynthesisReport({ ...dummyReport, id: "rep_2", subjectId: "MSFT" });

    const listAll = await listFindingSynthesisReports();
    expect(listAll).toHaveLength(2);

    const listAAPL = await listFindingSynthesisReports({ subjectId: "AAPL" });
    expect(listAAPL).toHaveLength(1);
    expect(listAAPL[0].id).toBe("rep_1");
  });
});

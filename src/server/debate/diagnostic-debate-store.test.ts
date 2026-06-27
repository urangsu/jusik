import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveDiagnosticDebate,
  getDiagnosticDebate,
  listDiagnosticDebates,
} from "./diagnostic-debate-store";
import { createTestDataRoot } from "@/test-utils/create-test-data-root";
import type { DiagnosticDebateReport } from "@/domain/debate/diagnostic-debate";

describe("diagnostic-debate-store", () => {
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testRoot = await createTestDataRoot("debate-store-test");
    process.env.JUSIK_TEST_DATA_ROOT = testRoot.root;
    cleanup = testRoot.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  const dummyDebate: DiagnosticDebateReport = {
    id: "deb_1",
    subjectType: "asset",
    subjectId: "AAPL",
    cases: [],
    balanceSummary: "Balance Summary",
    unresolvedQuestions: [],
    blockedTerms: [],
    isBlocked: false,
    blockReasons: [],
    createdAt: new Date().toISOString(),
  };

  it("should save and retrieve debate sheets", async () => {
    await saveDiagnosticDebate(dummyDebate);
    const retrieved = await getDiagnosticDebate("deb_1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("deb_1");
    expect(retrieved!.subjectId).toBe("AAPL");
  });

  it("should list debates filtered by subject", async () => {
    await saveDiagnosticDebate(dummyDebate);
    await saveDiagnosticDebate({ ...dummyDebate, id: "deb_2", subjectId: "MSFT" });

    const all = await listDiagnosticDebates();
    expect(all).toHaveLength(2);

    const listAAPL = await listDiagnosticDebates({ subjectId: "AAPL" });
    expect(listAAPL).toHaveLength(1);
    expect(listAAPL[0].id).toBe("deb_1");
  });
});

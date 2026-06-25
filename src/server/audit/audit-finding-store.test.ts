import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { saveAuditFindings, listAuditFindings } from "./audit-finding-store";
import { AuditFinding } from "@/domain/audit/audit-finding";
import fs from "fs/promises";
import { getAuditFindingsDir, getAuditFindingsLatestPath } from "./audit-finding-store-paths";

describe("Audit Finding Store", () => {
  const dir = getAuditFindingsDir();
  const latestPath = getAuditFindingsLatestPath();

  beforeEach(async () => {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("should successfully save findings and retrieve them via filters", async () => {
    const mockFindings: AuditFinding[] = [
      {
        id: "finding-1",
        sourceType: "individual_signal_ic",
        sourceId: "src-1",
        scope: "signal",
        assetId: null,
        symbol: null,
        universeId: "KOSPI_SAMPLE",
        strategyId: null,
        trialId: null,
        signalId: "sig-1",
        factorA: null,
        factorB: null,
        title: "Title 1",
        summary: "Summary 1",
        severity: "warning",
        actionability: "review_only",
        warnings: [],
        sourceTier: "official",
        sourceUrl: null,
        internalUrl: null,
        detectedAt: "2026-06-25T12:00:00Z",
        calculatedAt: "2026-06-25T12:00:00Z",
        engineVersion: "1.0.0",
      },
      {
        id: "finding-2",
        sourceType: "factor_correlation",
        sourceId: "src-2",
        scope: "factor_pair",
        assetId: null,
        symbol: null,
        universeId: "SP500_SAMPLE",
        strategyId: null,
        trialId: null,
        signalId: null,
        factorA: "fact-A",
        factorB: "fact-B",
        title: "Title 2",
        summary: "Summary 2",
        severity: "watch",
        actionability: "review_only",
        warnings: [],
        sourceTier: "manual_import",
        sourceUrl: null,
        internalUrl: null,
        detectedAt: "2026-06-25T12:00:00Z",
        calculatedAt: "2026-06-25T12:00:00Z",
        engineVersion: "1.0.0",
      },
    ];

    await saveAuditFindings(mockFindings);

    const listAll = await listAuditFindings();
    expect(listAll).toHaveLength(2);

    const listIc = await listAuditFindings({ sourceType: "individual_signal_ic" });
    expect(listIc).toHaveLength(1);
    expect(listIc[0].id).toBe("finding-1");

    const listSp500 = await listAuditFindings({ universeId: "SP500_SAMPLE" });
    expect(listSp500).toHaveLength(1);
    expect(listSp500[0].id).toBe("finding-2");
  });

  it("should overwrite findings with the same dedupe key", async () => {
    const mockFinding1: AuditFinding = {
      id: "finding-a",
      sourceType: "individual_signal_ic",
      sourceId: "src-x",
      scope: "signal",
      assetId: null,
      symbol: null,
      universeId: "KOSPI_SAMPLE",
      strategyId: null,
      trialId: null,
      signalId: "sig-x",
      factorA: null,
      factorB: null,
      title: "Original Title",
      summary: "Original Summary",
      severity: "watch",
      actionability: "review_only",
      warnings: [],
      sourceTier: "official",
      sourceUrl: null,
      internalUrl: null,
      detectedAt: "2026-06-25T12:00:00Z",
      calculatedAt: "2026-06-25T12:00:00Z",
      engineVersion: "1.0.0",
    };

    const mockFinding2: AuditFinding = {
      id: "finding-b", // different id but same dedupe parameters
      sourceType: "individual_signal_ic",
      sourceId: "src-x",
      scope: "signal",
      assetId: null,
      symbol: null,
      universeId: "KOSPI_SAMPLE",
      strategyId: null,
      trialId: null,
      signalId: "sig-x",
      factorA: null,
      factorB: null,
      title: "Updated Title",
      summary: "Updated Summary",
      severity: "warning",
      actionability: "review_only",
      warnings: ["new_warning"],
      sourceTier: "official",
      sourceUrl: null,
      internalUrl: null,
      detectedAt: "2026-06-25T12:01:00Z",
      calculatedAt: "2026-06-25T12:01:00Z",
      engineVersion: "1.0.0",
    };

    await saveAuditFindings([mockFinding1]);
    let all = await listAuditFindings();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Original Title");

    // Save mockFinding2 with the same dedupeKey
    await saveAuditFindings([mockFinding2]);
    all = await listAuditFindings();
    expect(all).toHaveLength(1); // deduplicated
    expect(all[0].title).toBe("Updated Title");
    expect(all[0].severity).toBe("warning");
    expect(all[0].warnings).toContain("new_warning");
  });
});

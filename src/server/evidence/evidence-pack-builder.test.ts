import { describe, it, expect } from "vitest";
import {
  buildEvidencePackFromAuditFinding,
  buildEvidencePackFromWatchlistReport,
} from "./evidence-pack-builder";
import type { AuditFinding } from "@/domain/audit/audit-finding";
import type { WatchlistReportItem } from "@/domain/watchlist/watchlist-report-item";
import type { DataEnvelope } from "@/domain/common/data-status";

describe("evidence-pack-builder", () => {
  const dummyFinding: AuditFinding = {
    id: "finding_123",
    sourceType: "individual_signal_ic",
    sourceId: "ic_123",
    scope: "signal",
    assetId: "삼성전자",
    symbol: "005930",
    universeId: "KOSPI_SAMPLE",
    strategyId: "strat_1",
    trialId: "trial_1",
    signalId: "sig_1",
    factorA: null,
    factorB: null,
    title: "High IC Signal Alert",
    summary: "삼성전자 signal IC is significantly high.",
    severity: "warning",
    actionability: "review_only",
    warnings: ["low_sample_count"],
    sourceTier: "manual_import",
    sourceUrl: null,
    internalUrl: null,
    detectedAt: new Date().toISOString(),
    calculatedAt: new Date().toISOString(),
    engineVersion: "1.0.0",
  };

  it("builds EvidencePack from AuditFinding correctly", () => {
    const pack = buildEvidencePackFromAuditFinding({
      finding: dummyFinding,
      relatedEnvelopes: [
        {
          value: { price: 80000 },
          status: "real_time",
          source: "KIS",
          sourceTier: "official",
          warnings: ["personal_use_only"],
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(pack.id).toBe("evp_finding_123");
    expect(pack.subjectType).toBe("audit");
    expect(pack.subjectId).toBe("finding_123");
    expect(pack.evidenceRefs).toHaveLength(2); // finding itself + envelope
    expect(pack.claimTypes).toContain("signal");
    expect(pack.claimTypes).toContain("factor");
    expect(pack.missingEvidence).toHaveLength(0);
    expect(pack.freshness).toBe("fresh");
  });

  it("identifies missing metadata on related envelopes", () => {
    const incompleteEnvelope = {
      value: null,
      status: "",
      source: "",
      sourceTier: "",
      warnings: [],
      updatedAt: null,
    } as unknown as DataEnvelope<unknown>;

    const pack = buildEvidencePackFromAuditFinding({
      finding: dummyFinding,
      relatedEnvelopes: [incompleteEnvelope],
    });

    expect(pack.missingEvidence).toContain("envelope_0_source");
    expect(pack.missingEvidence).toContain("envelope_0_status");
    expect(pack.missingEvidence).toContain("envelope_0_updatedAt");
    expect(pack.limitations.length).toBeGreaterThan(0);
  });

  it("evaluates mixed freshness when some references are stale", () => {
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 2 days ago
    const pack = buildEvidencePackFromAuditFinding({
      finding: dummyFinding,
      relatedEnvelopes: [
        {
          value: {},
          status: "stale",
          source: "KIS",
          sourceTier: "official",
          warnings: [],
          updatedAt: staleDate,
        },
      ],
    });

    expect(pack.freshness).toBe("mixed"); // finding is fresh (now), envelope is stale
  });

  it("builds EvidencePack from WatchlistReportItem correctly", () => {
    const dummyReport: WatchlistReportItem = {
      id: "report_999",
      assetId: "삼성전자",
      symbol: "005930",
      assetName: "Samsung Electronics",
      title: "OpenDART Disclosure Update",
      summary: "삼성전자 quarterly report filed.",
      category: "filing",
      severity: "info",
      source: {
        sourceType: "opendart_filing",
        sourceId: "dart_1",
        sourceTitle: "OpenDART API",
        sourceUrl: null,
        internalUrl: null,
        sourceTier: "official",
        warnings: [],
        publishedAt: new Date().toISOString(),
        capturedAt: new Date().toISOString(),
      },
      status: "unread",
      tags: [],
      detectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dedupeKey: "key_999",
    };

    const pack = buildEvidencePackFromWatchlistReport({
      report: dummyReport,
      relatedFindings: [dummyFinding],
    });

    expect(pack.id).toBe("evp_rep_report_999");
    expect(pack.subjectType).toBe("report");
    expect(pack.claimTypes).toContain("filing");
    expect(pack.evidenceRefs).toHaveLength(2); // report itself + linked finding
  });
});

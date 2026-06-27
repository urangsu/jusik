import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listAuditFindings } from "@/server/audit/audit-finding-store";
import { getEvidencePack, saveEvidencePack } from "@/server/evidence/evidence-pack-store";
import { buildEvidencePackFromAuditFinding } from "@/server/evidence/evidence-pack-builder";
import { getFindingSynthesisReport, saveFindingSynthesisReport } from "@/server/report/finding-synthesis-store";
import { composeReportSectionsFromEvidencePack } from "@/server/report/report-section-composer";
import { synthesizeFindingReport } from "@/server/report/finding-synthesizer";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";
import type { FindingSynthesisReport } from "@/domain/report/report-section";

/**
 * POST /api/reports/finding-synthesis/from-audit-finding
 *
 * Body: { findingId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { findingId } = body;

    if (!findingId) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "finding_synthesizer",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "findingId is required",
      };
      return createSafeResponse(envelope, 400);
    }

    const findings = await listAuditFindings();
    const finding = findings.find((f) => f.id === findingId);

    if (!finding) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "finding_synthesizer",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Finding ${findingId} not found`,
      };
      return createSafeResponse(envelope, 200);
    }

    // 1. Resolve EvidencePack
    const packId = `evp_${findingId}`;
    let evidencePack = await getEvidencePack(packId);
    if (!evidencePack) {
      evidencePack = buildEvidencePackFromAuditFinding({ finding });
      await saveEvidencePack(evidencePack);
    }

    // 2. Resolve FindingSynthesisReport
    const reportId = `rep_${findingId}`;
    let report = await getFindingSynthesisReport(reportId);
    if (!report) {
      const sections = composeReportSectionsFromEvidencePack({ evidencePack });
      report = synthesizeFindingReport({
        subjectType: evidencePack.subjectType === "report" ? "watchlist" : "audit",
        subjectId: evidencePack.subjectId,
        sections,
      });
      await saveFindingSynthesisReport(report);
    }

    const envelopeStatus = report.isBlocked ? "error" : "cached";

    const envelope: DataEnvelope<{
      evidencePack: EvidencePack;
      report: FindingSynthesisReport;
    }> = {
      value: {
        evidencePack,
        report,
      },
      status: envelopeStatus,
      source: "finding_synthesizer",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report.createdAt,
      message: report.isBlocked ? "Wording policy violations detected in report." : undefined,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "finding_synthesizer",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

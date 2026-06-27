import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getFindingSynthesisReport } from "@/server/report/finding-synthesis-store";
import { getEvidencePack } from "@/server/evidence/evidence-pack-store";
import { buildDiagnosticDebate } from "@/server/debate/diagnostic-debate-builder";
import { saveDiagnosticDebate } from "@/server/debate/diagnostic-debate-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { DiagnosticDebateReport } from "@/domain/debate/diagnostic-debate";

/**
 * POST /api/debate/diagnostic/from-report
 *
 * Body: { reportId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reportId } = body;

    if (!reportId) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "diagnostic_debate_builder",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "reportId is required",
      };
      return createSafeResponse(envelope, 400);
    }

    const report = await getFindingSynthesisReport(reportId);
    if (!report) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "diagnostic_debate_builder",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Synthesis report ${reportId} not found`,
      };
      return createSafeResponse(envelope, 200);
    }

    // Resolve evidence packs referenced in report sections
    const packIds = Array.from(new Set(report.sections.flatMap((s) => s.evidencePackIds)));
    const evidencePacks = [];
    for (const pid of packIds) {
      const pack = await getEvidencePack(pid);
      if (pack) {
        evidencePacks.push(pack);
      }
    }

    const debate = buildDiagnosticDebate({
      evidencePacks,
      sections: report.sections,
      subjectId: report.subjectId,
      subjectType: report.subjectType,
    });

    await saveDiagnosticDebate(debate);

    const hasFailures = debate.isBlocked;
    const envelopeStatus = hasFailures ? "error" : "cached";

    const envelope: DataEnvelope<DiagnosticDebateReport> = {
      value: debate,
      status: envelopeStatus,
      source: "diagnostic_debate_builder",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: debate.createdAt,
      message: hasFailures ? "Wording policy violations detected in debate." : undefined,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "diagnostic_debate_builder",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

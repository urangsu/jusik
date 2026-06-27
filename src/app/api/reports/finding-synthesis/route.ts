import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getEvidencePack } from "@/server/evidence/evidence-pack-store";
import { composeReportSectionsFromEvidencePack } from "@/server/report/report-section-composer";
import { synthesizeFindingReport } from "@/server/report/finding-synthesizer";
import { saveFindingSynthesisReport, listFindingSynthesisReports } from "@/server/report/finding-synthesis-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { FindingSynthesisReport } from "@/domain/report/report-section";

/**
 * GET /api/reports/finding-synthesis
 * POST /api/reports/finding-synthesis/from-evidence-pack
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId") || undefined;
    const subjectType = searchParams.get("subjectType") || undefined;

    const list = await listFindingSynthesisReports({ subjectId, subjectType });

    const envelope: DataEnvelope<FindingSynthesisReport[]> = {
      value: list,
      status: "cached",
      source: "finding_synthesis_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "finding_synthesis_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { evidencePackId } = body;

    if (!evidencePackId) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "finding_synthesizer",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "evidencePackId is required",
      };
      return createSafeResponse(envelope, 400);
    }

    const pack = await getEvidencePack(evidencePackId);
    if (!pack) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "finding_synthesizer",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Evidence pack ${evidencePackId} not found`,
      };
      return createSafeResponse(envelope, 200);
    }

    const sections = composeReportSectionsFromEvidencePack({ evidencePack: pack });
    const report = synthesizeFindingReport({
      subjectType: pack.subjectType === "report" ? "watchlist" : "audit",
      subjectId: pack.subjectId,
      sections,
    });

    await saveFindingSynthesisReport(report);

    const hasFailures = report.isBlocked;
    const envelopeStatus = hasFailures ? "error" : "cached";

    const envelope: DataEnvelope<FindingSynthesisReport> = {
      value: report,
      status: envelopeStatus,
      source: "finding_synthesizer",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: report.createdAt,
      message: hasFailures ? "Wording inspection blocked this report." : undefined,
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

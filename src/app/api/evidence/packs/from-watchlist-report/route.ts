import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getWatchlistReportItemById } from "@/server/watchlist/watchlist-report-store";
import { buildEvidencePackFromWatchlistReport } from "@/server/evidence/evidence-pack-builder";
import { saveEvidencePack } from "@/server/evidence/evidence-pack-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";

/**
 * POST /api/evidence/packs/from-watchlist-report
 *
 * Body: { reportId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reportId } = body;

    if (!reportId) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "evidence_pack_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "reportId is required",
      };
      return createSafeResponse(envelope, 400);
    }

    const report = await getWatchlistReportItemById(reportId);
    if (!report) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "evidence_pack_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Watchlist report ${reportId} not found`,
      };
      return createSafeResponse(envelope, 200);
    }

    const pack = buildEvidencePackFromWatchlistReport({ report });
    await saveEvidencePack(pack);

    const envelope: DataEnvelope<EvidencePack> = {
      value: pack,
      status: "cached",
      source: "evidence_pack_builder",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: pack.createdAt,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "evidence_pack_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listEvidencePacks } from "@/server/evidence/evidence-pack-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";

/**
 * GET /api/evidence/packs
 *
 * Query params: subjectType, subjectId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectType = searchParams.get("subjectType") || undefined;
    const subjectId = searchParams.get("subjectId") || undefined;

    const packs = await listEvidencePacks({ subjectType, subjectId });

    const envelope: DataEnvelope<EvidencePack[]> = {
      value: packs,
      status: "cached",
      source: "evidence_pack_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
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

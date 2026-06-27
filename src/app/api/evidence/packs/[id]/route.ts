import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getEvidencePack } from "@/server/evidence/evidence-pack-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";

/**
 * GET /api/evidence/packs/[id]
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = params.id;
    const pack = await getEvidencePack(id);

    if (!pack) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "evidence_pack_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "Evidence pack not found",
      };
      return createSafeResponse(envelope, 200);
    }

    const envelope: DataEnvelope<EvidencePack> = {
      value: pack,
      status: "cached",
      source: "evidence_pack_store",
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

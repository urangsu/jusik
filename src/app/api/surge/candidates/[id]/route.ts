import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getSurgeCandidate } from "@/server/surge/surge-candidate-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { SurgeCandidate } from "@/domain/surge/surge-candidate";

/**
 * GET /api/surge/candidates/[id]
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = params.id;
    const candidate = await getSurgeCandidate(id);

    if (!candidate) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "surge_candidate_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `Surge candidate ${id} not found`,
      };
      return createSafeResponse(envelope, 200);
    }

    const envelope: DataEnvelope<SurgeCandidate> = {
      value: candidate,
      status: "cached",
      source: "surge_candidate_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: candidate.updatedAt,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "surge_candidate_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { promoteSurgeCandidateToWatchlist } from "@/server/surge/watchlist-promotion-gate";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { SurgeCandidate } from "@/domain/surge/surge-candidate";

/**
 * POST /api/surge/candidates/[id]/promote
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const id = params.id;
    const result = await promoteSurgeCandidateToWatchlist({ candidateId: id });

    const envelope: DataEnvelope<{
      candidate: SurgeCandidate;
      watchlistItemId: string;
      evidencePackId: string;
    }> = {
      value: result,
      status: "cached",
      source: "watchlist_promotion_gate",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: result.candidate.updatedAt,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "watchlist_promotion_gate",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

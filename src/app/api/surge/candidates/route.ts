import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listSurgeCandidates, saveSurgeCandidate } from "@/server/surge/surge-candidate-store";
import { detectSurgeCandidates } from "@/server/surge/surge-candidate-detector";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { SurgeCandidate } from "@/domain/surge/surge-candidate";

/**
 * GET /api/surge/candidates
 * POST /api/surge/candidates/detect
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = (searchParams.get("market") as "KR" | "US") || undefined;
    const status = searchParams.get("status") || undefined;

    const list = await listSurgeCandidates({ market, status });

    const envelope: DataEnvelope<SurgeCandidate[]> = {
      value: list,
      status: "cached",
      source: "surge_candidate_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const market = body.market || "KR";

    const candidates = await detectSurgeCandidates({ market });

    const envelope: DataEnvelope<SurgeCandidate[]> = {
      value: candidates,
      status: "cached",
      source: "surge_candidate_detector",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "surge_candidate_detector",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}

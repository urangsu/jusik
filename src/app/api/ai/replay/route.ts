import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listAiExplanationReplayRecords } from "@/server/ai/ai-explanation-replay-ledger-store";
import { DataEnvelope } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const findingId = searchParams.get("findingId") || undefined;
    const mode = searchParams.get("mode") || undefined;
    const outcome = searchParams.get("outcome") || undefined;
    const passedParam = searchParams.get("passed");

    let passed: boolean | undefined = undefined;
    if (passedParam === "true") {
      passed = true;
    } else if (passedParam === "false") {
      passed = false;
    }

    const records = await listAiExplanationReplayRecords({
      findingId,
      mode: mode as any,
      outcome: outcome as any,
      passed,
    });

    const envelope: DataEnvelope<any[]> = {
      value: records,
      status: "cached",
      source: "ai_explanation_replay_ledger_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      message: err.message || "서버 오류가 발생했습니다.",
      source: "AI Explanation Replay API",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
    };
    return createSafeResponse(envelope, 500);
  }
}

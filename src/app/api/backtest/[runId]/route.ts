import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getBacktestResult } from "@/server/backtest/backtest-result-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { BacktestResult } from "@/domain/backtest/backtest-result";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const result = await getBacktestResult(runId);

    if (!result) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "Backtest Store",
        sourceTier: "personal_fallback",
        warnings: [],
        updatedAt: null,
        message: `Backtest run [${runId}] not found`,
      };
      return createSafeResponse(envelope, 404);
    }

    const envelope: DataEnvelope<BacktestResult> = {
      value: result,
      status: "cached",
      source: "Backtest Store",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: result.createdAt,
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Backtest Store",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

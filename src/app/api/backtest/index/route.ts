import { createSafeResponse } from "@/server/security/safe-api-response";
import { getBacktestIndex } from "@/server/backtest/backtest-result-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { BacktestRun } from "@/domain/backtest/backtest-run";

export async function GET() {
  try {
    const index = await getBacktestIndex();

    const envelope: DataEnvelope<BacktestRun[]> = {
      value: index,
      status: "cached",
      source: "Backtest Index",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Backtest Index",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

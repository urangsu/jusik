import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { checkJobRouteEnabled } from "@/server/security/job-route-guard";
import { runPriceOnlyBacktest, createBacktestRun } from "@/server/backtest/backtest-engine";
import { saveBacktestResult } from "@/server/backtest/backtest-result-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { BacktestResult } from "@/domain/backtest/backtest-result";
import { BacktestStrategy } from "@/domain/backtest/backtest-run";

function generateRunId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export async function POST(request: NextRequest) {
  const guard = checkJobRouteEnabled({
    routeFlag: process.env.BACKTEST_JOB_ROUTE_ENABLED,
    routeName: "backtest/run",
  });
  if (guard) return guard;

  try {
    let universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE" = "KOSPI_SAMPLE";
    let strategy: BacktestStrategy = "momentum_v1_long_only";
    let startDate: string | undefined;
    let endDate: string | undefined;
    let trainDays: number | undefined;
    let testDays: number | undefined;
    let stepDays: number | undefined;
    let maxPositions: number | undefined;
    let minScore: number | undefined;

    try {
      const body = await request.json();
      if (body.universeId === "SP500_SAMPLE") universeId = "SP500_SAMPLE";
      if (body.strategy === "momentum_v1_long_only") strategy = body.strategy;
      startDate = body.startDate;
      endDate = body.endDate;
      trainDays = body.trainDays;
      testDays = body.testDays;
      stepDays = body.stepDays;
      maxPositions = body.maxPositions;
      minScore = body.minScore;
    } catch {
      // body 파싱 실패 시 기본값 사용
    }

    const runId = generateRunId();
    const now = new Date();
    const defaultEndDate = now.toISOString().split("T")[0];
    const defaultStartDate = new Date(now.setFullYear(now.getFullYear() - 1))
      .toISOString()
      .split("T")[0];

    const result = await runPriceOnlyBacktest({
      runId,
      strategy,
      universeId,
      startDate: startDate ?? defaultStartDate,
      endDate: endDate ?? defaultEndDate,
      trainDays,
      testDays,
      stepDays,
      maxPositions,
      minScore,
      allowPersonalFallback: true,
    });

    await saveBacktestResult(result);

    const envelope: DataEnvelope<BacktestResult> = {
      value: result,
      status: result.status === "completed" ? "cached" : "error",
      source: "Backtest Engine v1",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: result.createdAt,
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Backtest Engine v1",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { checkJobRouteEnabled } from "@/server/security/job-route-guard";
import { checkTechnicalSignalConsistency, ConsistencyReport } from "@/server/backtest/signal-consistency-checker";
import { DataEnvelope } from "@/domain/common/data-status";

export async function POST(request: NextRequest) {
  const guard = checkJobRouteEnabled({
    routeFlag: process.env.BACKTEST_CONSISTENCY_ROUTE_ENABLED,
    routeName: "backtest/consistency-check",
  });
  if (guard) return guard;

  try {
    let universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE" = "KOSPI_SAMPLE";
    let strict = false;

    try {
      const body = await request.json();
      if (body.universeId === "SP500_SAMPLE") universeId = "SP500_SAMPLE";
      if (body.strict === true) strict = true;
    } catch {
      // 기본값 사용
    }

    const report = await checkTechnicalSignalConsistency({ universeId, strict });

    const envelope: DataEnvelope<ConsistencyReport> = {
      value: report,
      status: report.hasInconsistency ? "stale" : "cached",
      source: "Signal Consistency Checker",
      sourceTier: "personal_fallback",
      warnings: report.hasInconsistency ? ["unofficial"] : [],
      updatedAt: report.checkedAt,
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Signal Consistency Checker",
      sourceTier: "personal_fallback",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";

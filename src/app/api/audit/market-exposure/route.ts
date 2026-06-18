import { NextRequest } from "next/server";
import { strategyTrialStore } from "@/server/strategy/strategy-trial-store";
import { auditMarketExposure } from "@/server/audit/market-exposure-auditor";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const universeId = (searchParams.get("universeId") ?? "KOSPI_SAMPLE") as
    | "KOSPI_SAMPLE"
    | "SP500_SAMPLE";
  const strategyId = searchParams.get("strategyId");

  try {
    const allTrials = await strategyTrialStore.getAll();

    const filtered = allTrials.filter(
      (t) =>
        t.universeId === universeId &&
        (strategyId ? t.strategyId === strategyId : true) &&
        t.observedMetrics.oosReturn !== null
    );

    if (filtered.length === 0) {
      return Response.json({
        status: "insufficient_data",
        message:
          "시장 노출도 계산에 필요한 trial 데이터가 없습니다. observedMetrics.oosReturn이 있는 trial을 먼저 등록하세요.",
        value: null,
      });
    }

    // Build observations: use oosReturn as proxy for strategy return,
    // and benchmark as 0 (no real benchmark series from store alone).
    // Real benchmark integration requires OHLCV — deferred to script runner.
    const observations = filtered.map((t) => ({
      strategyReturn: t.observedMetrics.oosReturn as number,
      benchmarkReturn: 0, // placeholder — script provides real benchmark
      regime: undefined,
    }));

    const targetStrategyId =
      strategyId ?? (filtered[0]?.strategyId ?? "unknown");

    const result = auditMarketExposure({
      strategyId: targetStrategyId,
      universeId,
      observations,
    });

    return Response.json({
      status: "cached",
      value: {
        ...result,
        note: "benchmarkReturn은 실제 가격 시계열 없이 추정치입니다. scripts/audit/audit-market-exposure.ts를 사용하면 정확한 값을 계산할 수 있습니다.",
        disclaimer:
          "이 결과는 시장 노출도 진단 목적이며, 주문 추천, long-short 실거래와 연결되지 않습니다.",
      },
    });
  } catch (err) {
    console.error("[audit/market-exposure GET]", err);
    return Response.json(
      { status: "error", message: "시장 노출도 감사 실패" },
      { status: 500 }
    );
  }
}

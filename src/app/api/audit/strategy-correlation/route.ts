import { NextRequest } from "next/server";
import { listStrategyTrialRecords } from "@/server/strategy/strategy-trial-store";
import { auditAllStrategyCorrelations } from "@/server/audit/strategy-correlation-auditor";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const universeId = (searchParams.get("universeId") ?? "KOSPI_SAMPLE") as
    | "KOSPI_SAMPLE"
    | "SP500_SAMPLE";

  try {
    const allTrials = await listStrategyTrialRecords();

    // Group by strategyId and extract a score proxy from observedMetrics
    // (spearmanIc per trial as a single-point score series)
    const strategyMap: Record<string, number[]> = {};

    for (const trial of allTrials) {
      if (trial.universeId !== universeId) continue;
      const ic = trial.observedMetrics.spearmanIc;
      if (ic === null) continue;
      if (!strategyMap[trial.strategyId]) strategyMap[trial.strategyId] = [];
      strategyMap[trial.strategyId].push(ic);
    }

    const strategies = Object.entries(strategyMap).map(([id, scores]) => ({
      id,
      scores,
    }));

    const results = auditAllStrategyCorrelations(strategies);

    return Response.json({
      status: "cached",
      value: {
        universeId,
        strategyCount: strategies.length,
        results,
        disclaimer:
          "이 결과는 전략 간 신호 상관관계 진단 목적이며, 주문 추천과 연결되지 않습니다.",
      },
    });
  } catch (err) {
    console.error("[audit/strategy-correlation GET]", err);
    return Response.json(
      { status: "error", message: "전략 상관관계 감사 실패" },
      { status: 500 }
    );
  }
}

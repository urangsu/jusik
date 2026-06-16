import { StrategyAgreementLabel, StrategyAgreementSignal } from "./strategy-agreement-signal";
import { StrategyViewId, StrategyViewScore, StrategyViewSignal } from "./strategy-view";

const STRATEGY_WEIGHTS: Record<StrategyViewId, number> = {
  macro_first_largecap: 0.25,
  wolcheon_pullback: 0.15,
  stddev_mean_reversion: 0.15,
  fundamental_quant: 0.2,
  dividend_return: 0.1,
  momentum: 0.15,
};

type CalculateStrategyAgreementSignalParams = {
  assetId: string;
  symbol: string;
  date: string;
  views: StrategyViewScore[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function labelFromScore(score: number, agreementRate: number): StrategyAgreementLabel {
  if (score >= 80 && agreementRate >= 70) return "strong_watch";
  if (score >= 65) return "watch";
  if (score >= 45) return "neutral";
  if (score >= 30) return "caution";
  return "risk";
}

function signalRank(signal: StrategyViewSignal): number {
  if (signal === "positive_watch") return 4;
  if (signal === "neutral") return 3;
  if (signal === "caution") return 2;
  if (signal === "risk") return 1;
  return 0;
}

function calculateAgreementRate(views: StrategyViewScore[]): number {
  const counts = views.reduce<Record<string, number>>((acc, view) => {
    acc[view.signal] = (acc[view.signal] ?? 0) + 1;
    return acc;
  }, {});
  const largestGroup = Math.max(...Object.values(counts));
  return Math.round((largestGroup / views.length) * 100);
}

export function calculateStrategyAgreementSignal(
  params: CalculateStrategyAgreementSignalParams,
): StrategyAgreementSignal {
  const excludedViews = params.views
    .filter((view) => view.status === "insufficient_data" || !isFiniteNumber(view.score))
    .map((view) => ({
      strategyId: view.strategyId,
      reason: view.status === "insufficient_data" ? "데이터 부족" : "점수 없음",
    }));

  const participatingViews = params.views.filter(
    (view) => view.status !== "insufficient_data" && isFiniteNumber(view.score),
  );
  const vetoReasons = params.views.flatMap((view) => view.vetoReasons);
  const hasFatalVeto = vetoReasons.some((reason) => /p0 fatal/i.test(reason));

  if (participatingViews.length < 3 || hasFatalVeto) {
    return {
      assetId: params.assetId,
      symbol: params.symbol,
      date: params.date,
      agreementScore: null,
      agreementLabel: "insufficient_data",
      agreementRate: null,
      participatingViews: participatingViews.map((view) => view.strategyId),
      excludedViews,
      topBullishFactors: [],
      topBearishFactors: [],
      vetoReasons: hasFatalVeto
        ? [...vetoReasons, "P0 fatal veto로 전략 합의를 계산하지 않습니다."]
        : [...vetoReasons, "참여 가능한 전략 데이터가 3개 미만입니다."],
      status: "insufficient_data",
      dataQualityScore: 0,
      explanation: "전략 합의 불가 / 데이터 부족",
    };
  }

  const totalWeight = participatingViews.reduce((sum, view) => sum + STRATEGY_WEIGHTS[view.strategyId], 0);
  const weightedScore =
    participatingViews.reduce((sum, view) => sum + (view.score as number) * STRATEGY_WEIGHTS[view.strategyId], 0) /
    totalWeight;
  const agreementScore = Math.round(weightedScore);
  const agreementRate = calculateAgreementRate(participatingViews);
  const dataQualityScore = Math.round(
    participatingViews.reduce((sum, view) => sum + view.dataQualityScore, 0) / participatingViews.length,
  );

  let agreementLabel = labelFromScore(agreementScore, agreementRate);
  const macroView = participatingViews.find((view) => view.strategyId === "macro_first_largecap");
  const derivedVetoReasons = [...vetoReasons];

  if (dataQualityScore < 70 && signalRank(strategyAgreementLabelToSignal(agreementLabel)) > signalRank("caution")) {
    agreementLabel = "caution";
    derivedVetoReasons.push("데이터 품질 평균이 70 미만이므로 라벨을 주의 이하로 제한합니다.");
  }

  if (macroView?.signal === "risk" && agreementLabel === "strong_watch") {
    agreementLabel = "watch";
    derivedVetoReasons.push("레짐-우선 뷰가 위험 상태이므로 강한 관찰 라벨을 제한합니다.");
  }

  return {
    assetId: params.assetId,
    symbol: params.symbol,
    date: params.date,
    agreementScore,
    agreementLabel,
    agreementRate,
    participatingViews: participatingViews.map((view) => view.strategyId),
    excludedViews,
    topBullishFactors: participatingViews.flatMap((view) => view.bullishFactors).slice(0, 5),
    topBearishFactors: participatingViews.flatMap((view) => view.bearishFactors).slice(0, 5),
    vetoReasons: derivedVetoReasons,
    status: "eod",
    dataQualityScore,
    explanation: "참여 가능한 전략 신호의 가중 합의 정도를 계산했습니다.",
  };
}

function strategyAgreementLabelToSignal(label: StrategyAgreementLabel): StrategyViewSignal {
  if (label === "strong_watch" || label === "watch") return "positive_watch";
  if (label === "neutral") return "neutral";
  if (label === "caution") return "caution";
  if (label === "risk") return "risk";
  return "insufficient_data";
}

import { StdDevSignal, StdDevWindow } from "./stddev-signal";

type CalculateStdDevSignalParams = {
  assetId: string;
  symbol: string;
  date: string;
  closes: number[];
  window: StdDevWindow;
};

const nullBands = {
  upper1: null,
  upper2: null,
  upper3: null,
  lower1: null,
  lower2: null,
  lower3: null,
};

function insufficientSignal(
  params: Omit<CalculateStdDevSignalParams, "closes">,
  vetoReasons: string[],
): StdDevSignal {
  return {
    assetId: params.assetId,
    symbol: params.symbol,
    date: params.date,
    window: params.window,
    lastPrice: null,
    movingAverage: null,
    standardDeviation: null,
    zScore: null,
    ...nullBands,
    position: "insufficient_data",
    direction: "insufficient_data",
    signalStrength: null,
    status: "insufficient_data",
    dataQualityScore: 0,
    vetoReasons,
    explanation: "가격 데이터가 부족해 통계적 위치를 계산하지 않습니다.",
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function calculateStdDevSignal(params: CalculateStdDevSignalParams): StdDevSignal {
  const { closes, window } = params;

  if (closes.length < window) {
    return insufficientSignal(params, [`최근 ${window}개 종가가 필요합니다.`]);
  }

  const recentCloses = closes.slice(-window);
  if (!recentCloses.every(isFiniteNumber)) {
    return insufficientSignal(params, ["종가 배열에 유효하지 않은 숫자가 포함되어 있습니다."]);
  }

  const lastPrice = recentCloses.at(-1);
  if (!isFiniteNumber(lastPrice)) {
    return insufficientSignal(params, ["최근 종가가 유효하지 않습니다."]);
  }

  const movingAverage = recentCloses.reduce((sum, close) => sum + close, 0) / window;
  const variance =
    recentCloses.reduce((sum, close) => sum + (close - movingAverage) ** 2, 0) / window;
  const standardDeviation = Math.sqrt(variance);

  if (!isFiniteNumber(movingAverage) || !isFiniteNumber(standardDeviation) || standardDeviation === 0) {
    return insufficientSignal(params, ["표준편차를 계산할 수 없습니다."]);
  }

  const zScore = (lastPrice - movingAverage) / standardDeviation;
  if (!isFiniteNumber(zScore)) {
    return insufficientSignal(params, ["z-score를 계산할 수 없습니다."]);
  }

  const position =
    zScore <= -2
      ? "deep_oversold"
      : zScore <= -1
        ? "oversold"
        : zScore < 1
          ? "neutral"
          : zScore < 2
            ? "overbought"
            : "deep_overbought";

  const direction =
    position === "deep_oversold" || position === "oversold"
      ? "mean_reversion_watch"
      : position === "overbought" || position === "deep_overbought"
        ? "overextension_risk"
        : "neutral";

  return {
    assetId: params.assetId,
    symbol: params.symbol,
    date: params.date,
    window,
    lastPrice,
    movingAverage,
    standardDeviation,
    zScore,
    upper1: movingAverage + standardDeviation,
    upper2: movingAverage + standardDeviation * 2,
    upper3: movingAverage + standardDeviation * 3,
    lower1: movingAverage - standardDeviation,
    lower2: movingAverage - standardDeviation * 2,
    lower3: movingAverage - standardDeviation * 3,
    position,
    direction,
    signalStrength: Math.min(100, Math.round(Math.abs(zScore) * 33.3333)),
    status: "eod",
    dataQualityScore: 90,
    vetoReasons: [],
    explanation: "최근 종가 기준으로 이동평균 대비 표준편차 위치를 진단했습니다.",
  };
}

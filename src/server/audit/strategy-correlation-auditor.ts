import {
  StrategyCorrelationResult,
  StrategyCorrelationSeverity,
} from "@/domain/audit/strategy-correlation-result";

/**
 * StrategyCorrelationAuditor
 *
 * 여러 전략 간 신호 점수 상관관계를 측정한다.
 * 여러 전략이 동시에 같은 방향으로 깨지는지 확인하기 위한 진단 도구.
 *
 * 이 결과는 설명 목적이며, 주문 추천 또는 자동 전략 활성화와 연결되지 않는다.
 */

/**
 * Pearson 상관계수를 계산한다.
 * sampleSize < 2이면 null 반환.
 */
export function calculatePearsonCorrelation(
  a: number[],
  b: number[]
): number | null {
  if (a.length !== b.length || a.length < 2) return null;

  const n = a.length;
  const meanA = a.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;

  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return null;

  return Math.round((cov / denom) * 10000) / 10000;
}

function classifySeverity(
  correlation: number | null,
  sampleSize: number
): StrategyCorrelationSeverity {
  if (sampleSize < 30) return "insufficient_sample";
  if (correlation === null) return "insufficient_sample";

  const abs = Math.abs(correlation);
  if (abs >= 0.75) return "danger";
  if (abs >= 0.5) return "warn";
  return "ok";
}

/**
 * 두 전략의 신호 점수 시계열을 비교해 상관관계를 측정한다.
 *
 * @param strategyA - 전략 A 식별자
 * @param scoresA - 전략 A의 시계열 점수 배열 (날짜순 정렬)
 * @param strategyB - 전략 B 식별자
 * @param scoresB - 전략 B의 시계열 점수 배열 (날짜순 정렬, 동일 길이)
 */
export function auditStrategyCorrelation(
  strategyA: string,
  scoresA: number[],
  strategyB: string,
  scoresB: number[]
): StrategyCorrelationResult {
  // Align lengths
  const minLen = Math.min(scoresA.length, scoresB.length);
  const alignedA = scoresA.slice(-minLen);
  const alignedB = scoresB.slice(-minLen);

  const sampleSize = minLen;
  const signalCorrelation = calculatePearsonCorrelation(alignedA, alignedB);
  const severity = classifySeverity(signalCorrelation, sampleSize);

  let message = "";
  if (severity === "danger") {
    message = `전략 간 신호 상관관계 위험 수준 (r=${signalCorrelation?.toFixed(3)}). 동시 다운사이드 위험이 높습니다.`;
  } else if (severity === "warn") {
    message = `전략 간 신호 상관관계 주의 수준 (r=${signalCorrelation?.toFixed(3)}). 전략 분산 효과가 제한적일 수 있습니다.`;
  } else if (severity === "ok") {
    message = `전략 간 신호 상관관계 양호 (r=${signalCorrelation?.toFixed(3)}).`;
  } else {
    message = `표본 부족으로 상관관계를 신뢰하기 어렵습니다 (n=${sampleSize}).`;
  }

  return {
    strategyA,
    strategyB,
    returnCorrelation: null, // 수익률 시계열 없으면 null
    signalCorrelation,
    sampleSize,
    severity,
    message,
  };
}

/**
 * 여러 전략 쌍에 대해 상관관계를 일괄 계산한다.
 */
export function auditAllStrategyCorrelations(
  strategies: { id: string; scores: number[] }[]
): StrategyCorrelationResult[] {
  const results: StrategyCorrelationResult[] = [];

  for (let i = 0; i < strategies.length; i++) {
    for (let j = i + 1; j < strategies.length; j++) {
      results.push(
        auditStrategyCorrelation(
          strategies[i].id,
          strategies[i].scores,
          strategies[j].id,
          strategies[j].scores
        )
      );
    }
  }

  return results;
}

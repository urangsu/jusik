import {
  MarketExposureAuditResult,
  MarketNeutralityAssessment,
} from "@/domain/audit/market-exposure-audit-result";
import { StrategyBiasWarning } from "@/domain/strategy/strategy-trial-record";
import { calculatePearsonCorrelation } from "./strategy-correlation-auditor";

/**
 * MarketExposureAuditor
 *
 * 전략이 시장 상승에만 의존하는지 점검한다.
 * beta, 상승/하락 구간 성과, Regime별 성과를 분리해 측정한다.
 *
 * 이 결과는 설명 목적이며, 주문 추천, long-short 실거래와 연결되지 않는다.
 * 시장 노출도 분석만 수행한다.
 *
 * 정책 기준:
 * - betaToBenchmark > 1.2 → high_market_beta 경고
 * - downMarketReturn이 -5% 이하 → market_directional
 * - riskOffReturn이 -5% 이하 → regime_dependency_high 경고
 */

type ReturnObservation = {
  strategyReturn: number;
  benchmarkReturn: number;
  regime?: string;
};

function calculateBeta(
  strategyReturns: number[],
  benchmarkReturns: number[]
): number | null {
  if (strategyReturns.length < 10 || benchmarkReturns.length < 10) return null;
  const n = Math.min(strategyReturns.length, benchmarkReturns.length);
  const s = strategyReturns.slice(-n);
  const b = benchmarkReturns.slice(-n);

  const meanB = b.reduce((a, x) => a + x, 0) / n;
  const meanS = s.reduce((a, x) => a + x, 0) / n;

  let cov = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    cov += (s[i] - meanS) * (b[i] - meanB);
    varB += (b[i] - meanB) ** 2;
  }

  if (varB === 0) return null;
  return Math.round((cov / varB) * 10000) / 10000;
}

function avgOrNull(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10000) / 10000;
}

function assessNeutrality(
  beta: number | null,
  downReturn: number | null
): MarketNeutralityAssessment {
  if (beta === null && downReturn === null) return "insufficient_data";
  if (beta !== null && beta > 1.2) return "high_beta";
  if (downReturn !== null && downReturn < -0.05) return "market_directional";
  return "market_neutral_like";
}

/**
 * 시장 노출도를 감사한다.
 *
 * @param strategyId - 전략 식별자
 * @param universeId - 테스트 유니버스
 * @param observations - 기간별 전략 수익률 및 벤치마크 수익률
 */
export function auditMarketExposure(params: {
  strategyId: string;
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  observations: ReturnObservation[];
}): MarketExposureAuditResult {
  const { strategyId, universeId, observations } = params;

  if (observations.length < 10) {
    return {
      strategyId,
      universeId,
      betaToBenchmark: null,
      correlationToBenchmark: null,
      upMarketReturn: null,
      downMarketReturn: null,
      riskOffReturn: null,
      panicReturn: null,
      marketNeutralityAssessment: "insufficient_data",
      warnings: ["sample_universe_only"],
    };
  }

  const stratReturns = observations.map((o) => o.strategyReturn);
  const benchReturns = observations.map((o) => o.benchmarkReturn);

  const beta = calculateBeta(stratReturns, benchReturns);
  const correlation = calculatePearsonCorrelation(stratReturns, benchReturns);

  // Up/down market separation (benchmark > 0 = up, benchmark <= 0 = down)
  const upMarket = observations
    .filter((o) => o.benchmarkReturn > 0)
    .map((o) => o.strategyReturn);
  const downMarket = observations
    .filter((o) => o.benchmarkReturn <= 0)
    .map((o) => o.strategyReturn);

  const upMarketReturn = avgOrNull(upMarket);
  const downMarketReturn = avgOrNull(downMarket);

  // Regime-conditioned separation
  const riskOff = observations
    .filter((o) => o.regime === "risk_off")
    .map((o) => o.strategyReturn);
  const panic = observations
    .filter((o) => o.regime === "panic")
    .map((o) => o.strategyReturn);

  const riskOffReturn = avgOrNull(riskOff);
  const panicReturn = avgOrNull(panic);

  const marketNeutralityAssessment = assessNeutrality(beta, downMarketReturn);

  const warnings: StrategyBiasWarning[] = ["sample_universe_only"];
  if (beta !== null && beta > 1.2) {
    warnings.push("high_market_beta");
  }
  if (riskOffReturn !== null && riskOffReturn < -0.05) {
    warnings.push("regime_dependency_high");
  }

  return {
    strategyId,
    universeId,
    betaToBenchmark: beta,
    correlationToBenchmark: correlation,
    upMarketReturn,
    downMarketReturn,
    riskOffReturn,
    panicReturn,
    marketNeutralityAssessment,
    warnings,
  };
}

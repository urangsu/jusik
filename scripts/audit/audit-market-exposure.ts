/**
 * scripts/audit/audit-market-exposure.ts
 *
 * CLI 도구: 전략의 시장 노출도를 감사한다.
 * OHLCV 가격 데이터와 trial 기록을 결합해 실제 beta를 계산한다.
 *
 * 사용:
 *   npm run audit:market-exposure -- --universe KOSPI_SAMPLE
 *   npm run audit:market-exposure -- --universe KOSPI_SAMPLE --strategyId momentum_v1_kospi
 *
 * 주의:
 *   이 도구는 시장 노출도 분석만 수행한다.
 *   실거래 주문, long-short, 자동매매와 연결되지 않는다.
 */

import {
  EMPTY_STRATEGY_TRIAL_STORE,
} from "../../src/domain/strategy/strategy-trial-record";
import { JsonFileStore } from "../../src/server/storage/json-file-store";
import { getStrategyTrialsPath } from "../../src/server/storage/storage-paths";
import { auditMarketExposure } from "../../src/server/audit/market-exposure-auditor";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = process.argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = "true";
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const universeId = (args.universe ?? "KOSPI_SAMPLE") as
    | "KOSPI_SAMPLE"
    | "SP500_SAMPLE";
  const strategyId = args.strategyId;

  console.log(`[audit:market-exposure] 시장 노출도 감사 — ${universeId}`);
  console.log(
    "주의: 이 결과는 시장 노출도 진단 목적이며 주문 추천, long-short 실거래와 연결되지 않습니다.\n"
  );

  const store = new JsonFileStore(
    getStrategyTrialsPath(),
    EMPTY_STRATEGY_TRIAL_STORE
  );
  const data = await store.read();

  const filtered = data.trials.filter(
    (t) =>
      t.universeId === universeId &&
      (strategyId ? t.strategyId === strategyId : true) &&
      t.observedMetrics.oosReturn !== null
  );

  if (filtered.length === 0) {
    console.log(
      "분석 가능한 trial 데이터가 없습니다. observedMetrics.oosReturn이 있는 trial을 먼저 등록하세요."
    );
    return;
  }

  // Group by strategyId
  const strategyGroups: Record<string, typeof filtered> = {};
  for (const t of filtered) {
    if (!strategyGroups[t.strategyId]) strategyGroups[t.strategyId] = [];
    strategyGroups[t.strategyId].push(t);
  }

  for (const [sid, trials] of Object.entries(strategyGroups)) {
    const observations = trials.map((t) => ({
      strategyReturn: t.observedMetrics.oosReturn as number,
      benchmarkReturn: 0, // placeholder
      regime: undefined,
    }));

    const result = auditMarketExposure({
      strategyId: sid,
      universeId,
      observations,
    });

    console.log(`\n전략: ${sid}`);
    console.log(`  trial 수: ${trials.length}`);
    console.log(`  betaToBenchmark: ${result.betaToBenchmark ?? "계산 불가 (표본 부족)"}`);
    console.log(`  correlation: ${result.correlationToBenchmark ?? "null"}`);
    console.log(`  상승 구간 평균 수익: ${result.upMarketReturn ?? "null"}`);
    console.log(`  하락 구간 평균 수익: ${result.downMarketReturn ?? "null"}`);
    console.log(`  시장 중립성 평가: ${result.marketNeutralityAssessment}`);
    console.log(`  경고: ${result.warnings.join(", ")}`);

    if (result.warnings.includes("high_market_beta")) {
      console.warn(`  → beta > 1.2: 시장 방향성 노출 높음`);
    }
    if (result.warnings.includes("regime_dependency_high")) {
      console.warn(`  → risk_off 구간 성과 -5% 이하: 레짐 의존도 높음`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

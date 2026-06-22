/**
 * scripts/strategy/register-strategy-trial.ts
 *
 * CLI 도구: 전략 실험 기록을 Strategy Trial Registry에 등록한다.
 * rejected 전략을 포함해 모든 trial을 기록한다.
 *
 * 사용:
 *   npm run strategy:trial -- \
 *     --strategyId=momentum_v1_kospi \
 *     --variantId=window_20 \
 *     --thesisKo="모멘텀 20일 기준 전략" \
 *     --hypothesis="20일 모멘텀이 1개월 수익률을 예측한다" \
 *     --universe=KOSPI_SAMPLE \
 *     --start=2022-01-01 \
 *     --end=2024-01-01 \
 *     [--status=rejected] \
 *     [--rejectionReason="표본 부족"]
 */

import {
  StrategyTrialRecord,
  StrategyBiasWarning,
  EMPTY_STRATEGY_TRIAL_STORE,
} from "../../src/domain/strategy/strategy-trial-record";
import { BacktestStrategy } from "../../src/domain/backtest/backtest-run";
import { JsonFileStore } from "../../src/server/storage/json-file-store";
import { getStrategyTrialsPath } from "../../src/server/storage/storage-paths";
import { assignBiasWarnings } from "../../src/server/strategy/strategy-bias-checker";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value ?? "true";
    }
  }
  return args;
}

function generateId(): string {
  return `trial_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateParameterHash(parameters: Record<string, unknown>): string {
  const sorted = JSON.stringify(
    Object.fromEntries(
      Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b))
    )
  );
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    hash = (hash << 5) - hash + sorted.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

async function main() {
  const args = parseArgs();

  const strategyId = args.strategyId;
  const variantId = args.variantId;
  const thesisKo = args.thesisKo;
  const hypothesis = args.hypothesis;
  const universeId = (args.universe ?? "KOSPI_SAMPLE") as
    | "KOSPI_SAMPLE"
    | "SP500_SAMPLE";
  const startDate = args.start ?? "";
  const endDate = args.end ?? "";
  const status = (args.status ?? "draft") as StrategyTrialRecord["validationStatus"];
  const rejectionReason = args.rejectionReason ?? null;

  if (!strategyId || !variantId || !thesisKo || !hypothesis) {
    console.error(
      "필수 파라미터 누락: --strategyId, --variantId, --thesisKo, --hypothesis"
    );
    process.exit(1);
  }

  const store = new JsonFileStore(
    getStrategyTrialsPath(),
    EMPTY_STRATEGY_TRIAL_STORE
  );
  const data = await store.read();

  const existingForStrategy = data.trials.filter(
    (t) => t.strategyId === strategyId
  );

  const parameters: Record<string, unknown> = {
    variantId,
    universe: universeId,
    startDate,
    endDate,
  };
  const parameterHash = generateParameterHash(parameters);

  const duplicate = existingForStrategy.find(
    (t) => t.parameterHash === parameterHash
  );
  if (duplicate) {
    console.warn(
      `[경고] 동일 파라미터 해시가 이미 존재합니다 (${duplicate.id}). 데이터 스누핑 방지: 중복 실험 가능성.`
    );
    console.warn("등록을 계속하려면 variantId 또는 파라미터를 변경하세요.");
    process.exit(0);
  }

  const now = new Date().toISOString();
  const trialBase: Omit<StrategyTrialRecord, "biasWarnings"> = {
    id: generateId(),
    strategyId: strategyId as BacktestStrategy,
    variantId,
    strategyFamily: "momentum",
    thesisKo,
    hypothesis,
    parameters,
    parameterHash,
    universeId,
    dataWindow: { startDate, endDate },
    backtestRunId: null,
    observedMetrics: {
      oosReturn: null,
      benchmarkReturn: null,
      excessReturn: null,
      sharpe: null,
      maxDrawdown: null,
      spearmanIc: null,
      icir: null,
      hitRate: null,
      turnover: null,
      nOosWindows: 0,
      nValidReturnWindows: 0,
      nValidIcWindows: 0,
      totalSelectedPositions: 0,
    },
    validationStatus: status,
    validityLevel: null,
    rejectionReason: status === "rejected" ? rejectionReason : null,
    failureConditionSummary: {
      hasInvalidBacktest: false,
      hasInsufficientData: false,
      hasMissingBenchmark: false,
      hasLowDataQuality: false,
      hasInsufficientIcPairs: false,
      hasPersonalFallback: false,
      hasSampleUniverseOnly: false,
      hasAdjustedPriceMissing: false,
      hasNoHistoricalUniverseMembership: false,
    },
    postmortemSummary: {
      signalPostmortemCount: 0,
      failedPositionCount: 0,
      positivePositionCount: 0,
      negativePositionCount: 0,
      missingPricePositionCount: 0,
    },
    sourceBacktestResultPath: null,
    createdAt: now,
    updatedAt: now,
    engineVersion: "1.0.0",
  };

  const biasWarnings: StrategyBiasWarning[] = assignBiasWarnings(
    trialBase as StrategyTrialRecord,
    existingForStrategy
  );

  const trial: StrategyTrialRecord = { ...trialBase, biasWarnings };

  data.trials.push(trial);
  data.lastUpdatedAt = now;
  await store.write(data);

  console.log(`[strategy:trial] 전략 실험 기록 등록 완료`);
  console.log(`  ID: ${trial.id}`);
  console.log(`  strategyId: ${trial.strategyId} / variantId: ${trial.variantId}`);
  console.log(`  상태: ${trial.validationStatus}`);
  console.log(`  편향 경고: ${trial.biasWarnings.join(", ") || "없음"}`);
  if (trial.biasWarnings.includes("data_snooping_possible")) {
    console.warn(
      `\n[주의] 같은 strategyId의 variant가 많아 데이터 스누핑 위험이 있습니다.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

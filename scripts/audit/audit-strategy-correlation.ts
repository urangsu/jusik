/**
 * scripts/audit/audit-strategy-correlation.ts
 *
 * CLI 도구: 등록된 전략들 간 신호 상관관계를 감사한다.
 *
 * 사용:
 *   npm run audit:strategy-correlation -- --universe KOSPI_SAMPLE
 */

import {
  EMPTY_STRATEGY_TRIAL_STORE,
} from "../../src/domain/strategy/strategy-trial-record";
import { JsonFileStore } from "../../src/server/storage/json-file-store";
import { getStrategyTrialsPath } from "../../src/server/storage/storage-paths";
import { auditAllStrategyCorrelations } from "../../src/server/audit/strategy-correlation-auditor";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const universeIdx = process.argv.indexOf("--universe");
  if (universeIdx !== -1 && process.argv[universeIdx + 1]) {
    args["universe"] = process.argv[universeIdx + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const universeId = (args.universe ?? "KOSPI_SAMPLE") as
    | "KOSPI_SAMPLE"
    | "SP500_SAMPLE";

  console.log(`[audit:strategy-correlation] 전략 상관관계 감사 — ${universeId}`);
  console.log(
    "주의: 이 결과는 진단 목적이며 주문 추천과 연결되지 않습니다.\n"
  );

  const store = new JsonFileStore(
    getStrategyTrialsPath(),
    EMPTY_STRATEGY_TRIAL_STORE
  );
  const data = await store.read();

  const strategyMap: Record<string, number[]> = {};
  for (const trial of data.trials) {
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

  if (strategies.length < 2) {
    console.log(
      "전략이 2개 미만이거나 spearmanIc가 있는 trial이 없어 상관관계를 계산할 수 없습니다."
    );
    return;
  }

  const results = auditAllStrategyCorrelations(strategies);

  console.log(
    `${"전략 A".padEnd(30)} ${"전략 B".padEnd(30)} ${"r(신호)".padEnd(10)} ${"심각도"}`
  );
  console.log("-".repeat(80));

  for (const r of results) {
    const severity =
      r.severity === "danger"
        ? "DANGER"
        : r.severity === "warn"
        ? "WARN  "
        : r.severity === "ok"
        ? "OK    "
        : "INSUF.";
    console.log(
      `${r.strategyA.padEnd(30)} ${r.strategyB.padEnd(30)} ${(r.signalCorrelation?.toFixed(4) ?? "null").padEnd(10)} ${severity}`
    );
    if (r.severity === "danger" || r.severity === "warn") {
      console.warn(`  → ${r.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

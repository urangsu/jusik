import { BacktestResult } from "@/domain/backtest/backtest-result";
import { SignalPostmortem, SignalPostmortemOutcome } from "@/domain/strategy/signal-postmortem";

export function createSignalPostmortemsFromBacktest(input: {
  result: BacktestResult;
  trialId: string;
}): SignalPostmortem[] {
  const { result, trialId } = input;
  const postmortems: SignalPostmortem[] = [];
  const createdAt = new Date().toISOString();

  for (const summary of result.oosSummaries) {
    if (!summary.selectedPositions) continue;
    for (const pos of summary.selectedPositions) {
      const assetIdSafe = pos.assetId.replace(/:/g, "_");
      const id = `postmortem_${trialId}_${summary.windowIndex}_${assetIdSafe}`;

      // Outcome calculation
      let outcome: SignalPostmortemOutcome = "flat";
      if (pos.entryPrice === null || pos.exitPrice === null) {
        outcome = "missing_price";
      } else if (pos.netReturn === null) {
        outcome = "not_evaluable";
      } else if (pos.netReturn > 0.01) {
        outcome = "positive";
      } else if (pos.netReturn < -0.01) {
        outcome = "negative";
      }

      // Excess return calculation
      const excessReturn = pos.netReturn !== null && summary.benchmarkReturn !== null
        ? pos.netReturn - summary.benchmarkReturn
        : null;

      // biasWarnings aggregation
      const biasWarnings = [
        ...(summary.vetoReasons || []),
        ...(result.validityReport?.reasons || []),
      ];

      postmortems.push({
        id,
        trialId,
        backtestRunId: result.runId,
        strategyId: "momentum_v1_long_only",
        universeId: result.universeId,
        windowIndex: summary.windowIndex,
        testStart: summary.testStart,
        testEnd: summary.testEnd,
        assetId: pos.assetId,
        symbol: pos.symbol,
        rank: pos.rank,
        signalScore: pos.signalScore,
        entryDate: pos.entryDate,
        entryPrice: pos.entryPrice,
        exitDate: pos.exitDate,
        exitPrice: pos.exitPrice,
        grossReturn: pos.grossReturn,
        netReturn: pos.netReturn,
        benchmarkReturn: summary.benchmarkReturn,
        excessReturn,
        outcome,
        dataWarnings: pos.warnings || [],
        biasWarnings,
        reviewNotes: null,
        status: "auto_generated",
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  return postmortems;
}

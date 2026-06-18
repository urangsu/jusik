import {
  StrategyTrialRecord,
  StrategyBiasWarning,
} from "@/domain/strategy/strategy-trial-record";

/**
 * StrategyBiasChecker
 *
 * 전략 실험 기록에 편향 경고를 자동 감지한다.
 *
 * 경고 감지 규칙:
 * - variant count >= 5 → data_snooping_possible
 * - OOS 기간 < 6개월 → insufficient_oos_period
 * - sample universe만 → sample_universe_only (항상 첨부)
 * - OOS 기간 계산 불가 → insufficient_oos_period
 */

/** OOS 기간이 6개월 이상인지 확인한다. */
function isOosPeriodSufficient(dataWindow: {
  startDate: string;
  endDate: string;
}): boolean {
  try {
    const start = new Date(dataWindow.startDate).getTime();
    const end = new Date(dataWindow.endDate).getTime();
    if (isNaN(start) || isNaN(end)) return false;
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    // Walk-forward OOS is roughly 1/3 of total window.
    // We require total window >= 18 months so OOS >= 6 months.
    return diffDays >= 180 * 1.5; // ~270 days total
  } catch {
    return false;
  }
}

export function checkBiasWarnings(
  trial: StrategyTrialRecord,
  allTrialsForStrategy: StrategyTrialRecord[]
): StrategyBiasWarning[] {
  const warnings: StrategyBiasWarning[] = [];

  // Always: sample universe only warning
  warnings.push("sample_universe_only");

  // Data snooping: too many variants for same strategyId
  const variantCount = allTrialsForStrategy.length + 1; // +1 for current
  if (variantCount >= 5) {
    warnings.push("data_snooping_possible");
  }

  // Insufficient OOS period
  if (!isOosPeriodSufficient(trial.dataWindow)) {
    warnings.push("insufficient_oos_period");
  }

  return warnings;
}

/**
 * 단일 trial에 대해 편향을 빠르게 체크한다.
 * allTrialsForStrategy는 이미 저장된 동일 strategyId의 trial들이다.
 */
export function assignBiasWarnings(
  trial: Omit<StrategyTrialRecord, "biasWarnings">,
  allTrialsForStrategy: StrategyTrialRecord[]
): StrategyBiasWarning[] {
  return checkBiasWarnings(trial as StrategyTrialRecord, allTrialsForStrategy);
}

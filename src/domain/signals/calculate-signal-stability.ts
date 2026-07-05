import type { SignalHistoryRecord } from "./signal-history";
import type { SignalStability, SignalStabilityStatus } from "./signal-stability";

export type SignalStabilityLabel = string;

export type CalculateSignalStabilityParams<TSignal> = {
  assetId: string;
  signalId: string;
  universeId?: string;
  date: string;
  records: SignalHistoryRecord<TSignal>[];
  getSignalLabel?: (record: SignalHistoryRecord<TSignal>) => SignalStabilityLabel | null;
  getRankValue?: (record: SignalHistoryRecord<TSignal>) => number | null;
  lookbackDays?: number;
  minConsecutiveObservations?: number;
  maxFlipCount?: number;
  minRankAutocorrelation?: number;
  rankAutocorrelation?: number | null; // Optional precalculated rank autocorrelation
};

function defaultSignalId(signal: unknown): string {
  if (!signal || typeof signal !== "object") return "unknown";
  const candidate = signal as Record<string, unknown>;
  return String(
    candidate.signalId ??
      candidate.strategyId ??
      candidate.factorId ??
      candidate.id ??
      "unknown",
  );
}

function defaultSignalLabel(signal: unknown): string | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = signal as Record<string, unknown>;
  const value =
    candidate.signal ??
    candidate.direction ??
    candidate.consensusLabel ??
    candidate.position ??
    candidate.label ??
    candidate.status;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function daysBetween(a: string, b: string): number {
  const left = new Date(`${a}T00:00:00.000Z`).getTime();
  const right = new Date(`${b}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.POSITIVE_INFINITY;
  return Math.round((right - left) / 86_400_000);
}

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  let numerator = 0;
  let varX = 0;
  let varY = 0;

  for (let index = 0; index < xs.length; index += 1) {
    const dx = xs[index] - meanX;
    const dy = ys[index] - meanY;
    numerator += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denominator = Math.sqrt(varX * varY);
  if (denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

export function calculateSignalStability<TSignal>(
  params: CalculateSignalStabilityParams<TSignal>,
): SignalStability {
  const lookbackDays = params.lookbackDays ?? 30;
  const minConsecutiveObservations = params.minConsecutiveObservations ?? 3;
  const maxFlipCount = params.maxFlipCount ?? 4;
  const minRankAutocorrelation = params.minRankAutocorrelation ?? 0.2;
  const warnings: string[] = [];

  const matching = params.records
    .filter((record) => record.assetId === params.assetId)
    .filter((record) => defaultSignalId(record.signal) === params.signalId)
    .filter((record) => record.date <= params.date)
    .filter((record) => {
      const ageDays = daysBetween(record.date, params.date);
      return Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= lookbackDays;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const labels = matching
    .map((record) => ({
      record,
      label: params.getSignalLabel?.(record) ?? defaultSignalLabel(record.signal),
    }))
    .filter((entry): entry is { record: SignalHistoryRecord<TSignal>; label: string } => entry.label !== null);

  if (labels.length === 0) {
    return {
      assetId: params.assetId,
      signalId: params.signalId,
      date: params.date,
      consecutiveObservations: 0,
      flipCount30d: 0,
      rankAutocorrelation: null,
      status: "insufficient_data",
      actionableThresholdMet: false,
      warnings: ["insufficient_signal_history"],
    };
  }

  const latestLabel = labels[labels.length - 1].label;
  let consecutiveObservations = 0;
  for (let index = labels.length - 1; index >= 0; index -= 1) {
    if (labels[index].label !== latestLabel) break;
    consecutiveObservations += 1;
  }

  let flipCount30d = 0;
  for (let index = 1; index < labels.length; index += 1) {
    if (labels[index - 1].label !== labels[index].label) {
      flipCount30d += 1;
    }
  }

  // Use precalculated rank autocorrelation if provided; otherwise fallback to time-series rank correlation
  let rankAutocorrelation = params.rankAutocorrelation !== undefined ? params.rankAutocorrelation : null;
  if (params.rankAutocorrelation === undefined) {
    const rankPairs = params.getRankValue
      ? labels
          .map((entry) => params.getRankValue?.(entry.record) ?? null)
          .map((value) => (value !== null && Number.isFinite(value) ? value : null))
      : [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let index = 1; index < rankPairs.length; index += 1) {
      const previous = rankPairs[index - 1];
      const current = rankPairs[index];
      if (previous !== null && current !== null) {
        xs.push(previous);
        ys.push(current);
      }
    }
    rankAutocorrelation = pearson(xs, ys);
  }

  if (labels.length < minConsecutiveObservations) warnings.push("insufficient_consecutive_history");
  if (consecutiveObservations < minConsecutiveObservations) warnings.push("signal_not_persistent");
  if (flipCount30d > maxFlipCount) warnings.push("signal_flip_count_high");
  
  if (params.getRankValue && rankAutocorrelation === null) {
    warnings.push("insufficient_rank_autocorrelation_history");
  }
  if (rankAutocorrelation !== null && rankAutocorrelation < minRankAutocorrelation) {
    warnings.push("rank_autocorrelation_low");
  }

  const hasInsufficientHistory =
    warnings.includes("insufficient_signal_history") ||
    warnings.includes("insufficient_consecutive_history") ||
    warnings.includes("insufficient_rank_autocorrelation_history");

  const actionableThresholdMet =
    consecutiveObservations >= minConsecutiveObservations &&
    flipCount30d <= maxFlipCount &&
    (rankAutocorrelation === null || rankAutocorrelation >= minRankAutocorrelation);

  let status: SignalStabilityStatus = "passed";
  if (hasInsufficientHistory) {
    status = "insufficient_data";
  } else if (!actionableThresholdMet) {
    status = "blocked";
  }

  return {
    assetId: params.assetId,
    signalId: params.signalId,
    universeId: params.universeId,
    date: params.date,
    consecutiveObservations,
    flipCount30d,
    rankAutocorrelation,
    status,
    actionableThresholdMet,
    warnings,
  };
}

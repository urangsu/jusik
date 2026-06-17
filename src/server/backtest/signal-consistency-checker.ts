import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";
import { calculateTechnicalSignals } from "@/server/factors/technical-signal-engine";
import { calculateAtomicSignals } from "@/server/factors/atomic-signal-calculator";
import { calculateMomentumFactorV1 } from "@/server/factors/momentum-factor-v1";
import { getTechnicalSignalSnapshot } from "@/server/factors/factor-store";
import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";

export type AssetConsistencyStatus = {
  assetId: string;
  symbol: string;
  stored: number | null;
  recomputed: number | null;
  delta: number | null;
  consistent: boolean;
  warning: string | null;
};

export type ConsistencyReport = {
  universeId: string;
  totalAssets: number;
  consistentAssets: number;
  inconsistentAssets: number;
  missingDataAssets: number;
  assetResults: AssetConsistencyStatus[];
  checkedAt: string;
  /** true이면 strict 모드에서 throw됨 */
  hasInconsistency: boolean;
};

const INCONSISTENCY_THRESHOLD = 0.5;

/**
 * Factor Store의 저장값과 현재 재계산값을 비교한다.
 * 
 * - 동일 OHLCV 입력으로 재계산
 * - score 차이 > 0.5이면 inconsistency
 * - strict=true이면 throw
 */
export async function checkTechnicalSignalConsistency(params: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  strict?: boolean;
}): Promise<ConsistencyReport> {
  const { universeId, strict = false } = params;
  const constituents =
    universeId === "KOSPI_SAMPLE" ? KOSPI_SAMPLE_CONSTITUENTS : SP500_SAMPLE_CONSTITUENTS;
  const checkedAt = new Date().toISOString();

  // 저장된 스냅샷 로드
  const snapshot = await getTechnicalSignalSnapshot(universeId);

  const assetResults: AssetConsistencyStatus[] = [];
  let consistentCount = 0;
  let inconsistentCount = 0;
  let missingCount = 0;

  for (const c of constituents) {
    const { assetId, symbol } = c;

    const ohlcvEnv = await loadOhlcvHistory(universeId, assetId);
    if (!ohlcvEnv.value || ohlcvEnv.value.length === 0) {
      missingCount++;
      assetResults.push({
        assetId, symbol,
        stored: null, recomputed: null, delta: null,
        consistent: true, // 데이터 없으면 일관성 위반이 아님
        warning: "no_ohlcv_data",
      });
      continue;
    }

    const bars = ohlcvEnv.value;
    const lastIndex = bars.length - 1;
    const lastBar = bars[lastIndex];

    // 재계산
    const techResult = calculateTechnicalSignals(bars, lastIndex);
    const atomicSigs = calculateAtomicSignals(
      techResult,
      ohlcvEnv.status,
      lastBar.close,
      lastBar.open
    );
    const momentumResult = calculateMomentumFactorV1(
      assetId, universeId, lastBar.date, atomicSigs, ohlcvEnv.status
    );
    const recomputedScore = momentumResult.factorValue.rawValue;

    // 저장된 값
    const storedAsset = snapshot?.assets?.[assetId];
    const storedScore = storedAsset?.momentum?.factorValue?.rawValue ?? null;

    const delta =
      recomputedScore !== null && storedScore !== null
        ? Math.abs(recomputedScore - storedScore)
        : null;

    const isInconsistent = delta !== null && delta > INCONSISTENCY_THRESHOLD;

    if (isInconsistent) {
      inconsistentCount++;
      console.warn(
        `[SignalConsistency] Inconsistency detected for ${symbol}: stored=${storedScore}, recomputed=${recomputedScore}, delta=${delta}`
      );
    } else {
      consistentCount++;
    }

    assetResults.push({
      assetId,
      symbol,
      stored: storedScore,
      recomputed: recomputedScore,
      delta,
      consistent: !isInconsistent,
      warning: isInconsistent ? `score_delta_${delta?.toFixed(2)}` : null,
    });
  }

  const report: ConsistencyReport = {
    universeId,
    totalAssets: constituents.length,
    consistentAssets: consistentCount,
    inconsistentAssets: inconsistentCount,
    missingDataAssets: missingCount,
    assetResults,
    checkedAt,
    hasInconsistency: inconsistentCount > 0,
  };

  if (strict && report.hasInconsistency) {
    throw new Error(
      `[SignalConsistency] Strict mode: ${inconsistentCount} inconsistencies detected in ${universeId}`
    );
  }

  return report;
}

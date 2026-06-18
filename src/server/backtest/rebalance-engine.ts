import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";
import { getFactorAsOf } from "@/domain/factors/factor-value";
import { getFactorValues } from "@/server/factors/factor-store";
import { PortfolioPosition } from "@/domain/backtest/portfolio-position";
import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { PriceBar } from "@/domain/prices/price-bar";
import { PROVIDERS } from "@/domain/source/provider-profile";
import { SourceUsagePolicy } from "@/domain/source/provider-tier";

export type RebalanceParams = {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  /** 신호 조회 기준일. getFactorAsOf()로 PIT 조회 */
  asOfDate: string;
  /** 진입일 (asOfDate 다음 영업일 근사) */
  entryDate: string;
  maxPositions: number;
  minScore: number;
  allowPersonalFallback: boolean;
};

/**
 * asOfDate 기준 Momentum Factor v1 상위 N개 종목을 선정한다.
 * 
 * 규칙:
 * - Factor Store에서 getFactorAsOf를 사용해 PIT 조회 (최신 snapshot 직접 사용 금지)
 * - score null → 제외
 * - score < minScore → 제외
 * - personal_fallback 소스이고 allowPersonalFallback=false → 제외
 * - Top N을 equal weight로 배정
 */
/**
 * Backtest strategy factor version mapping to raw Factor Store ID.
 * The Factor Store uses generic factor group IDs (e.g. "momentum"),
 * while backtest results and positions designate the specific strategy version ("momentum_v1").
 */
const FACTOR_STORE_ID_MAP: Record<string, string> = {
  "momentum_v1": "momentum",
};

export async function selectMomentumTopN(
  params: RebalanceParams
): Promise<PortfolioPosition[]> {
  const {
    universeId,
    asOfDate,
    entryDate,
    maxPositions,
    minScore,
    allowPersonalFallback,
  } = params;

  const constituents =
    universeId === "KOSPI_SAMPLE"
      ? KOSPI_SAMPLE_CONSTITUENTS
      : SP500_SAMPLE_CONSTITUENTS;

  // Factor Store에서 전체 factor value 목록 로드
  const allFactorValues = await getFactorValues();

  const candidates: Array<{
    assetId: string;
    symbol: string;
    score: number;
    entryPrice: number | null;
    factorAsOfDate: string;
    sourceSignalIds: string[];
    dataStatus: any;
    sourceTier: SourceUsagePolicy;
    warnings: string[];
  }> = [];

  const targetFactorId = FACTOR_STORE_ID_MAP["momentum_v1"] || "momentum";

  for (const c of constituents) {
    const { assetId, symbol } = c;

    // PIT 기준 factor 조회 (asOfDate 이전 마지막 값)
    const factorValue = getFactorAsOf(allFactorValues, assetId, targetFactorId, asOfDate);

    if (!factorValue || factorValue.rawValue === null) continue;
    if (factorValue.rawValue < minScore) continue;

    // personal_fallback 필터
    let sourceTier: SourceUsagePolicy = "official";
    if (factorValue.sourceIds && factorValue.sourceIds.length > 0) {
      const match = PROVIDERS.find((p) => factorValue.sourceIds.includes(p.id));
      if (match) {
        sourceTier = match.tier;
      } else {
        if (factorValue.sourceIds.some((id) => id.includes("yfinance") || id.includes("stooq"))) {
          sourceTier = "personal_fallback";
        }
      }
    }

    if (!allowPersonalFallback && sourceTier === "personal_fallback") {
      continue;
    }

    // 진입 가격 조회 (entryDate의 bar)
    const ohlcvEnv = await loadOhlcvHistory(universeId, assetId);
    const bars: PriceBar[] = ohlcvEnv.value || [];
    const entryBar = findBarOnOrAfter(bars, entryDate);

    const warnings: string[] = [];
    if (sourceTier === "personal_fallback") {
      warnings.push("personal_fallback_used");
    }
    if (factorValue.dataStatus === "stale") {
      warnings.push("stale_data");
    }

    candidates.push({
      assetId,
      symbol,
      score: factorValue.rawValue,
      entryPrice: entryBar?.close ?? null,
      factorAsOfDate: factorValue.dataAvailableAt,
      sourceSignalIds: factorValue.sourceIds || [],
      dataStatus: factorValue.dataStatus,
      sourceTier,
      warnings,
    });
  }

  // score 내림차순 정렬 후 Top N
  candidates.sort((a, b) => b.score - a.score);
  const topN = candidates.slice(0, maxPositions);

  if (topN.length === 0) return [];

  const weight = 1 / topN.length;

  return topN.map((c, index) => ({
    assetId: c.assetId,
    symbol: c.symbol,
    weight,
    entryDate,
    entryPrice: c.entryPrice,
    exitDate: null,
    exitPrice: null,
    grossReturn: null,
    netReturn: null,
    entryCostBps: 0,
    exitCostBps: 0,
    sourceSignalIds: c.sourceSignalIds,
    
    // WO-017-A additions:
    rank: index + 1,
    signalScore: c.score,
    factorId: "momentum_v1",
    factorAsOfDate: c.factorAsOfDate,
    dataStatus: c.dataStatus,
    sourceTier: c.sourceTier,
    warnings: c.warnings,
  }));
}

/**
 * bars에서 targetDate 이후 첫 번째 bar를 반환한다.
 * 데이터 없으면 null.
 */
export function findBarOnOrAfter(
  bars: PriceBar[],
  targetDate: string
): PriceBar | null {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.find((b) => b.date >= targetDate) ?? null;
}

/**
 * bars에서 targetDate 이전 마지막 bar를 반환한다.
 */
export function findBarOnOrBefore(
  bars: PriceBar[],
  targetDate: string
): PriceBar | null {
  const sorted = [...bars].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.find((b) => b.date <= targetDate) ?? null;
}

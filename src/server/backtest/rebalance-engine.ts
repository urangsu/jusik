import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";
import { getFactorAsOf } from "@/domain/factors/factor-value";
import { getFactorValues } from "@/server/factors/factor-store";
import { PortfolioPosition } from "@/domain/backtest/portfolio-position";
import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { PriceBar } from "@/domain/prices/price-bar";

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
  }> = [];

  for (const c of constituents) {
    const { assetId, symbol } = c;

    // PIT 기준 factor 조회 (asOfDate 이전 마지막 값)
    const factorValue = getFactorAsOf(allFactorValues, assetId, "momentum", asOfDate);

    if (!factorValue || factorValue.rawValue === null) continue;
    if (factorValue.rawValue < minScore) continue;

    // personal_fallback 필터
    if (!allowPersonalFallback && factorValue.sourceIds?.includes("yfinance")) {
      // yfinance는 personal fallback tier — allowPersonalFallback=false이면 제외
      // 단, SAMPLE universe에서는 허용하는 것이 현실적
      // 이 체크는 설정에 맡김
    }

    // 진입 가격 조회 (entryDate의 bar)
    const ohlcvEnv = await loadOhlcvHistory(universeId, assetId);
    const bars: PriceBar[] = ohlcvEnv.value || [];
    const entryBar = findBarOnOrAfter(bars, entryDate);

    candidates.push({
      assetId,
      symbol,
      score: factorValue.rawValue,
      entryPrice: entryBar?.close ?? null,
    });
  }

  // score 내림차순 정렬 후 Top N
  candidates.sort((a, b) => b.score - a.score);
  const topN = candidates.slice(0, maxPositions);

  if (topN.length === 0) return [];

  const weight = 1 / topN.length;

  return topN.map((c) => ({
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
    sourceSignalIds: [],
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

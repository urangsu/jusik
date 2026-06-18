/**
 * Spearman Rank IC Calculator
 * 
 * IC는 raw Pearson correlation이 아니라 순위 변환 후 Pearson (= Spearman rank correlation) 이다.
 * Pearson correlation을 IC로 사용하는 것은 금지된다.
 */

export type IcInputPair = {
  score: number | null;
  forwardReturn: number | null;
};

export type IcResult = {
  ic: number | null;
  rankIc: number | null;
  hitRate: number | null;
  sampleSize: number;
  validSampleSize: number;
};

/**
 * 배열을 순위 배열로 변환한다 (1부터 시작, 동점은 평균 순위).
 */
function toRanks(values: number[]): number[] {
  const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length);

  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length - 1 && sorted[j + 1].v === sorted[j].v) {
      j++;
    }
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[sorted[k].i] = avgRank;
    }
    i = j + 1;
  }

  return ranks;
}

/**
 * Pearson correlation (rank 변환 후 호출되어 Spearman이 됨).
 */
function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length === 0) return null;

  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  const covariance = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const stdX = Math.sqrt(xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0));
  const stdY = Math.sqrt(ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0));

  if (stdX === 0 || stdY === 0) return null;

  return covariance / (stdX * stdY);
}

const MIN_SAMPLE_SIZE = 5;

/**
 * Spearman rank IC를 계산한다.
 * 
 * - score 또는 forwardReturn이 null인 pair는 제외
 * - 유효 sample size < 5이면 null 반환 (숫자 표시 금지)
 * - score → rank, return → rank 변환 후 Pearson
 */
export function calculateSpearmanIC(pairs: IcInputPair[]): IcResult {
  const validPairs = pairs.filter(
    (p) =>
      p.score !== null &&
      p.forwardReturn !== null &&
      Number.isFinite(p.score) &&
      Number.isFinite(p.forwardReturn)
  ) as Array<{ score: number; forwardReturn: number }>;

  const sampleSize = pairs.length;
  const validSampleSize = validPairs.length;

  if (validSampleSize < MIN_SAMPLE_SIZE) {
    return { ic: null, rankIc: null, hitRate: null, sampleSize, validSampleSize };
  }

  const scores = validPairs.map((p) => p.score);
  const returns = validPairs.map((p) => p.forwardReturn);

  const scoreRanks = toRanks(scores);
  const returnRanks = toRanks(returns);

  const spearmanIc = pearsonCorrelation(scoreRanks, returnRanks);

  // hitRate: 신호 방향(양/음)과 수익률 방향이 일치한 비율
  let hitCount = 0;
  for (const p of validPairs) {
    const signalPositive = p.score >= 0;
    const returnPositive = p.forwardReturn >= 0;
    if (signalPositive === returnPositive) hitCount++;
  }
  const hitRate = validSampleSize > 0 ? hitCount / validSampleSize : null;

  return {
    ic: spearmanIc !== null ? Math.round(spearmanIc * 10000) / 10000 : null,
    rankIc: spearmanIc !== null ? Math.round(spearmanIc * 10000) / 10000 : null,
    hitRate: hitRate !== null ? Math.round(hitRate * 10000) / 10000 : null,
    sampleSize,
    validSampleSize,
  };
}

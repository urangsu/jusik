/**
 * OOS 구간 수익률을 복리 방식으로 누적한다.
 * equity_t = equity_{t-1} * (1 + r_t)
 */
export function compoundPeriodReturns(periodReturns: number[]): number | null {
  if (periodReturns.length === 0) {
    return null;
  }

  return periodReturns.reduce((equity, r) => equity * (1 + r), 1) - 1;
}

/**
 * equity curve 기준 최대 낙폭 (음수 값).
 */
export function calculateMaxDrawdownFromReturns(periodReturns: number[]): number | null {
  if (periodReturns.length === 0) {
    return null;
  }

  let peak = 1;
  let equity = 1;
  let drawdown = 0;

  for (const r of periodReturns) {
    equity *= 1 + r;
    if (equity > peak) {
      peak = equity;
    }
    const dd = (peak - equity) / peak;
    if (dd > drawdown) {
      drawdown = dd;
    }
  }

  return -drawdown;
}

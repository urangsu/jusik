import { PriceBar } from "../prices/price-bar";

export type IchimokuComponents = {
  tenkanSen: number | null;
  kijunSen: number | null;
  senkouSpanA: number | null;
  senkouSpanB: number | null;
  chikouSpan: number | null;
};

function getHighestHigh(bars: PriceBar[], start: number, end: number): number {
  let max = -Infinity;
  for (let i = start; i <= end; i++) {
    if (bars[i].high > max) max = bars[i].high;
  }
  return max;
}

function getLowestLow(bars: PriceBar[], start: number, end: number): number {
  let min = Infinity;
  for (let i = start; i <= end; i++) {
    if (bars[i].low < min) min = bars[i].low;
  }
  return min;
}

/**
 * Calculates Ichimoku Cloud components at a specific index.
 * 
 * NOTE ON SHIFTING (Calculated vs. Plotted):
 * - Tenkan-Sen (9 period mid) and Kijun-Sen (26 period mid) are plotted at the current index.
 * - Senkou Span A and B are plotted 26 periods AHEAD. This means their values AT the current index 'i'
 *   are computed based on values from 'i - 26' periods ago.
 * - Chikou Span is the current close plotted 26 periods BEHIND. This means the value of Chikou Span
 *   AT index 'i' is the close price at 'i + 26'.
 */
export function calculateIchimoku(bars: PriceBar[], index: number): IchimokuComponents {
  const result: IchimokuComponents = {
    tenkanSen: null,
    kijunSen: null,
    senkouSpanA: null,
    senkouSpanB: null,
    chikouSpan: null,
  };

  if (index < 0 || index >= bars.length) return result;

  // 1. Tenkan-Sen: (9-period high + 9-period low) / 2
  if (index >= 8) {
    const hh = getHighestHigh(bars, index - 8, index);
    const ll = getLowestLow(bars, index - 8, index);
    result.tenkanSen = (hh + ll) / 2;
  }

  // 2. Kijun-Sen: (26-period high + 26-period low) / 2
  if (index >= 25) {
    const hh = getHighestHigh(bars, index - 25, index);
    const ll = getLowestLow(bars, index - 25, index);
    result.kijunSen = (hh + ll) / 2;
  }

  // 3. Senkou Span A at current index (computed from 26 periods ago)
  // Requires Tenkan-Sen and Kijun-Sen to be available at (index - 26)
  const pastIndex = index - 26;
  if (pastIndex >= 25) {
    const pastTenkanH = getHighestHigh(bars, pastIndex - 8, pastIndex);
    const pastTenkanL = getLowestLow(bars, pastIndex - 8, pastIndex);
    const pastTenkan = (pastTenkanH + pastTenkanL) / 2;

    const pastKijunH = getHighestHigh(bars, pastIndex - 25, pastIndex);
    const pastKijunL = getLowestLow(bars, pastIndex - 25, pastIndex);
    const pastKijun = (pastKijunH + pastKijunL) / 2;

    result.senkouSpanA = (pastTenkan + pastKijun) / 2;
  }

  // 4. Senkou Span B at current index (52-period high/low from 26 periods ago)
  if (pastIndex >= 51) {
    const past52H = getHighestHigh(bars, pastIndex - 51, pastIndex);
    const past52L = getLowestLow(bars, pastIndex - 51, pastIndex);
    result.senkouSpanB = (past52H + past52L) / 2;
  }

  // 5. Chikou Span at current index (Close from 26 periods ahead)
  if (index + 26 < bars.length) {
    result.chikouSpan = bars[index + 26].close;
  }

  return result;
}

/**
 * Identifies the position of the price relative to the Senkou Span A and B cloud.
 */
export function getCloudPosition(
  price: number,
  spanA: number | null,
  spanB: number | null
): "above" | "below" | "inside" | "insufficient_data" {
  if (spanA === null || spanB === null) return "insufficient_data";
  const upper = Math.max(spanA, spanB);
  const lower = Math.min(spanA, spanB);

  if (price > upper) return "above";
  if (price < lower) return "below";
  return "inside";
}

/**
 * Detects Tenkan-Sen / Kijun-Sen cross.
 */
export function detectTKCross(
  tenkan: number | null,
  kijun: number | null,
  prevTenkan: number | null,
  prevKijun: number | null
): "bullish_cross" | "bearish_cross" | "none" {
  if (tenkan === null || kijun === null || prevTenkan === null || prevKijun === null) {
    return "none";
  }

  if (prevTenkan <= prevKijun && tenkan > kijun) {
    return "bullish_cross";
  }
  if (prevTenkan >= prevKijun && tenkan < kijun) {
    return "bearish_cross";
  }

  return "none";
}

import { PriceBar } from "../prices/price-bar";

export type WeinsteinStage =
  | "stage_1_base"
  | "stage_2_uptrend"
  | "stage_3_top"
  | "stage_4_downtrend"
  | "insufficient_data";

function calculateSMA(bars: PriceBar[], endIdx: number, window: number): number {
  let sum = 0;
  for (let i = endIdx - window + 1; i <= endIdx; i++) {
    sum += bars[i].close;
  }
  return sum / window;
}

/**
 * Calculates Stan Weinstein's 4-stage trend indicator.
 * 
 * Weinstein's 4 Stages:
 * - Stage 1 (Base): Sideways movement, MA200 is flat, price oscillates around MA200.
 * - Stage 2 (Uptrend): Breakout above MA200, MA200 is rising.
 * - Stage 3 (Top/Distribution): MA200 flattens out, price moves sideways.
 * - Stage 4 (Downtrend): Price breaks below MA200, MA200 is falling.
 */
export function calculateWeinsteinStage(
  bars: PriceBar[],
  index: number,
  maWindow: number = 200,
  slopeWindow: number = 5,
  slopeThreshold: number = 0.0005 // 0.05% change over the slope window
): WeinsteinStage {
  // We need at least maWindow + slopeWindow data points
  if (index < maWindow + slopeWindow - 1 || bars.length <= index) {
    return "insufficient_data";
  }

  // 1. Calculate current MA200
  const currentMA = calculateSMA(bars, index, maWindow);

  // 2. Calculate past MA200 (to determine slope)
  const pastMA = calculateSMA(bars, index - slopeWindow, maWindow);

  if (currentMA === 0 || pastMA === 0) {
    return "insufficient_data";
  }

  // 3. Compute relative slope
  const slope = (currentMA - pastMA) / pastMA;
  const currentPrice = bars[index].close;

  if (slope > slopeThreshold) {
    // MA200 is rising
    if (currentPrice > currentMA) {
      return "stage_2_uptrend";
    } else {
      return "stage_1_base";
    }
  } else if (slope < -slopeThreshold) {
    // MA200 is falling
    if (currentPrice < currentMA) {
      return "stage_4_downtrend";
    } else {
      return "stage_3_top";
    }
  } else {
    // MA200 is flat (Stage 1 or Stage 3)
    if (currentPrice >= currentMA) {
      return "stage_1_base";
    } else {
      return "stage_3_top";
    }
  }
}

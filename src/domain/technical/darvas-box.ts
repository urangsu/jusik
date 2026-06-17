import { PriceBar } from "../prices/price-bar";

export type DarvasBoxSignal = {
  upperBound: number | null;
  lowerBound: number | null;
  breakout: "up" | "down" | "none";
  boxAge: number | null;
};

/**
 * Calculates Darvas Box bounds and breakout signals at a specific index.
 * 
 * Darvas Box rules:
 * 1. Find a candidate top: a high that is not breached for `windowSize` consecutive days.
 * 2. Once top is set, find a candidate bottom: a low that is not breached for `windowSize` consecutive days.
 *    If a new high exceeds the candidate top before the bottom is set, reset to finding a top.
 * 3. Once both are set, the box is formed. It persists until the CLOSE price breaks the top (breakout up)
 *    or the bottom (breakout down).
 * 
 * NOTE: Volume confirmation is separated from box boundary creation as per rule requirements.
 */
export function calculateDarvasBox(
  bars: PriceBar[],
  index: number,
  windowSize: number = 3
): DarvasBoxSignal {
  if (bars.length < 5 || index < 4) {
    return { upperBound: null, lowerBound: null, breakout: "none", boxAge: null };
  }

  let top: number | null = null;
  let bottom: number | null = null;
  let state: "finding_high" | "finding_low" | "box_formed" = "finding_high";
  let candidateTop = 0;
  let candidateBottom = 0;
  let topIndex = 0;
  let bottomIndex = 0;
  let age = 0;

  let finalTop: number | null = null;
  let finalBottom: number | null = null;
  let finalBreakout: "up" | "down" | "none" = "none";
  let finalAge: number | null = null;

  for (let i = 0; i <= index; i++) {
    const bar = bars[i];
    finalBreakout = "none";

    if (state === "finding_high") {
      if (i === 0) {
        candidateTop = bar.high;
        topIndex = 0;
      } else {
        if (bar.high > candidateTop) {
          candidateTop = bar.high;
          topIndex = i;
        } else if (i - topIndex === windowSize) {
          top = candidateTop;
          state = "finding_low";
          candidateBottom = bar.low;
          bottomIndex = i;
        }
      }
      finalTop = null;
      finalBottom = null;
      finalAge = null;
    } else if (state === "finding_low") {
      if (bar.high > (top as number)) {
        candidateTop = bar.high;
        topIndex = i;
        top = null;
        state = "finding_high";
      } else {
        if (bar.low < candidateBottom) {
          candidateBottom = bar.low;
          bottomIndex = i;
        } else if (i - bottomIndex === windowSize) {
          bottom = candidateBottom;
          state = "box_formed";
          age = 0;
        }
      }
      finalTop = null;
      finalBottom = null;
      finalAge = null;
    } else if (state === "box_formed") {
      age++;
      finalTop = top;
      finalBottom = bottom;
      finalAge = age;

      if (bar.close > (top as number)) {
        finalBreakout = "up";
        state = "finding_high";
        candidateTop = bar.high;
        topIndex = i;
        top = null;
        bottom = null;
      } else if (bar.close < (bottom as number)) {
        finalBreakout = "down";
        state = "finding_high";
        candidateTop = bar.high;
        topIndex = i;
        top = null;
        bottom = null;
      }
    }
  }

  if (state === "box_formed") {
    return {
      upperBound: top,
      lowerBound: bottom,
      breakout: "none",
      boxAge: age,
    };
  }

  return {
    upperBound: finalTop,
    lowerBound: finalBottom,
    breakout: finalBreakout,
    boxAge: finalAge,
  };
}

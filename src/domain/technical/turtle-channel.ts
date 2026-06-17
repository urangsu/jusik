import { PriceBar } from "../prices/price-bar";

export type TurtleChannelSignal = {
  entryBreakout: "long" | "short" | "none";
  exitBreakout: "long_exit" | "short_exit" | "none";
  channelHigh: number | null;
  channelLow: number | null;
};

/**
 * Calculates Turtle Channel breakout signals at a specific index.
 * 
 * NOTE: The channel boundaries for the current bar are computed using the preceding window
 * (i.e. up to index - 1) to avoid lookahead/overlap bias.
 */
export function calculateTurtleChannel(
  bars: PriceBar[],
  index: number,
  entryWindow: number = 20,
  exitWindow: number = 10
): TurtleChannelSignal {
  const result: TurtleChannelSignal = {
    entryBreakout: "none",
    exitBreakout: "none",
    channelHigh: null,
    channelLow: null,
  };

  // We need enough historical data before index to calculate the entry window
  if (index < entryWindow || bars.length <= index) {
    return result;
  }

  // 1. Calculate Entry Channel High/Low (from index - entryWindow to index - 1)
  let entryHigh = -Infinity;
  let entryLow = Infinity;
  for (let i = index - entryWindow; i < index; i++) {
    if (bars[i].high > entryHigh) entryHigh = bars[i].high;
    if (bars[i].low < entryLow) entryLow = bars[i].low;
  }
  result.channelHigh = entryHigh;
  result.channelLow = entryLow;

  // 2. Calculate Exit Channel High/Low (from index - exitWindow to index - 1)
  let exitHigh = -Infinity;
  let exitLow = Infinity;
  for (let i = index - exitWindow; i < index; i++) {
    if (bars[i].high > exitHigh) exitHigh = bars[i].high;
    if (bars[i].low < exitLow) exitLow = bars[i].low;
  }

  // 3. Evaluate Breakouts on the current close price
  const currentClose = bars[index].close;
  if (currentClose > entryHigh) {
    result.entryBreakout = "long";
  } else if (currentClose < entryLow) {
    result.entryBreakout = "short";
  }

  if (currentClose < exitLow) {
    result.exitBreakout = "long_exit";
  } else if (currentClose > exitHigh) {
    result.exitBreakout = "short_exit";
  }

  return result;
}

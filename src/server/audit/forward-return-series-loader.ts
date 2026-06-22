import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";
import { assertNoLookAheadBias } from "@/domain/backtest/forward-return";

export type ForwardReturnPoint = {
  date: string;
  assetId: string;
  horizon: "1w" | "1m" | "3m";
  forwardReturn: number | null;
  sourceTier: "official" | "free_limited" | "licensed_free" | "personal_fallback" | "manual_import";
  warnings: string[];
};

const HORIZON_BARS: Record<"1w" | "1m" | "3m", number> = {
  "1w": 5,   // 5 trading days
  "1m": 21,  // 21 trading days
  "3m": 63,  // 63 trading days
};

export async function loadForwardReturnSeries(input: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  horizon: "1w" | "1m" | "3m";
  dates: string[];
  assetIds: string[];
}): Promise<ForwardReturnPoint[]> {
  const { universeId, horizon, dates, assetIds } = input;
  const points: ForwardReturnPoint[] = [];
  const dateSet = new Set(dates);
  const horizonBars = HORIZON_BARS[horizon];

  for (const assetId of assetIds) {
    const ohlcvEnv = await loadOhlcvHistory(universeId, assetId);
    if (!ohlcvEnv.value || ohlcvEnv.value.length === 0) {
      continue;
    }

    const bars = ohlcvEnv.value;
    const sourceTier = ohlcvEnv.sourceTier || "personal_fallback";
    const baseWarnings: string[] = [];
    if (sourceTier === "personal_fallback") {
      baseWarnings.push("personal_fallback_used");
    }

    // Build a map of date to index for quick lookups
    const dateToIndex = new Map<string, number>();
    for (let i = 0; i < bars.length; i++) {
      dateToIndex.set(bars[i].date, i);
    }

    for (const date of dates) {
      const idx = dateToIndex.get(date);
      if (idx === undefined) {
        // Date not found in history for this asset
        continue;
      }

      // Entry is index + 1 (next trading day)
      const entryIdx = idx + 1;
      const exitIdx = entryIdx + horizonBars;

      if (entryIdx >= bars.length || exitIdx >= bars.length) {
        // Not enough future bars to compute return
        points.push({
          date,
          assetId,
          horizon,
          forwardReturn: null,
          sourceTier,
          warnings: [...baseWarnings, "price_data_missing"],
        });
        continue;
      }

      const signalBar = bars[idx];
      const entryBar = bars[entryIdx];
      const exitBar = bars[exitIdx];

      // Prevent look-ahead bias
      assertNoLookAheadBias({ signalDate: signalBar.date, entryDate: entryBar.date });

      const entryPrice = entryBar.close;
      const exitPrice = exitBar.close;

      let forwardReturn: number | null = null;
      if (entryPrice > 0) {
        forwardReturn = (exitPrice - entryPrice) / entryPrice;
      }

      points.push({
        date,
        assetId,
        horizon,
        forwardReturn,
        sourceTier,
        warnings: [...baseWarnings],
      });
    }
  }

  return points;
}

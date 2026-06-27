import { saveSurgeCandidate } from "./surge-candidate-store";
import type { SurgeCandidate, SurgeCandidateReason } from "@/domain/surge/surge-candidate";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";
import fs from "fs/promises";
import path from "path";
import { resolveRuntimeDataPath } from "../storage/runtime-store-root";

const UNIVERSE_ASSETS: Record<"KR" | "US", string[]> = {
  KR: [
    "KR_005930", "KR_000660", "KR_035420", "KR_035720", "KR_005380",
    "KR_000270", "KR_051910", "KR_207940", "KR_006400", "KR_373220",
  ],
  US: [
    "US_AAPL", "US_MSFT", "US_NVDA", "US_AMZN", "US_META",
    "US_GOOGL", "US_TSLA", "US_LLY", "US_AVGO", "US_COST",
  ],
};

export async function detectSurgeCandidates(input: {
  market: "KR" | "US";
  universeId?: string;
}): Promise<SurgeCandidate[]> {
  const { market } = input;
  const universeId = input.universeId || (market === "KR" ? "KOSPI_SAMPLE" : "SP500_SAMPLE");

  const assetIds = UNIVERSE_ASSETS[market];
  const candidates: SurgeCandidate[] = [];

  const nowStr = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // expires in 48 hours

  for (const assetId of assetIds) {
    try {
      const ohlcvEnv = await loadOhlcvHistory(universeId, assetId);
      if (!ohlcvEnv.value || ohlcvEnv.value.length < 7) {
        continue;
      }

      const bars = ohlcvEnv.value;
      const latestBar = bars[bars.length - 1];
      const prevBar = bars[bars.length - 2];

      const close = latestBar.close;
      const prevClose = prevBar.close;

      if (prevClose <= 0) continue;

      const priceChangePct = (close - prevClose) / prevClose;

      // Avg volume of previous 5 bars (excluding the latest bar)
      const prev5Bars = bars.slice(bars.length - 6, bars.length - 1);
      const sumVol = prev5Bars.reduce((acc, b) => acc + b.volume, 0);
      const avgVol = sumVol / prev5Bars.length;
      const volumeRatio = avgVol > 0 ? latestBar.volume / avgVol : 1;

      // Volatility ratio
      const latestRange = latestBar.high - latestBar.low;
      const volatilityRatio = latestBar.open > 0 ? latestRange / latestBar.open : 0;

      const reasons: SurgeCandidateReason[] = [];
      if (Math.abs(priceChangePct) >= 0.05) {
        reasons.push("price_change");
      }
      if (volumeRatio >= 3) {
        reasons.push("volume_spike");
      }
      if (volatilityRatio >= 0.04) {
        reasons.push("volatility_expansion");
      }

      // If any reason triggers, register as candidate
      if (reasons.length > 0) {
        const priceScore = Math.min(Math.abs(priceChangePct) * 10, 1.0);
        const volumeScore = Math.min(volumeRatio / 5.0, 1.0);
        const volatilityScore = Math.min(volatilityRatio * 20, 1.0);
        const relativeStrengthScore = 0.5;
        const score = (priceScore + volumeScore + volatilityScore + relativeStrengthScore) / 4.0;

        const symbol = assetId.split("_")[1] || assetId;
        const candidate: SurgeCandidate = {
          id: `cnd_${assetId}_${Date.now()}`,
          assetId,
          symbol,
          market,
          reasons,
          metrics: {
            priceChangePct,
            volumeRatio,
            volatilityRatio,
            relativeStrength: 0.5,
          },
          score,
          scoreBreakdown: {
            priceScore,
            volumeScore,
            volatilityScore,
            relativeStrengthScore,
          },
          sourceRefs: [`ohlcv_history_${universeId}_${assetId}`],
          evidencePackId: null,
          status: "new",
          detectedAt: nowStr,
          expiresAt,
          updatedAt: nowStr,
        };

        await saveSurgeCandidate(candidate);
        candidates.push(candidate);
      }
    } catch {
      // ignore individual loading failures
    }
  }

  return candidates;
}

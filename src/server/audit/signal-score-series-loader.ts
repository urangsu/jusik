import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";
import { calculateTechnicalSignals } from "@/server/factors/technical-signal-engine";
import { calculateAtomicSignals } from "@/server/factors/atomic-signal-calculator";
import {
  KOSPI_SAMPLE_CONSTITUENTS,
  SP500_SAMPLE_CONSTITUENTS,
} from "@/domain/universe/market-universe";

export type SignalScorePoint = {
  date: string;
  assetId: string;
  signalId: string;
  score: number | null;
  sourceTier: "official" | "free_limited" | "licensed_free" | "personal_fallback" | "manual_import";
  warnings: string[];
};

export async function loadSignalScoreSeries(input: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  signalId: string;
  startDate?: string;
  endDate?: string;
}): Promise<SignalScorePoint[]> {
  const { universeId, signalId, startDate, endDate } = input;

  const constituents =
    universeId === "KOSPI_SAMPLE"
      ? KOSPI_SAMPLE_CONSTITUENTS
      : SP500_SAMPLE_CONSTITUENTS;

  const points: SignalScorePoint[] = [];

  for (const constituent of constituents) {
    const { assetId } = constituent;
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

    for (let i = 0; i < bars.length; i++) {
      const currentBar = bars[i];
      const date = currentBar.date;

      // Filter by date range if provided
      if (startDate && date < startDate) continue;
      if (endDate && date > endDate) continue;

      const techResult = calculateTechnicalSignals(bars, i);
      const atomicSigs = calculateAtomicSignals(
        techResult,
        ohlcvEnv.status,
        currentBar.close,
        currentBar.open
      );

      const targetSig = atomicSigs.find((s) => s.factorId === signalId);
      if (targetSig) {
        points.push({
          date,
          assetId,
          signalId,
          score: targetSig.score,
          sourceTier,
          warnings: [...baseWarnings],
        });
      }
    }
  }

  return points;
}

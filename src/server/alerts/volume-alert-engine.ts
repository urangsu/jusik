import { MarketRegion } from "@/domain/common/data-status";
import { VolumeZScoreCondition } from "@/domain/alerts/alert-condition";
import { marketDataService } from "../services/market-data-service";

type OhlcvCandle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type OhlcvData = {
  candles: OhlcvCandle[];
};

export type VolumeAlertEvaluation = {
  triggered: boolean;
  zScore?: number;
  volume?: number;
  meanVolume?: number;
  stdVolume?: number;
  vetoReason?: string;
  source?: string;
  sourceTier?: string;
  dataStatus?: string;
  warnings?: string[];
  updatedAt?: string | null;
};

export class VolumeAlertEngine {
  async evaluate(params: {
    symbol: string;
    region: MarketRegion;
    condition: VolumeZScoreCondition;
    allowPersonalFallback: boolean;
  }): Promise<VolumeAlertEvaluation> {
    const { symbol, region, condition, allowPersonalFallback } = params;

    // Fetch daily OHLCV candles
    const ohlcvEnvelope = await marketDataService.getOhlcv({
      symbol,
      region,
      range: "1Y",
      interval: "1D",
    });

    const dataStatus = ohlcvEnvelope.status;
    if (dataStatus === "error" || dataStatus === "not_found" || dataStatus === "api_required") {
      return { triggered: false, vetoReason: `bad_data_status_${dataStatus}`, dataStatus };
    }

    const sourceTier = ohlcvEnvelope.sourceTier;
    const source = ohlcvEnvelope.source;
    const warnings = ohlcvEnvelope.warnings || [];
    const updatedAt = ohlcvEnvelope.updatedAt;

    if (sourceTier === "personal_fallback" && !allowPersonalFallback) {
      return { triggered: false, vetoReason: "personal_fallback_not_allowed", sourceTier, source };
    }

    const ohlcvData = ohlcvEnvelope.value as OhlcvData | null;
    if (!ohlcvData || !ohlcvData.candles || ohlcvData.candles.length === 0) {
      return { triggered: false, vetoReason: "insufficient_history" };
    }

    const candles = [...ohlcvData.candles].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    if (candles.length < condition.baselineWindow) {
      return { triggered: false, vetoReason: "insufficient_history" };
    }

    const baselineCandles = candles.slice(-condition.baselineWindow);
    const volumes = baselineCandles.map((c) => c.volume);
    const latestVolume = volumes[volumes.length - 1];

    if (latestVolume <= 0 || volumes.every((v) => v === 0)) {
      return { triggered: false, vetoReason: "zero_volume" };
    }

    const sum = volumes.reduce((acc, v) => acc + v, 0);
    const mean = sum / volumes.length;

    const varianceSum = volumes.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    const std = Math.sqrt(varianceSum / (volumes.length - 1));

    if (std === 0 || isNaN(std)) {
      return { triggered: false, vetoReason: "insufficient_volume_baseline" };
    }

    const zScore = (latestVolume - mean) / std;
    const multiplier = condition.minVolumeMultiplier || 1.0;
    const triggered = zScore >= condition.thresholdZ && latestVolume >= mean * multiplier;

    return {
      triggered,
      zScore,
      volume: latestVolume,
      meanVolume: mean,
      stdVolume: std,
      source,
      sourceTier,
      dataStatus,
      warnings,
      updatedAt,
    };
  }
}

export const volumeAlertEngine = new VolumeAlertEngine();

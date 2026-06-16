import { MarketRegion } from "@/domain/common/data-status";
import { ReturnZScoreCondition } from "@/domain/alerts/alert-condition";
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

export type VolatilityAlertEvaluation = {
  triggered: boolean;
  zScore?: number;
  returnPercent?: number;
  meanPercent?: number;
  stdPercent?: number;
  vetoReason?: string;
  source?: string;
  sourceTier?: string;
  dataStatus?: string;
  warnings?: string[];
  updatedAt?: string | null;
};

export class VolatilityAlertEngine {
  async evaluate(params: {
    symbol: string;
    region: MarketRegion;
    condition: ReturnZScoreCondition;
    allowPersonalFallback: boolean;
  }): Promise<VolatilityAlertEvaluation> {
    const { symbol, region, condition, allowPersonalFallback } = params;

    // Fetch daily OHLCV candles
    // Choose 1Y range to cover up to 120 baseline window comfortably
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

    // Sort candles by timestamp ascending
    const candles = [...ohlcvData.candles].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    if (candles.length < condition.baselineWindow + 1) {
      return { triggered: false, vetoReason: "insufficient_history" };
    }

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1].close;
      const curr = candles[i].close;
      if (prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }

    // We need at least baselineWindow daily returns
    if (returns.length < condition.baselineWindow) {
      return { triggered: false, vetoReason: "insufficient_history" };
    }

    // Take the last baselineWindow daily returns for baseline calculation
    // Wait, the zscore check is done on the latest return: returns[returns.length - 1]
    // The baseline should be calculated on the returns prior to the latest return, or including?
    // "mean = rolling_mean(dailyReturn, baselineWindow); std = rolling_std(dailyReturn, baselineWindow)"
    // Standard approach: calculate mean and std on the baselineWindow returns ending at the latest return
    const baselineReturns = returns.slice(-condition.baselineWindow);
    const latestReturn = returns[returns.length - 1];

    const sum = baselineReturns.reduce((acc, v) => acc + v, 0);
    const mean = sum / baselineReturns.length;

    // Sample variance
    const varianceSum = baselineReturns.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    const std = Math.sqrt(varianceSum / (baselineReturns.length - 1));

    if (std === 0 || isNaN(std)) {
      return { triggered: false, vetoReason: "insufficient_volatility_baseline" };
    }

    const zScore = (latestReturn - mean) / std;
    const absZ = Math.abs(zScore);
    const returnPercent = latestReturn * 100;
    const absReturnPercent = Math.abs(returnPercent);

    const minReturn = condition.minAbsReturnPercent || 0;
    const triggered = absZ >= condition.thresholdAbsZ && absReturnPercent >= minReturn;

    return {
      triggered,
      zScore,
      returnPercent,
      meanPercent: mean * 100,
      stdPercent: std * 100,
      source,
      sourceTier,
      dataStatus,
      warnings,
      updatedAt,
    };
  }
}

export const volatilityAlertEngine = new VolatilityAlertEngine();

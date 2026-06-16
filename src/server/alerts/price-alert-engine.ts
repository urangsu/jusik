import { MarketRegion } from "@/domain/common/data-status";
import { PriceCrossCondition, GapMoveCondition } from "@/domain/alerts/alert-condition";
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

export type PriceAlertEvaluation = {
  triggered: boolean;
  price?: number;
  gapPercent?: number;
  vetoReason?: string;
  source?: string;
  sourceTier?: string;
  dataStatus?: string;
  warnings?: string[];
  updatedAt?: string | null;
};

export class PriceAlertEngine {
  async evaluatePriceCross(params: {
    symbol: string;
    region: MarketRegion;
    condition: PriceCrossCondition;
    allowPersonalFallback: boolean;
  }): Promise<PriceAlertEvaluation> {
    const { symbol, region, condition, allowPersonalFallback } = params;

    // Get current quote
    const quoteEnvelope = await marketDataService.getQuote(symbol, region);
    const dataStatus = quoteEnvelope.status;
    if (dataStatus === "error" || dataStatus === "not_found" || dataStatus === "api_required") {
      return { triggered: false, vetoReason: `bad_data_status_${dataStatus}`, dataStatus };
    }

    const sourceTier = quoteEnvelope.sourceTier;
    const source = quoteEnvelope.source;
    const warnings = quoteEnvelope.warnings || [];
    const updatedAt = quoteEnvelope.updatedAt;

    if (sourceTier === "personal_fallback" && !allowPersonalFallback) {
      return { triggered: false, vetoReason: "personal_fallback_not_allowed", sourceTier, source };
    }

    const quote = quoteEnvelope.value;
    if (!quote || quote.price === undefined || quote.price === null) {
      return { triggered: false, vetoReason: "missing_price" };
    }

    const currentPrice = quote.price;
    const targetPrice = condition.price;

    let triggered = false;
    if (condition.direction === "above") {
      triggered = currentPrice >= targetPrice;
    } else if (condition.direction === "below") {
      triggered = currentPrice <= targetPrice;
    }

    return {
      triggered,
      price: currentPrice,
      source,
      sourceTier,
      dataStatus,
      warnings,
      updatedAt,
    };
  }

  async evaluateGapMove(params: {
    symbol: string;
    region: MarketRegion;
    condition: GapMoveCondition;
    allowPersonalFallback: boolean;
  }): Promise<PriceAlertEvaluation> {
    const { symbol, region, condition, allowPersonalFallback } = params;

    // Fetch daily OHLCV candles
    const ohlcvEnvelope = await marketDataService.getOhlcv({
      symbol,
      region,
      range: "1M",
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
    if (!ohlcvData || !ohlcvData.candles || ohlcvData.candles.length < 2) {
      return { triggered: false, vetoReason: "insufficient_history" };
    }

    const candles = [...ohlcvData.candles].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const latestCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];

    const open = latestCandle.open;
    const prevClose = prevCandle.close;

    if (prevClose <= 0) {
      return { triggered: false, vetoReason: "invalid_prev_close" };
    }

    const gap = (open - prevClose) / prevClose;
    const gapPercent = gap * 100;
    const absGapPercent = Math.abs(gapPercent);

    let triggered = false;
    if (condition.direction === "up") {
      triggered = gapPercent >= condition.thresholdPercent;
    } else if (condition.direction === "down") {
      triggered = gapPercent <= -condition.thresholdPercent;
    } else {
      triggered = absGapPercent >= condition.thresholdPercent;
    }

    return {
      triggered,
      gapPercent,
      price: latestCandle.close,
      source,
      sourceTier,
      dataStatus,
      warnings,
      updatedAt,
    };
  }
}

export const priceAlertEngine = new PriceAlertEngine();

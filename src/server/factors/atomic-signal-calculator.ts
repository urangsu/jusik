import { AtomicSignal } from "@/domain/factors/atomic-signal";
import { TechnicalSignalsResult } from "./technical-signal-engine";
import { DataStatus } from "@/domain/common/data-status";
import { SignalHorizon } from "@/domain/factors/factor-horizon";

function getLabel(score: number | null): "bullish" | "bearish" | "neutral" | "insufficient_data" {
  if (score === null) return "insufficient_data";
  if (score >= 30) return "bullish";
  if (score <= -30) return "bearish";
  return "neutral";
}

export function calculateAtomicSignals(
  tech: TechnicalSignalsResult,
  dataStatus: DataStatus,
  closePrice: number,
  openPrice: number
): AtomicSignal[] {
  const calculatedAt = new Date().toISOString();
  const date = tech.date;
  const assetId = tech.assetId;
  const signals: AtomicSignal[] = [];

  // Helper to push a signal
  const addSignal = (
    factorId: string,
    horizon: SignalHorizon,
    score: number | null,
    metadata?: Record<string, any>
  ) => {
    signals.push({
      assetId,
      factorId,
      date,
      horizon,
      score,
      signalLabel: getLabel(score),
      dataStatus,
      calculatedAt,
      metadata,
    });
  };

  // 1. Ichimoku Cloud
  let ichiScore: number | null = null;
  if (tech.ichimoku.cloudPosition !== "insufficient_data") {
    let posScore = 0;
    if (tech.ichimoku.cloudPosition === "above") posScore = 50;
    else if (tech.ichimoku.cloudPosition === "below") posScore = -50;

    let crossScore = 0;
    if (tech.ichimoku.tkCross === "bullish_cross") crossScore = 50;
    else if (tech.ichimoku.tkCross === "bearish_cross") crossScore = -50;

    ichiScore = Math.max(-100, Math.min(100, posScore + crossScore));
  }
  addSignal("momentum_ichimoku", "medium", ichiScore, {
    cloudPosition: tech.ichimoku.cloudPosition,
    tkCross: tech.ichimoku.tkCross,
  });

  // 2. Darvas Box
  let darvasScore: number | null = null;
  if (tech.darvasBox.breakout === "up") {
    darvasScore = 100;
  } else if (tech.darvasBox.breakout === "down") {
    darvasScore = -100;
  } else if (tech.darvasBox.upperBound !== null && tech.darvasBox.lowerBound !== null) {
    const denom = tech.darvasBox.upperBound - tech.darvasBox.lowerBound;
    if (denom > 0) {
      const ratio = (closePrice - tech.darvasBox.lowerBound) / denom;
      darvasScore = Math.max(-100, Math.min(100, Math.round((ratio - 0.5) * 100)));
    } else {
      darvasScore = 0;
    }
  }
  addSignal("momentum_darvas", "medium", darvasScore, {
    breakout: tech.darvasBox.breakout,
    boxAge: tech.darvasBox.boxAge,
  });

  // 3. Turtle Channel
  let turtleScore: number | null = null;
  if (tech.turtleChannel.entryBreakout === "long") {
    turtleScore = 100;
  } else if (tech.turtleChannel.entryBreakout === "short") {
    turtleScore = -100;
  } else if (tech.turtleChannel.channelHigh !== null && tech.turtleChannel.channelLow !== null) {
    const denom = tech.turtleChannel.channelHigh - tech.turtleChannel.channelLow;
    if (denom > 0) {
      const ratio = (closePrice - tech.turtleChannel.channelLow) / denom;
      turtleScore = Math.max(-100, Math.min(100, Math.round((ratio - 0.5) * 100)));
    } else {
      turtleScore = 0;
    }

    if (tech.turtleChannel.exitBreakout === "long_exit") {
      turtleScore = Math.min(turtleScore, -30);
    } else if (tech.turtleChannel.exitBreakout === "short_exit") {
      turtleScore = Math.max(turtleScore, 30);
    }
  }
  addSignal("momentum_turtle", "short", turtleScore, {
    entryBreakout: tech.turtleChannel.entryBreakout,
    exitBreakout: tech.turtleChannel.exitBreakout,
  });

  // 4. Weinstein Stage
  let weinsteinScore: number | null = null;
  if (tech.weinsteinStage !== "insufficient_data") {
    if (tech.weinsteinStage === "stage_2_uptrend") weinsteinScore = 80;
    else if (tech.weinsteinStage === "stage_1_base") weinsteinScore = 20;
    else if (tech.weinsteinStage === "stage_3_top") weinsteinScore = -20;
    else if (tech.weinsteinStage === "stage_4_downtrend") weinsteinScore = -80;
  }
  addSignal("momentum_weinstein", "long", weinsteinScore, {
    stage: tech.weinsteinStage,
  });

  // 5. MA Slope
  let maSlopeScore: number | null = null;
  if (tech.maSlope.slope5d !== null) {
    maSlopeScore = Math.max(-100, Math.min(100, Math.round(tech.maSlope.slope5d * 1000)));
  }
  addSignal("momentum_ma_slope", "medium", maSlopeScore, {
    slope5d: tech.maSlope.slope5d,
  });

  // 6. Return Momentum
  let returnScore: number | null = null;
  const returns = tech.returnMomentum;
  const validReturns: number[] = [];
  if (returns.return20d !== null) validReturns.push(returns.return20d * 200);
  if (returns.return60d !== null) validReturns.push(returns.return60d * 100);
  if (returns.return120d !== null) validReturns.push(returns.return120d * 50);

  if (validReturns.length > 0) {
    const avg = validReturns.reduce((a, b) => a + b, 0) / validReturns.length;
    returnScore = Math.max(-100, Math.min(100, Math.round(avg)));
  }
  addSignal("momentum_return", "short", returnScore, {
    return20d: returns.return20d,
    return60d: returns.return60d,
    return120d: returns.return120d,
  });

  // 7. Volatility Z-Score
  let volScore: number | null = null;
  if (tech.volatilityZScore !== null) {
    volScore = Math.max(-100, Math.min(100, Math.round(-tech.volatilityZScore * 50)));
  }
  addSignal("momentum_volatility", "long", volScore, {
    zScore: tech.volatilityZScore,
  });

  // 8. Volume Z-Score
  let volZScore: number | null = null;
  if (tech.volumeZScore !== null) {
    const trend = (returns.return20d ?? (closePrice - openPrice)) >= 0 ? 1 : -1;
    volZScore = Math.max(-100, Math.min(100, Math.round(tech.volumeZScore * trend * 30)));
  }
  addSignal("momentum_volume", "short", volZScore, {
    zScore: tech.volumeZScore,
  });

  return signals;
}

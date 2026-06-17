import { PriceBar } from "@/domain/prices/price-bar";
import {
  calculateIchimoku,
  getCloudPosition,
  detectTKCross,
  IchimokuComponents,
} from "@/domain/technical/ichimoku";
import { calculateDarvasBox, DarvasBoxSignal } from "@/domain/technical/darvas-box";
import { calculateTurtleChannel, TurtleChannelSignal } from "@/domain/technical/turtle-channel";
import { calculateWeinsteinStage, WeinsteinStage } from "@/domain/technical/weinstein-stage";

export type TechnicalSignalsResult = {
  assetId: string;
  date: string;
  ichimoku: IchimokuComponents & {
    cloudPosition: "above" | "below" | "inside" | "insufficient_data";
    tkCross: "bullish_cross" | "bearish_cross" | "none";
  };
  darvasBox: DarvasBoxSignal;
  turtleChannel: TurtleChannelSignal;
  weinsteinStage: WeinsteinStage;
  maSlope: {
    ma20: number | null;
    slope5d: number | null;
  };
  returnMomentum: {
    return20d: number | null;
    return60d: number | null;
    return120d: number | null;
  };
  volatilityZScore: number | null;
  volumeZScore: number | null;
};

function calculateSMA(bars: PriceBar[], index: number, window: number): number | null {
  if (index < window - 1 || index >= bars.length || window <= 0) return null;
  let sum = 0;
  for (let i = index - window + 1; i <= index; i++) {
    sum += bars[i].close;
  }
  return sum / window;
}

function calculateVol20(bars: PriceBar[], index: number): number | null {
  const window = 20;
  if (index < window || index >= bars.length) return null; // We need index - window to be valid index - 1
  
  const returns: number[] = [];
  for (let i = index - window + 1; i <= index; i++) {
    const prevClose = bars[i - 1].close;
    if (prevClose === 0) continue;
    returns.push((bars[i].close - prevClose) / prevClose);
  }

  if (returns.length < window) return null;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

export function calculateTechnicalSignals(
  bars: PriceBar[],
  index: number
): TechnicalSignalsResult {
  const result: TechnicalSignalsResult = {
    assetId: "",
    date: "",
    ichimoku: {
      tenkanSen: null,
      kijunSen: null,
      senkouSpanA: null,
      senkouSpanB: null,
      chikouSpan: null,
      cloudPosition: "insufficient_data",
      tkCross: "none",
    },
    darvasBox: { upperBound: null, lowerBound: null, breakout: "none", boxAge: null },
    turtleChannel: { entryBreakout: "none", exitBreakout: "none", channelHigh: null, channelLow: null },
    weinsteinStage: "insufficient_data",
    maSlope: { ma20: null, slope5d: null },
    returnMomentum: { return20d: null, return60d: null, return120d: null },
    volatilityZScore: null,
    volumeZScore: null,
  };

  if (bars.length === 0 || index < 0 || index >= bars.length) {
    return result;
  }

  const currentBar = bars[index];
  result.assetId = currentBar.assetId;
  result.date = currentBar.date;

  // 1. Ichimoku Cloud
  const ichi = calculateIchimoku(bars, index);
  const prevIchi = index > 0 ? calculateIchimoku(bars, index - 1) : null;
  result.ichimoku = {
    ...ichi,
    cloudPosition: getCloudPosition(currentBar.close, ichi.senkouSpanA, ichi.senkouSpanB),
    tkCross: prevIchi
      ? detectTKCross(ichi.tenkanSen, ichi.kijunSen, prevIchi.tenkanSen, prevIchi.kijunSen)
      : "none",
  };

  // 2. Darvas Box
  result.darvasBox = calculateDarvasBox(bars, index);

  // 3. Turtle Channel
  result.turtleChannel = calculateTurtleChannel(bars, index);

  // 4. Weinstein Stage
  result.weinsteinStage = calculateWeinsteinStage(bars, index);

  // 5. MA Slope
  const ma20 = calculateSMA(bars, index, 20);
  const ma20Past = index >= 5 ? calculateSMA(bars, index - 5, 20) : null;
  result.maSlope = {
    ma20,
    slope5d: (ma20 !== null && ma20Past !== null && ma20Past !== 0)
      ? (ma20 - ma20Past) / ma20Past
      : null,
  };

  // 6. Return Momentum
  result.returnMomentum = {
    return20d: index >= 20 ? (currentBar.close - bars[index - 20].close) / bars[index - 20].close : null,
    return60d: index >= 60 ? (currentBar.close - bars[index - 60].close) / bars[index - 60].close : null,
    return120d: index >= 120 ? (currentBar.close - bars[index - 120].close) / bars[index - 120].close : null,
  };

  // 7. Volatility Z-Score
  const volHistory: number[] = [];
  const lookback = 60;
  for (let i = index - lookback + 1; i <= index; i++) {
    if (i >= 0) {
      const v = calculateVol20(bars, i);
      if (v !== null) {
        volHistory.push(v);
      }
    }
  }
  if (volHistory.length >= 30) { // We need a minimum statistical sample size (e.g. 30 days of volatility)
    const currentVol = volHistory[volHistory.length - 1];
    const mean = volHistory.reduce((a, b) => a + b, 0) / volHistory.length;
    const variance = volHistory.reduce((sum, v) => sum + (v - mean) ** 2, 0) / volHistory.length;
    const std = Math.sqrt(variance);
    result.volatilityZScore = std !== 0 ? (currentVol - mean) / std : 0;
  }

  // 8. Volume Z-Score
  const volWindow = 20;
  if (index >= volWindow - 1) {
    const volumes: number[] = [];
    for (let i = index - volWindow + 1; i <= index; i++) {
      volumes.push(bars[i].volume);
    }
    const currentVol = currentBar.volume;
    const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const variance = volumes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / volumes.length;
    const std = Math.sqrt(variance);
    result.volumeZScore = std !== 0 ? (currentVol - mean) / std : 0;
  }

  return result;
}

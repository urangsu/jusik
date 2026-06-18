import fs from "fs";
import { RegimeSnapshot } from "@/domain/regime/regime-snapshot";
import { MarketRegime } from "@/domain/regime/market-regime";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";
import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { PriceBar } from "@/domain/prices/price-bar";
import { regimeStore } from "./regime-store";
import { JsonFileStore } from "../storage/json-file-store";

export type MacroIndicators = {
  vix: number;
  vixZScore: number;
  highYieldSpread: number;
  yieldCurve10Y2Y: number;
  usdKrw: number;
  usdKrw20DChange: number;
  krRateProxy: number;
  cnnFearGreed: number;
  cryptoFearGreed: number;
};

export const DEFAULT_MACRO_INDICATORS: MacroIndicators = {
  vix: 16.5,
  vixZScore: 0.5,
  highYieldSpread: 3.8,
  yieldCurve10Y2Y: 0.15,
  usdKrw: 1345.0,
  usdKrw20DChange: 0.8,
  krRateProxy: 3.5,
  cnnFearGreed: 45.0,
  cryptoFearGreed: 55.0,
};

export class RegimeEngine {
  private indicatorsStore: JsonFileStore<MacroIndicators>;

  constructor() {
    this.indicatorsStore = new JsonFileStore<MacroIndicators>(
      "data/regime/macro-indicators.json",
      DEFAULT_MACRO_INDICATORS
    );
  }

  async getIndicators(): Promise<MacroIndicators> {
    return this.indicatorsStore.read();
  }

  async updateIndicators(updates: Partial<MacroIndicators>): Promise<MacroIndicators> {
    const current = await this.getIndicators();
    const updated = { ...current, ...updates };
    await this.indicatorsStore.write(updated);
    return updated;
  }

  async calculateSyntheticIndex(universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE"): Promise<PriceBar[]> {
    const constituents = universeId === "KOSPI_SAMPLE" ? KOSPI_SAMPLE_CONSTITUENTS : SP500_SAMPLE_CONSTITUENTS;
    const allHistories: PriceBar[][] = [];

    for (const c of constituents) {
      const res = await loadOhlcvHistory(universeId, c.assetId);
      if (res.value && res.value.length > 0) {
        allHistories.push(res.value);
      }
    }

    if (allHistories.length === 0) return [];

    const dateMap = new Map<string, number[]>();
    for (const history of allHistories) {
      const firstClose = history[0]?.close;
      if (!firstClose) continue;

      for (const bar of history) {
        const normalizedClose = (bar.close / firstClose) * 100;
        if (!dateMap.has(bar.date)) {
          dateMap.set(bar.date, []);
        }
        dateMap.get(bar.date)!.push(normalizedClose);
      }
    }

    const dates = Array.from(dateMap.keys()).sort();
    const syntheticBars: PriceBar[] = [];

    for (const date of dates) {
      const prices = dateMap.get(date)!;
      const avgClose = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      syntheticBars.push({
        assetId: universeId === "KOSPI_SAMPLE" ? "KR:KOSPI" : "US:SPX",
        date,
        open: avgClose,
        high: avgClose,
        low: avgClose,
        close: avgClose,
        volume: 0,
      });
    }

    return syntheticBars;
  }

  calculateTrendMetrics(bars: PriceBar[]) {
    if (bars.length === 0) {
      return { latestClose: null, ma125: null, return20D: null, positionAboveMA: false };
    }

    const latestIndex = bars.length - 1;
    const latestClose = bars[latestIndex].close;

    let return20D = null;
    if (bars.length >= 21) {
      const prevClose = bars[latestIndex - 20].close;
      return20D = ((latestClose - prevClose) / prevClose) * 100;
    }

    let ma125 = null;
    if (bars.length >= 125) {
      const windowBars = bars.slice(bars.length - 125);
      const sum = windowBars.reduce((s, b) => s + b.close, 0);
      ma125 = sum / 125;
    }

    const positionAboveMA = ma125 !== null ? latestClose >= ma125 : true;

    return { latestClose, ma125, return20D, positionAboveMA };
  }

  async evaluateRegime(market: "US" | "KR"): Promise<RegimeSnapshot> {
    const indicators = await this.getIndicators();
    const universeId = market === "US" ? "SP500_SAMPLE" : "KOSPI_SAMPLE";
    const bars = await this.calculateSyntheticIndex(universeId);
    const trendMetrics = this.calculateTrendMetrics(bars);

    const missingInputs: string[] = [];
    const warnings: string[] = [];

    if (bars.length === 0) {
      missingInputs.push("OHLCV History");
    }

    // 1. Trend Score (0-100)
    let trendScore = 50;
    if (trendMetrics.return20D !== null) {
      trendScore = Math.max(0, Math.min(100, 50 + trendMetrics.return20D * 10));
    } else {
      missingInputs.push("20D Return");
    }

    // 2. Volatility Score (0-100)
    let volatilityScore = 50;
    if (market === "US") {
      volatilityScore = Math.max(0, Math.min(100, 100 - (indicators.vix - 12) * (100 / 18)));
    } else {
      volatilityScore = Math.max(0, Math.min(100, 100 - (indicators.vix - 12) * (100 / 18))); // KR also references VIX
    }

    // 3. Credit Score (0-100)
    const creditScore = Math.max(0, Math.min(100, 100 - (indicators.highYieldSpread - 2.5) * (100 / 3.5)));

    // 4. Rate Score (0-100)
    let rateScore = 50;
    if (market === "US") {
      rateScore = Math.max(0, Math.min(100, (indicators.yieldCurve10Y2Y + 0.5) * (100 / 1.5)));
    } else {
      rateScore = Math.max(0, Math.min(100, (indicators.krRateProxy - 2.0) * (100 / 2.0)));
    }

    // 5. FX Score (0-100, KR only)
    const fxScore = market === "KR"
      ? Math.max(0, Math.min(100, 100 - (indicators.usdKrw20DChange + 3) * (100 / 6)))
      : null;

    // 6. Sentiment Reference Score (0-100)
    const sentimentReferenceScore = market === "US" ? indicators.cnnFearGreed : indicators.cryptoFearGreed;

    // Calculate weighted score
    let score = 50;
    if (market === "US") {
      score = Math.round(
        trendScore * 0.35 +
        volatilityScore * 0.25 +
        creditScore * 0.20 +
        rateScore * 0.10 +
        sentimentReferenceScore * 0.10
      );
    } else {
      score = Math.round(
        trendScore * 0.40 +
        (fxScore ?? 50) * 0.25 +
        rateScore * 0.20 +
        sentimentReferenceScore * 0.15
      );
    }

    // Determine initial regime
    let regime: MarketRegime = "neutral";
    if (score >= 75) regime = "risk_on";
    else if (score >= 60) regime = "selective_risk_on";
    else if (score >= 45) regime = "neutral";
    else if (score >= 30) regime = "risk_off";
    else regime = "panic";

    // 8.3 Overriding rules
    // Rule 1: VIX spike or credit spread spike -> cap at risk_off/panic (minimum risk_off or panic)
    const isVixSpike = indicators.vix >= 25 || indicators.vixZScore >= 2.0;
    const isCreditSpike = indicators.highYieldSpread >= 5.0;
    if (isVixSpike || isCreditSpike) {
      if (regime !== "panic" && regime !== "risk_off") {
        regime = "risk_off";
        warnings.push("VIX 또는 Credit Spread 급등으로 인해 레짐이 risk_off 이상으로 강제 조정되었습니다.");
      }
    }

    // Rule 2: 125D MA under -> forbid risk_on
    if (trendMetrics.positionAboveMA === false) {
      if (regime === "risk_on") {
        regime = "selective_risk_on";
        warnings.push("주가지수가 125일 이동평균선 아래에 있어 risk_on이 금증(selective_risk_on으로 조정)되었습니다.");
      }
    }

    // Gate rules
    let allowsNewWatch = true;
    let allowsRiskUpgrading = true;
    let suppressesMomentumAlert = false;

    if (regime === "panic" || regime === "risk_off") {
      allowsNewWatch = false;
      allowsRiskUpgrading = false;
      suppressesMomentumAlert = true;
    }

    // USD/KRW spike -> KR regime allowsNewWatch = false
    if (market === "KR" && indicators.usdKrw20DChange >= 2.0) {
      allowsNewWatch = false;
      warnings.push("원/달러 환율 급등으로 인해 신규 관찰(allowsNewWatch)이 제한됩니다.");
    }

    const snapshot: RegimeSnapshot = {
      id: `regime-${market}-${new Date().toISOString().slice(0, 10)}`,
      market,
      regime,
      score,
      confidence: missingInputs.length > 0 ? "low" : "high",
      components: {
        trendScore,
        volatilityScore,
        creditScore,
        rateScore,
        fxScore,
        sentimentReferenceScore,
      },
      gates: {
        allowsNewWatch,
        allowsRiskUpgrading,
        suppressesMomentumAlert,
      },
      missingInputs,
      warnings,
      source: "Macro Regime Engine v1",
      sourceTier: "official",
      dataStatus: missingInputs.length > 0 ? "insufficient_data" : "real_time",
      updatedAt: new Date().toISOString(),
      calculatedAt: new Date().toISOString(),
      engineVersion: "1.0.0",
    };

    await regimeStore.saveSnapshot(snapshot);
    return snapshot;
  }

  async evaluateAll(): Promise<RegimeSnapshot[]> {
    const us = await this.evaluateRegime("US");
    const kr = await this.evaluateRegime("KR");
    return [us, kr];
  }
}

export const regimeEngine = new RegimeEngine();

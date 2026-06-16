import { MarketRegion } from "@/domain/common/data-status";
import { AlertEvent } from "@/domain/alerts/alert-event";
import { AlertRule } from "@/domain/alerts/alert-rule";
import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { alertRuleEngine } from "./alert-rule-engine";
import { alertEventStore } from "./alert-event-store";
import { alertDeduper } from "./alert-deduper";
import { volatilityAlertEngine } from "./volatility-alert-engine";
import { volumeAlertEngine } from "./volume-alert-engine";
import { priceAlertEngine } from "./price-alert-engine";
import { providerAlertEngine } from "./provider-alert-engine";
import { notificationHub } from "../notifications/notification-hub";

export class AlertEvaluator {
  async evaluateAll(): Promise<string[]> {
    const rules = await alertRuleEngine.getRules();
    const activeRules = rules.filter(r => r.enabled);
    const triggeredEventIds: string[] = [];

    for (const rule of activeRules) {
      try {
        if (rule.type === "provider_error") {
          // Global provider evaluation
          if (rule.condition.kind !== "provider_error") continue;
          const evals = await providerAlertEngine.evaluate({ condition: rule.condition });
          for (const ev of evals) {
            if (ev.triggered) {
              const fingerprint = `${rule.id}:${ev.providerId}:${ev.status}`;
              const isDuplicate = await alertDeduper.isDuplicate(
                rule.id,
                rule.type,
                ev.providerId,
                ev.status,
                rule.cooldownMinutes
              );
              if (!isDuplicate) {
                const event = this.createProviderEvent(rule, ev);
                await alertEventStore.addEvent(event);
                await notificationHub.dispatchNotification(event);
                await alertDeduper.registerTrigger(rule.id, rule.type, ev.providerId, ev.status);
                triggeredEventIds.push(event.id);
              }
            }
          }
        } else {
          // Asset-specific evaluations
          const targets = this.resolveTargets(rule);
          for (const target of targets) {
            const result = await this.evaluateAssetRule(rule, target);
            if (result && result.triggered) {
              const conditionHash = this.getConditionHash(rule, result);
              const isDuplicate = await alertDeduper.isDuplicate(
                rule.id,
                rule.type,
                target.assetId,
                conditionHash,
                rule.cooldownMinutes
              );
              if (!isDuplicate) {
                const event = this.createAssetEvent(rule, target, result);
                await alertEventStore.addEvent(event);
                await notificationHub.dispatchNotification(event);
                await alertDeduper.registerTrigger(rule.id, rule.type, target.assetId, conditionHash);
                triggeredEventIds.push(event.id);
              }
            }
          }
        }
      } catch (err) {
        console.error(`[AlertEvaluator] Error evaluating rule ${rule.id}:`, err);
      }
    }

    return triggeredEventIds;
  }

  private resolveTargets(rule: AlertRule): Array<{ assetId: string; symbol: string; region: MarketRegion; nameKo: string; nameEn: string }> {
    const constituents = [...KOSPI_SAMPLE_CONSTITUENTS, ...SP500_SAMPLE_CONSTITUENTS];

    if (rule.scope === "universe") {
      const uId = rule.target.universeId || "KOSPI_SAMPLE";
      if (uId === "KOSPI_SAMPLE" || uId === "KOSPI") {
        return KOSPI_SAMPLE_CONSTITUENTS.map(c => ({
          assetId: c.assetId,
          symbol: c.symbol,
          region: "KR" as MarketRegion,
          nameKo: c.nameKo ?? c.symbol,
          nameEn: c.nameEn ?? c.symbol
        }));
      } else if (uId === "SP500_SAMPLE" || uId === "SP500") {
        return SP500_SAMPLE_CONSTITUENTS.map(c => ({
          assetId: c.assetId,
          symbol: c.symbol,
          region: "US" as MarketRegion,
          nameKo: c.nameKo ?? c.symbol,
          nameEn: c.nameEn ?? c.symbol
        }));
      }
    } else if (rule.scope === "asset" && rule.target.assetIds) {
      return rule.target.assetIds.map(assetId => {
        const found = constituents.find(c => c.assetId === assetId);
        const [region, symbol] = assetId.split(":");
        return {
          assetId,
          symbol: symbol || assetId,
          region: (region || "KR") as MarketRegion,
          nameKo: found?.nameKo ?? symbol ?? assetId,
          nameEn: found?.nameEn ?? symbol ?? assetId
        };
      });
    }

    // Fallback for empty target
    return [];
  }

  private async evaluateAssetRule(rule: AlertRule, target: { symbol: string; region: MarketRegion }): Promise<any> {
    const allowPersonalFallback = rule.dataPolicy.allowPersonalFallback;

    switch (rule.type) {
      case "return_zscore":
        if (rule.condition.kind !== "return_zscore") return null;
        return volatilityAlertEngine.evaluate({
          symbol: target.symbol,
          region: target.region,
          condition: rule.condition,
          allowPersonalFallback
        });

      case "volume_zscore":
        if (rule.condition.kind !== "volume_zscore") return null;
        return volumeAlertEngine.evaluate({
          symbol: target.symbol,
          region: target.region,
          condition: rule.condition,
          allowPersonalFallback
        });

      case "price_cross":
        if (rule.condition.kind !== "price_cross") return null;
        return priceAlertEngine.evaluatePriceCross({
          symbol: target.symbol,
          region: target.region,
          condition: rule.condition,
          allowPersonalFallback
        });

      case "gap_move":
        if (rule.condition.kind !== "gap_move") return null;
        return priceAlertEngine.evaluateGapMove({
          symbol: target.symbol,
          region: target.region,
          condition: rule.condition,
          allowPersonalFallback
        });

      default:
        return null;
    }
  }

  private getConditionHash(rule: AlertRule, result: any): string {
    if (rule.type === "price_cross") {
      return `cross-${rule.condition.kind === "price_cross" ? rule.condition.price : "0"}`;
    }
    if (rule.type === "gap_move") {
      return `gap-${result.gapPercent?.toFixed(1)}`;
    }
    return "standard";
  }

  private createProviderEvent(rule: AlertRule, ev: any): AlertEvent {
    const isKo = rule.locale === "ko";
    const title = isKo
      ? `[제공자 오류] ${ev.providerId}`
      : `[Provider Error] ${ev.providerId}`;

    const body = isKo
      ? `데이터 제공자 ${ev.providerId}에서 상태 이상(${ev.status})이 감지되었습니다.\n상세 메시지: ${ev.message}\n기준시각: ${ev.updatedAt || new Date().toISOString()}`
      : `Status abnormality (${ev.status}) detected for provider ${ev.providerId}.\nMessage: ${ev.message}\nTimestamp: ${ev.updatedAt || new Date().toISOString()}`;

    return {
      id: `evt-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      severity: rule.severity,
      title,
      body,
      data: ev,
      dataStatus: ev.dataStatus || "error",
      source: "System Health",
      sourceTier: "official",
      warnings: [],
      createdAt: new Date().toISOString()
    };
  }

  private createAssetEvent(rule: AlertRule, target: any, result: any): AlertEvent {
    const isKo = rule.locale === "ko";
    const name = isKo ? target.nameKo : target.nameEn;
    const symbol = target.symbol;

    let title = "";
    let body = "";

    if (rule.type === "return_zscore") {
      const zscoreVal = result.zScore || 0;
      const isAnomaly = rule.condition.kind === "return_zscore" && rule.condition.thresholdAbsZ > 0;
      const direction = zscoreVal >= 0 ? (isKo ? "상승" : "up") : (isKo ? "하락" : "down");

      if (isAnomaly) {
        title = isKo
          ? `[이상 등락 감지] ${name}(${symbol})`
          : `[Abnormal Price Move] ${name}(${symbol})`;

        body = isKo
          ? `${name}(${symbol})이 최근 ${(rule.condition as any).baselineWindow}거래일 변동성 기준 ${zscoreVal.toFixed(1)}σ 수준의 ${direction}을 보였습니다.\n\n현재 등락률: ${result.returnPercent.toFixed(2)}%\n최근 평균: ${result.meanPercent.toFixed(2)}%\n최근 표준편차: ${result.stdPercent.toFixed(2)}%\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`
          : `${name} (${symbol}) moved ${zscoreVal.toFixed(1)}σ versus its ${(rule.condition as any).baselineWindow}-day volatility baseline.\n\nReturn: ${result.returnPercent.toFixed(2)}%\nRolling Mean: ${result.meanPercent.toFixed(2)}%\nRolling Std Dev: ${result.stdPercent.toFixed(2)}%\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
      } else {
        title = isKo
          ? `[수익률 알림] ${name}(${symbol})`
          : `[Return Alert] ${name}(${symbol})`;

        body = isKo
          ? `${name}(${symbol})의 1일 수익률이 ${result.returnPercent.toFixed(2)}%를 기록했습니다.\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`
          : `${name} (${symbol}) daily return reached ${result.returnPercent.toFixed(2)}%.\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
      }
    } else if (rule.type === "volume_zscore") {
      const zscoreVal = result.zScore || 0;
      title = isKo
        ? `[거래량 이상] ${name}(${symbol})`
        : `[Abnormal Volume] ${name}(${symbol})`;

      body = isKo
        ? `${name}(${symbol}) 거래량이 최근 ${(rule.condition as any).baselineWindow}거래일 평균 대비 ${zscoreVal.toFixed(1)}σ 증가했습니다.\n\n현재 거래량: ${result.volume.toLocaleString()}주\n평균 거래량: ${Math.round(result.meanVolume).toLocaleString()}주\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`
        : `${name} (${symbol}) volume increased by ${zscoreVal.toFixed(1)}σ compared to its ${(rule.condition as any).baselineWindow}-day average.\n\nCurrent Volume: ${result.volume.toLocaleString()}\nAverage Volume: ${Math.round(result.meanVolume).toLocaleString()}\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
    } else if (rule.type === "gap_move") {
      const gapPercent = result.gapPercent || 0;
      const direction = gapPercent >= 0 ? (isKo ? "상승" : "up") : (isKo ? "하락" : "down");
      title = isKo
        ? `[갭 ${isKo ? (gapPercent >= 0 ? "상승" : "하락") : direction}] ${name}(${symbol})`
        : `[Gap ${gapPercent >= 0 ? "Up" : "Down"}] ${name}(${symbol})`;

      body = isKo
        ? `${name}(${symbol})이 전일 종가 대비 ${gapPercent.toFixed(2)}% 갭 ${isKo ? (gapPercent >= 0 ? "상승" : "하락") : direction} 출발했습니다.\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`
        : `${name} (${symbol}) departed with a ${gapPercent.toFixed(2)}% gap ${gapPercent >= 0 ? "up" : "down"} compared to yesterday's close.\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
    } else if (rule.type === "price_cross") {
      const direction = (rule.condition as any).direction;
      title = isKo
        ? `[가격 돌파] ${name}(${symbol})`
        : `[Price Crossed] ${name}(${symbol})`;

      body = isKo
        ? `${name}(${symbol})의 현재 가격이 ${result.price.toLocaleString()}원으로 설정값 ${(rule.condition as any).price.toLocaleString()}원을 ${direction === "above" ? "상향 돌파" : "하향 돌파"}했습니다.\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`
        : `${name} (${symbol}) current price is ${result.price.toLocaleString()}, crossing the target of ${(rule.condition as any).price.toLocaleString()} ${direction}.\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
    }

    if (result.sourceTier === "personal_fallback") {
      body += isKo
        ? "\n\n주의: 이 알림은 개인용 비공식 fallback 데이터를 포함합니다."
        : "\n\nWarning: This alert includes personal unofficial fallback data.";
    }

    return {
      id: `evt-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      severity: rule.severity,
      assetId: target.assetId,
      symbol,
      title,
      body,
      data: result,
      dataStatus: result.dataStatus || "real_time",
      source: result.source || "None",
      sourceTier: result.sourceTier || "official",
      warnings: result.warnings || [],
      createdAt: new Date().toISOString()
    };
  }
}

export const alertEvaluator = new AlertEvaluator();

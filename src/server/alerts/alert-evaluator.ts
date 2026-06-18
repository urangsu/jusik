import { MarketRegion, DataStatus } from "@/domain/common/data-status";
import { AlertEvent } from "@/domain/alerts/alert-event";
import { AlertRule } from "@/domain/alerts/alert-rule";
import { AlertRuleType } from "@/domain/alerts/alert-rule-type";
import { AlertSeverity } from "@/domain/alerts/alert-severity";
import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { alertRuleEngine } from "./alert-rule-engine";
import { alertEventStore } from "./alert-event-store";
import { alertCooldownManager } from "./alert-cooldown";
import { alertPreferenceStore } from "./alert-preference-store";
import { isInQuietHours } from "./alert-quiet-hours";
import { detectNewFilingEvents } from "./detectors/filing-event-detector";
import { detectProviderHealthAlerts } from "./detectors/provider-health-detector";
import { detectTechnicalSignalChanges } from "./detectors/technical-signal-change-detector";
import { detectReliabilityDeterioration } from "./detectors/reliability-deterioration-detector";
import { sendConsoleNotification } from "../notifications/channels/console-notification-channel";
import { volatilityAlertEngine } from "./volatility-alert-engine";
import { volumeAlertEngine } from "./volume-alert-engine";
import { priceAlertEngine } from "./price-alert-engine";
import { providerAlertEngine } from "./provider-alert-engine";

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  info: 0,
  watch: 1,
  warning: 2,
  critical: 3,
};

export class AlertEvaluator {
  async evaluateAll(): Promise<string[]> {
    const res = await this.evaluateAlerts();
    return res.events.map((e) => e.id);
  }

  async evaluateAlerts(params?: {
    universeId?: "KOSPI_SAMPLE" | "SP500_SAMPLE";
    ruleTypes?: AlertRuleType[];
  }): Promise<{
    generated: number;
    saved: number;
    skipped: number;
    events: AlertEvent[];
  }> {
    const prefs = await alertPreferenceStore.getPreferences();
    
    // 1. If alerting is globally disabled, skip
    if (!prefs.enabled) {
      return { generated: 0, saved: 0, skipped: 0, events: [] };
    }

    // 2. Check quiet hours
    const isQuiet = prefs.quietHours.enabled && isInQuietHours(new Date(), prefs.quietHours);

    const targetUniverses: Array<"KOSPI_SAMPLE" | "SP500_SAMPLE"> = params?.universeId
      ? [params.universeId]
      : ["KOSPI_SAMPLE", "SP500_SAMPLE"];

    const activeRuleTypes = params?.ruleTypes || prefs.enabledRuleTypes;

    const rawEvents: AlertEvent[] = [];

    // Run dynamic detectors if their ruleTypes are active
    if (activeRuleTypes.includes("new_filing")) {
      try {
        const filingEvents = await detectNewFilingEvents({ limit: 50 });
        rawEvents.push(...filingEvents);
      } catch (err) {
        console.error("[AlertEvaluator] Error running filing event detector:", err);
      }
    }

    if (
      activeRuleTypes.includes("provider_error") ||
      activeRuleTypes.includes("provider_rate_limited") ||
      activeRuleTypes.includes("provider_invalid_key")
    ) {
      try {
        const healthEvents = await detectProviderHealthAlerts();
        rawEvents.push(...healthEvents);
      } catch (err) {
        console.error("[AlertEvaluator] Error running provider health detector:", err);
      }
    }

    for (const universeId of targetUniverses) {
      if (
        activeRuleTypes.includes("technical_signal_change") ||
        activeRuleTypes.includes("momentum_score_change") ||
        activeRuleTypes.includes("data_quality")
      ) {
        try {
          const techEvents = await detectTechnicalSignalChanges({ universeId });
          rawEvents.push(...techEvents);
        } catch (err) {
          console.error(`[AlertEvaluator] Error running tech signal detector for ${universeId}:`, err);
        }
      }

      if (activeRuleTypes.includes("reliability_deterioration")) {
        try {
          const relEvents = await detectReliabilityDeterioration({ universeId });
          rawEvents.push(...relEvents);
        } catch (err) {
          console.error(`[AlertEvaluator] Error running reliability detector for ${universeId}:`, err);
        }
      }
    }

    // 3. Fallback / Rule-based evaluations for backwards compatibility
    try {
      const rules = await alertRuleEngine.getRules();
      const activeRules = rules.filter((r) => r.enabled && activeRuleTypes.includes(r.type));

      for (const rule of activeRules) {
        if (rule.type === "provider_error" && rule.condition.kind === "provider_error") {
          const evals = await providerAlertEngine.evaluate({ condition: rule.condition });
          for (const ev of evals) {
            if (ev.triggered) {
              rawEvents.push(this.createProviderEvent(rule, ev));
            }
          }
        } else {
          // Asset specific rules (price_cross, return_zscore, volume_zscore, gap_move)
          const targets = this.resolveTargets(rule);
          for (const target of targets) {
            const result = await this.evaluateAssetRule(rule, target);
            if (result && result.triggered) {
              rawEvents.push(this.createAssetEvent(rule, target, result));
            }
          }
        }
      }
    } catch (err) {
      console.error("[AlertEvaluator] Error in rule-based fallback evaluation:", err);
    }

    // 4. Apply preferences, quiet hours, severity thresholds, and deduplication
    const totalGeneratedCount = rawEvents.length;
    let savedCount = 0;
    let skippedCount = 0;
    const eventsToSave: AlertEvent[] = [];

    for (const ev of rawEvents) {
      // Filter by ruleTypes
      if (!activeRuleTypes.includes(ev.ruleType)) {
        skippedCount++;
        continue;
      }

      // Filter by minSeverity
      const evSeverityRank = SEVERITY_RANK[ev.severity] ?? 0;
      const prefSeverityRank = SEVERITY_RANK[prefs.minSeverity] ?? 0;
      if (evSeverityRank < prefSeverityRank) {
        skippedCount++;
        continue;
      }

      // Filter by quiet hours
      if (isQuiet) {
        skippedCount++;
        continue;
      }

      // Filter by cooldown (cooldownMinutes)
      const isCooldownActive = !(await alertCooldownManager.checkCooldown(
        ev.dedupeKey,
        prefs.cooldownMinutes
      ));
      if (isCooldownActive) {
        skippedCount++;
        continue;
      }

      // Prepare to save
      eventsToSave.push(ev);
      
      // Dispatch Console Notification
      if (prefs.channels.console) {
        try {
          await sendConsoleNotification(ev);
        } catch (err) {
          console.error("[AlertEvaluator] Console notification failed:", err);
        }
      }

      // Update Cooldown
      await alertCooldownManager.updateCooldown(ev.dedupeKey);
    }

    // Save alerts to store
    if (eventsToSave.length > 0) {
      await alertEventStore.saveAlertEvents(eventsToSave);
      savedCount = eventsToSave.length;
    }

    return {
      generated: totalGeneratedCount,
      saved: savedCount,
      skipped: skippedCount,
      events: eventsToSave,
    };
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

  public createProviderEvent(rule: AlertRule, ev: any): AlertEvent {
    const titleKo = `[제공자 오류] ${ev.providerId}`;
    const titleEn = `[Provider Error] ${ev.providerId}`;

    const messageKo = `데이터 제공자 ${ev.providerId}에서 상태 이상(${ev.status})이 감지되었습니다.\n상세 메시지: ${ev.message}\n기준시각: ${ev.updatedAt || new Date().toISOString()}`;
    const messageEn = `Status abnormality (${ev.status}) detected for provider ${ev.providerId}.\nMessage: ${ev.message}\nTimestamp: ${ev.updatedAt || new Date().toISOString()}`;

    return {
      id: `evt-rule-${rule.id}-${ev.providerId}-${ev.status}`,
      ruleType: rule.type,
      severity: rule.severity,
      titleKo,
      titleEn,
      messageKo,
      messageEn,
      assetId: null,
      symbol: null,
      universeId: null,
      providerId: ev.providerId as any,
      sourceEventId: null,
      sourceReceiptNo: null,
      dataStatus: ev.dataStatus || "error",
      source: "System Health",
      sourceTier: "official",
      warnings: [],
      dedupeKey: `provider:${ev.providerId}:${ev.status}`,
      occurredAt: ev.updatedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      readAt: null,
      dismissedAt: null,
      data: ev,
    };
  }

  public createAssetEvent(rule: AlertRule, target: any, result: any): AlertEvent {
    const nameKo = target.nameKo || target.symbol;
    const nameEn = target.nameEn || target.symbol;
    const symbol = target.symbol;

    let titleKo = "";
    let titleEn = "";
    let messageKo = "";
    let messageEn = "";

    if (rule.type === "return_zscore") {
      const zscoreVal = result.zScore || 0;
      const isAnomaly = rule.condition.kind === "return_zscore" && rule.condition.thresholdAbsZ > 0;
      const directionKo = zscoreVal >= 0 ? "상승" : "하락";
      const directionEn = zscoreVal >= 0 ? "up" : "down";

      if (isAnomaly) {
        titleKo = `[이상 등락 감지] ${nameKo}(${symbol})`;
        titleEn = `[Abnormal Price Move] ${nameEn}(${symbol})`;

        messageKo = `${nameKo}(${symbol})이 최근 ${(rule.condition as any).baselineWindow}거래일 변동성 기준 ${zscoreVal.toFixed(1)}σ 수준의 ${directionKo}을 보였습니다.\n\n현재 등락률: ${result.returnPercent.toFixed(2)}%\n최근 평균: ${result.meanPercent.toFixed(2)}%\n최근 표준편차: ${result.stdPercent.toFixed(2)}%\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`;
        messageEn = `${nameEn} (${symbol}) moved ${zscoreVal.toFixed(1)}σ versus its ${(rule.condition as any).baselineWindow}-day volatility baseline.\n\nReturn: ${result.returnPercent.toFixed(2)}%\nRolling Mean: ${result.meanPercent.toFixed(2)}%\nRolling Std Dev: ${result.stdPercent.toFixed(2)}%\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
      } else {
        titleKo = `[수익률 알림] ${nameKo}(${symbol})`;
        titleEn = `[Return Alert] ${nameEn}(${symbol})`;

        messageKo = `${nameKo}(${symbol})의 1일 수익률이 ${result.returnPercent.toFixed(2)}%를 기록했습니다.\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`;
        messageEn = `${nameEn} (${symbol}) daily return reached ${result.returnPercent.toFixed(2)}%.\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
      }
    } else if (rule.type === "volume_zscore") {
      const zscoreVal = result.zScore || 0;
      titleKo = `[거래량 이상] ${nameKo}(${symbol})`;
      titleEn = `[Abnormal Volume] ${nameEn}(${symbol})`;

      messageKo = `${nameKo}(${symbol}) 거래량이 최근 ${(rule.condition as any).baselineWindow}거래일 평균 대비 ${zscoreVal.toFixed(1)}σ 증가했습니다.\n\n현재 거래량: ${result.volume?.toLocaleString() || "0"}주\n평균 거래량: ${Math.round(result.meanVolume || 0).toLocaleString()}주\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`;
      messageEn = `${nameEn} (${symbol}) volume increased by ${zscoreVal.toFixed(1)}σ compared to its ${(rule.condition as any).baselineWindow}-day average.\n\nCurrent Volume: ${result.volume?.toLocaleString() || "0"}\nAverage Volume: ${Math.round(result.meanVolume || 0).toLocaleString()}\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
    } else if (rule.type === "gap_move") {
      const gapPercent = result.gapPercent || 0;
      const directionKo = gapPercent >= 0 ? "상승" : "하락";
      
      titleKo = `[갭 ${directionKo}] ${nameKo}(${symbol})`;
      titleEn = `[Gap ${gapPercent >= 0 ? "Up" : "Down"}] ${nameEn}(${symbol})`;

      messageKo = `${nameKo}(${symbol})이 전일 종가 대비 ${gapPercent.toFixed(2)}% 갭 ${directionKo} 출발했습니다.\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`;
      messageEn = `${nameEn} (${symbol}) departed with a ${gapPercent.toFixed(2)}% gap ${gapPercent >= 0 ? "up" : "down"} compared to yesterday's close.\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
    } else if (rule.type === "price_cross") {
      const direction = (rule.condition as any).direction;
      titleKo = `[가격 돌파] ${nameKo}(${symbol})`;
      titleEn = `[Price Crossed] ${nameEn}(${symbol})`;

      messageKo = `${nameKo}(${symbol})의 현재 가격이 ${result.price?.toLocaleString() || "0"}원으로 설정값 ${(rule.condition as any).price?.toLocaleString() || "0"}원을 ${direction === "above" ? "상향 돌파" : "하향 돌파"}했습니다.\n데이터 출처: ${result.source}\n기준시각: ${result.updatedAt || new Date().toISOString()}`;
      messageEn = `${nameEn} (${symbol}) current price is ${result.price?.toLocaleString() || "0"}, crossing the target of ${(rule.condition as any).price?.toLocaleString() || "0"} ${direction}.\nSource: ${result.source}\nTimestamp: ${result.updatedAt || new Date().toISOString()}`;
    }

    if (result.sourceTier === "personal_fallback") {
      messageKo += "\n\n주의: 이 알림은 개인용 비공식 fallback 데이터를 포함합니다.";
      messageEn += "\n\nWarning: This alert includes personal unofficial fallback data.";
    }

    const conditionHash = this.getConditionHash(rule, result);
    const dedupeKey = `rule:${rule.id}:${target.assetId}:${conditionHash}`;

    return {
      id: `evt-rule-${rule.id}-${target.symbol}`,
      ruleType: rule.type,
      severity: rule.severity,
      titleKo,
      titleEn,
      messageKo,
      messageEn,
      assetId: target.assetId,
      symbol,
      universeId: (rule.target.universeId === "KOSPI" || rule.target.universeId === "KOSPI_SAMPLE")
        ? "KOSPI_SAMPLE"
        : (rule.target.universeId === "SP500" || rule.target.universeId === "SP500_SAMPLE")
        ? "SP500_SAMPLE"
        : null,
      providerId: null,
      sourceEventId: null,
      sourceReceiptNo: null,
      dataStatus: result.dataStatus || "real_time",
      source: result.source || "System",
      sourceTier: result.sourceTier || "official",
      warnings: result.warnings || [],
      dedupeKey,
      occurredAt: result.updatedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      readAt: null,
      dismissedAt: null,
      data: result,
    };
  }
}

export const alertEvaluator = new AlertEvaluator();

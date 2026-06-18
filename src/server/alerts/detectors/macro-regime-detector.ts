import { AlertEvent } from "../../../domain/alerts/alert-event";
import { regimeStore } from "../../regime/regime-store";
import { sentimentReferenceStore } from "../../sentiment/sentiment-reference-store";

export async function detectMacroRegimeAlerts(): Promise<AlertEvent[]> {
  const events: AlertEvent[] = [];
  const latestRegimes = await regimeStore.getAllLatest();
  const history = await regimeStore.getHistory();

  // 1. Detect Regime changes and current states (US, KR)
  for (const market of ["US", "KR"] as const) {
    const current = latestRegimes[market];
    if (!current) continue;

    // Find the previous snapshot for this market
    const marketHistory = history.filter((h) => h.market === market && h.calculatedAt !== current.calculatedAt);
    const previous = marketHistory[marketHistory.length - 1] || null;

    // A. Regime Change Alert
    if (previous && previous.regime !== current.regime) {
      const warningText = current.warnings.length > 0 ? ` (${current.warnings.join(", ")})` : "";
      events.push({
        id: `evt-macro-regime-change-${market}-${current.regime}-${new Date().toISOString().slice(0, 10)}`,
        ruleType: "macro_regime_change",
        severity: "info",
        titleKo: `[시장 레짐 변경] ${market}`,
        titleEn: `[Market Regime Change] ${market}`,
        messageKo: `${market} 시장 레짐이 ${previous.regime}에서 ${current.regime}으로 전환되었습니다.${warningText}`,
        messageEn: `${market} market regime shifted from ${previous.regime} to ${current.regime}.${warningText}`,
        assetId: null,
        symbol: null,
        universeId: market === "US" ? "SP500_SAMPLE" : "KOSPI_SAMPLE",
        dataStatus: current.dataStatus,
        source: "Macro Regime Engine v1",
        sourceTier: "official",
        warnings: current.warnings.map(() => "unofficial" as const),
        dedupeKey: `macro_change:${market}:${current.regime}`,
        occurredAt: current.calculatedAt,
        createdAt: new Date().toISOString(),
        readAt: null,
        dismissedAt: null,
      });
    }

    // B. Risk Off Alarm
    if (current.regime === "risk_off") {
      events.push({
        id: `evt-macro-risk-off-${market}-${new Date().toISOString().slice(0, 10)}`,
        ruleType: "macro_risk_off",
        severity: "warning",
        titleKo: `[위험 관리 경고] ${market}`,
        titleEn: `[Risk Off Warning] ${market}`,
        messageKo: `${market} 시장 레짐이 risk_off 단계로 진입하여 위험 관리가 권장됩니다. 신규 관찰이 제한됩니다.`,
        messageEn: `${market} market regime entered risk_off phase. New watches are restricted.`,
        assetId: null,
        symbol: null,
        universeId: market === "US" ? "SP500_SAMPLE" : "KOSPI_SAMPLE",
        dataStatus: current.dataStatus,
        source: "Macro Regime Engine v1",
        sourceTier: "official",
        warnings: [],
        dedupeKey: `macro_risk_off:${market}:${new Date().toISOString().slice(0, 10)}`,
        occurredAt: current.calculatedAt,
        createdAt: new Date().toISOString(),
        readAt: null,
        dismissedAt: null,
      });
    }

    // C. Panic Alarm
    if (current.regime === "panic") {
      events.push({
        id: `evt-macro-panic-${market}-${new Date().toISOString().slice(0, 10)}`,
        ruleType: "macro_panic",
        severity: "critical",
        titleKo: `[시장 패닉 상태] ${market}`,
        titleEn: `[Market Panic Condition] ${market}`,
        messageKo: `${market} 시장 레짐이 panic 단계로 강등되었습니다. 안전자산 선호가 극대화되었습니다.`,
        messageEn: `${market} market regime downgraded to panic phase. Safety assets preference maximized.`,
        assetId: null,
        symbol: null,
        universeId: market === "US" ? "SP500_SAMPLE" : "KOSPI_SAMPLE",
        dataStatus: current.dataStatus,
        source: "Macro Regime Engine v1",
        sourceTier: "official",
        warnings: [],
        dedupeKey: `macro_panic:${market}:${new Date().toISOString().slice(0, 10)}`,
        occurredAt: current.calculatedAt,
        createdAt: new Date().toISOString(),
        readAt: null,
        dismissedAt: null,
      });
    }
  }

  // 2. Detect Sentiment Extreme Alerts (CNN Fear & Greed only. Crypto F&G is excluded for stock alerts)
  const cnnSnap = await sentimentReferenceStore.getLatestSnapshot("cnn_fear_greed_reference");
  if (cnnSnap && cnnSnap.value !== null) {
    if (cnnSnap.value <= 25) {
      events.push({
        id: `evt-sentiment-fear-${new Date().toISOString().slice(0, 10)}`,
        ruleType: "sentiment_extreme_fear",
        severity: "info", // CNN reference alert must be info or lower
        titleKo: `[극단적 공포 감지] 시장심리`,
        titleEn: `[Extreme Fear Detected] Market Sentiment`,
        messageKo: `미국 시장심리 참고값이 Extreme Fear (${cnnSnap.value}) 구간입니다. 전략 적합도 계산에는 사용되지 않습니다.`,
        messageEn: `US market sentiment reference is in Extreme Fear (${cnnSnap.value}) zone. Not used in strategy suitability.`,
        assetId: null,
        symbol: null,
        universeId: "SP500_SAMPLE",
        dataStatus: "cached",
        source: "CNN Fear & Greed Reference",
        sourceTier: "personal_fallback",
        warnings: [],
        dedupeKey: `sentiment_extreme_fear:${new Date().toISOString().slice(0, 10)}`,
        occurredAt: cnnSnap.updatedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        readAt: null,
        dismissedAt: null,
      });
    } else if (cnnSnap.value >= 76) {
      events.push({
        id: `evt-sentiment-greed-${new Date().toISOString().slice(0, 10)}`,
        ruleType: "sentiment_extreme_greed",
        severity: "info",
        titleKo: `[극단적 탐욕 감지] 시장심리`,
        titleEn: `[Extreme Greed Detected] Market Sentiment`,
        messageKo: `미국 시장심리 참고값이 Extreme Greed (${cnnSnap.value}) 구간입니다. 전략 적합도 계산에는 사용되지 않습니다.`,
        messageEn: `US market sentiment reference is in Extreme Greed (${cnnSnap.value}) zone. Not used in strategy suitability.`,
        assetId: null,
        symbol: null,
        universeId: "SP500_SAMPLE",
        dataStatus: "cached",
        source: "CNN Fear & Greed Reference",
        sourceTier: "personal_fallback",
        warnings: [],
        dedupeKey: `sentiment_extreme_greed:${new Date().toISOString().slice(0, 10)}`,
        occurredAt: cnnSnap.updatedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        readAt: null,
        dismissedAt: null,
      });
    }
  }

  return events;
}

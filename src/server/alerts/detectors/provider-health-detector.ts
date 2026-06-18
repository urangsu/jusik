import { AlertEvent } from "../../../domain/alerts/alert-event";
import { listProviderSettings } from "../../settings/provider-settings-store";

export async function detectProviderHealthAlerts(): Promise<AlertEvent[]> {
  const snapshots = await listProviderSettings();
  const events: AlertEvent[] = [];

  for (const snap of snapshots) {
    const status = snap.status;
    
    // Skip healthy configurations
    if (status === "healthy" || status === "configured") {
      continue;
    }

    let severity: AlertEvent["severity"] = "warning";
    let ruleType: AlertEvent["ruleType"] = "provider_error";
    let titleKo = "";
    let titleEn = "";

    if (status === "invalid_key") {
      severity = "critical";
      ruleType = "provider_invalid_key";
      titleKo = `[인증키 오류] ${snap.providerId}`;
      titleEn = `[Invalid API Key] ${snap.providerId}`;
    } else if (status === "rate_limited") {
      severity = "warning";
      ruleType = "provider_rate_limited";
      titleKo = `[요청 제한] ${snap.providerId}`;
      titleEn = `[Rate Limited] ${snap.providerId}`;
    } else if (status === "not_configured") {
      severity = "watch";
      ruleType = "provider_error";
      titleKo = `[API 설정 필요] ${snap.providerId}`;
      titleEn = `[API Settings Required] ${snap.providerId}`;
    } else {
      // "error" status
      severity = "warning";
      ruleType = "provider_error";
      titleKo = `[제공자 오류] ${snap.providerId}`;
      titleEn = `[Provider Error] ${snap.providerId}`;
    }

    const message = snap.message || "상태 정보 없음 (No diagnostics)";

    events.push({
      id: `evt-provider-${snap.providerId}-${status}`,
      ruleType,
      severity,
      titleKo,
      titleEn,
      messageKo: `[${snap.providerId}] 상태 이상 (${status})이 감지되었습니다: ${message}`,
      messageEn: `[${snap.providerId}] Status abnormality (${status}) detected: ${message}`,
      assetId: null,
      symbol: null,
      universeId: null,
      providerId: snap.providerId,
      sourceEventId: null,
      sourceReceiptNo: null,
      dataStatus: status === "rate_limited" ? "rate_limited" : "error",
      source: `${snap.providerId} Health Checker`,
      sourceTier: "official",
      warnings: [],
      dedupeKey: `provider:${snap.providerId}:${status}`,
      occurredAt: snap.lastCheckedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      readAt: null,
      dismissedAt: null,
    });
  }

  return events;
}

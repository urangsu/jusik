import { listWatchlistItems } from "./watchlist-store";
import { saveWatchlistReportItem, listWatchlistReportItems } from "./watchlist-report-store";
import { listSignalPostmortems } from "../strategy/signal-postmortem-store";
import { alertEventStore } from "../alerts/alert-event-store";
import { getRecentFilings } from "../filings/filing-event-store";
import { WatchlistReportItem, WatchlistReportSeverity } from "@/domain/watchlist/watchlist-report-item";
import { WatchlistReportSourceType } from "@/domain/watchlist/watchlist-report-source";

export async function aggregateWatchlistReports(input?: {
  assetId?: string;
  sourceTypes?: WatchlistReportSourceType[];
  since?: string;
  dryRun?: boolean;
}): Promise<{
  created: number;
  skippedDuplicate: number;
  items: WatchlistReportItem[];
}> {
  const watchlists = await listWatchlistItems({ reportInboxEnabled: true });
  const activeAssetIds = new Set(watchlists.map((w) => w.assetId));

  let targetAssetIds = activeAssetIds;
  if (input?.assetId) {
    if (!activeAssetIds.has(input.assetId)) {
      return { created: 0, skippedDuplicate: 0, items: [] };
    }
    targetAssetIds = new Set([input.assetId]);
  }

  if (targetAssetIds.size === 0) {
    return { created: 0, skippedDuplicate: 0, items: [] };
  }

  const activeSources = input?.sourceTypes || [
    "signal_postmortem",
    "alert_event",
    "opendart_filing",
  ];

  const candidateItems: WatchlistReportItem[] = [];

  if (activeSources.includes("signal_postmortem")) {
    const postmortems = await listSignalPostmortems();
    for (const pm of postmortems) {
      if (!targetAssetIds.has(pm.assetId)) continue;
      if (input?.since && pm.createdAt < input.since) continue;

      const wlItem = watchlists.find((w) => w.assetId === pm.assetId)!;
      let severity: WatchlistReportSeverity = "info";
      if (pm.outcome === "negative" || pm.outcome === "missing_price") {
        severity = "warning";
      } else if (pm.outcome === "not_evaluable") {
        severity = "watch";
      }

      const dedupeKey = `${pm.assetId}|signal_postmortem|${pm.id}`;
      candidateItems.push({
        id: `report_postmortem_${pm.id}`,
        assetId: pm.assetId,
        symbol: pm.symbol,
        assetName: wlItem.nameKo || wlItem.nameEn,
        title: `신호 사후검토 기록: ${pm.symbol} / ${pm.strategyId}`,
        summary: `${pm.testStart}~${pm.testEnd} 구간, rank ${pm.rank}, outcome ${pm.outcome}, netReturn ${
          pm.netReturn !== null ? (pm.netReturn * 100).toFixed(2) + "%" : "N/A"
        }`,
        category: "internal_research",
        severity,
        source: {
          sourceType: "signal_postmortem",
          sourceId: pm.id,
          sourceTitle: "신호 사후검토 기록",
          sourceUrl: null,
          internalUrl: `/strategy/signal-postmortems/${pm.id}`,
          sourceTier: "personal_fallback",
          warnings: [...(pm.dataWarnings || []), ...(pm.biasWarnings || [])],
          publishedAt: pm.createdAt,
          capturedAt: pm.createdAt,
        },
        status: "unread",
        tags: [],
        detectedAt: pm.createdAt,
        updatedAt: pm.updatedAt,
        dedupeKey,
      });
    }
  }

  if (activeSources.includes("alert_event")) {
    const alerts = await alertEventStore.getAlertEvents({ limit: 1000 });
    for (const alert of alerts) {
      if (!alert.assetId || !targetAssetIds.has(alert.assetId)) continue;
      if (input?.since && alert.occurredAt < input.since) continue;

      const wlItem = watchlists.find((w) => w.assetId === alert.assetId)!;

      let category: any = "signal";
      if (alert.ruleType === "technical_signal_change") {
        category = "signal";
      } else if (alert.ruleType === "provider_error") {
        category = "provider";
      } else if (alert.ruleType === "data_quality") {
        category = "data_quality";
      } else if (alert.ruleType === "new_filing") {
        category = "filing";
      } else if (alert.ruleType === "strategy_score_change") {
        category = "signal";
      }

      const dedupeKey = `${alert.assetId}|alert_event|${alert.id}`;
      candidateItems.push({
        id: `report_alert_${alert.id}`,
        assetId: alert.assetId,
        symbol: alert.symbol || wlItem.symbol,
        assetName: wlItem.nameKo || wlItem.nameEn,
        title: alert.titleKo || alert.titleEn || "경고",
        summary: alert.messageKo || alert.messageEn || "",
        category,
        severity: alert.severity,
        source: {
          sourceType: "alert_event",
          sourceId: alert.id,
          sourceTitle: alert.ruleName || "경고 이벤트",
          sourceUrl: null,
          internalUrl: `/alerts?eventId=${alert.id}`,
          sourceTier: alert.sourceTier || "personal_fallback",
          warnings: alert.warnings || [],
          publishedAt: alert.occurredAt,
          capturedAt: alert.createdAt,
        },
        status: "unread",
        tags: [],
        detectedAt: alert.occurredAt,
        updatedAt: alert.createdAt,
        dedupeKey,
      });
    }
  }

  if (activeSources.includes("opendart_filing")) {
    const filings = await getRecentFilings({ limit: 1000 });
    for (const filing of filings) {
      if (!filing.stockCode) continue;
      const assetId = `KR:${filing.stockCode}`;
      if (!targetAssetIds.has(assetId)) continue;
      if (input?.since && filing.dataAvailableAt < input.since) continue;

      const wlItem = watchlists.find((w) => w.assetId === assetId)!;

      let severity: WatchlistReportSeverity = "info";
      const name = filing.reportName || "";
      if (name.includes("상장폐지") || name.includes("횡령")) {
        severity = "critical";
      } else if (
        name.includes("정정") ||
        name.includes("소송") ||
        name.includes("감사의견")
      ) {
        severity = "warning";
      }

      const dedupeKey = `${assetId}|opendart_filing|${filing.id}`;
      candidateItems.push({
        id: `report_filing_${filing.id}`,
        assetId,
        symbol: filing.stockCode,
        assetName: wlItem.nameKo || wlItem.nameEn || filing.corpName,
        title: `공시: ${filing.reportName}`,
        summary: `${filing.corpName} (${filing.stockCode}) 공시 - 접수일자: ${filing.receiptDate}`,
        category: "filing",
        severity,
        source: {
          sourceType: "opendart_filing",
          sourceId: filing.id,
          sourceTitle: "OpenDART 공시",
          sourceUrl: filing.filingUrl || null,
          internalUrl: `/filings?assetId=${assetId}&filingId=${filing.id}`,
          sourceTier: "official",
          warnings: filing.warnings || [],
          publishedAt: filing.dataAvailableAt,
          capturedAt: filing.createdAt,
        },
        status: "unread",
        tags: [],
        detectedAt: filing.dataAvailableAt,
        updatedAt: filing.createdAt,
        dedupeKey,
      });
    }
  }

  let created = 0;
  let skippedDuplicate = 0;
  const processedItems: WatchlistReportItem[] = [];

  const existingReports = await listWatchlistReportItems({ includeHidden: true });
  const existingDedupeMap = new Map(existingReports.map((r) => [r.dedupeKey, r]));

  for (const item of candidateItems) {
    const existing = existingDedupeMap.get(item.dedupeKey);
    if (existing) {
      skippedDuplicate++;
      if (!input?.dryRun) {
        const updated = {
          ...item,
          id: existing.id,
          status: existing.status,
          updatedAt: new Date().toISOString(),
        };
        await saveWatchlistReportItem(updated);
        processedItems.push(updated);
      } else {
        processedItems.push(existing);
      }
    } else {
      created++;
      if (!input?.dryRun) {
        await saveWatchlistReportItem(item);
      }
      processedItems.push(item);
    }
  }

  return {
    created,
    skippedDuplicate,
    items: processedItems,
  };
}

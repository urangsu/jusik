import { AlertEvent } from "../../../domain/alerts/alert-event";
import { getRecentFilings } from "../../filings/filing-event-store";

export async function detectNewFilingEvents(params: {
  since?: string;
  stockCode?: string;
  limit?: number;
}): Promise<AlertEvent[]> {
  const filings = await getRecentFilings({
    stockCode: params.stockCode,
    limit: params.limit || 50,
  });

  if (!filings || filings.length === 0) {
    return [];
  }

  let filtered = [...filings];
  if (params.since) {
    const sinceTime = new Date(params.since).getTime();
    filtered = filtered.filter(
      (f) => new Date(f.createdAt).getTime() > sinceTime
    );
  }

  const events: AlertEvent[] = [];

  for (const f of filtered) {
    // Categorize severity based on disclosureType (A: info, B/C/D: watch, others: info)
    let severity: AlertEvent["severity"] = "info";
    const dtype = f.disclosureType;
    if (dtype === "B" || dtype === "C" || dtype === "D") {
      severity = "watch";
    } else if (dtype === "A") {
      severity = "info";
    }

    events.push({
      id: `evt-filing-${f.receiptNo}`,
      ruleType: "new_filing",
      severity,
      titleKo: `[신규 공시] ${f.corpName}`,
      titleEn: `[New Filing] ${f.corpName}`,
      messageKo: `[${f.corpName}] 신규 공시가 접수되었습니다: ${f.reportName}`,
      messageEn: `[${f.corpName}] New filing received: ${f.reportName}`,
      assetId: f.stockCode ? `KR:${f.stockCode}` : null,
      symbol: f.stockCode || null,
      universeId: "KOSPI_SAMPLE", // defaults to Korean market universe
      providerId: "opendart",
      sourceEventId: f.id,
      sourceReceiptNo: f.receiptNo,
      dataStatus: f.dataStatus,
      source: f.source,
      sourceTier: f.sourceTier,
      warnings: f.warnings,
      dedupeKey: `filing:${f.receiptNo}`,
      occurredAt: f.dataAvailableAt || f.createdAt,
      createdAt: new Date().toISOString(),
      readAt: null,
      dismissedAt: null,
    });
  }

  return events;
}

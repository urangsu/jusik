import { AlertEvent } from "../../../domain/alerts/alert-event";
import { getLatestReliabilitySummary } from "../../reliability/reliability-store";
import { ReliabilitySummary } from "@/domain/reliability/reliability-summary";
import fs from "fs/promises";
import path from "path";

const HISTORY_DIR = path.join(process.cwd(), "data", "reliability", "history");

async function getPreviousSummary(
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE",
  currentCalculatedAt: string
): Promise<ReliabilitySummary | null> {
  try {
    const files = await fs.readdir(HISTORY_DIR);
    const summaries: ReliabilitySummary[] = [];

    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const content = await fs.readFile(path.join(HISTORY_DIR, f), "utf8");
      const summary = JSON.parse(content) as ReliabilitySummary;
      if (summary.universeId === universeId) {
        summaries.push(summary);
      }
    }

    // Sort by calculatedAt desc
    summaries.sort((a, b) => b.calculatedAt.localeCompare(a.calculatedAt));

    // Find the first summary that has calculatedAt older than currentCalculatedAt
    const found = summaries.find(
      (s) => s.calculatedAt.localeCompare(currentCalculatedAt) < 0
    );

    return found || null;
  } catch {
    return null;
  }
}

export async function detectReliabilityDeterioration(params: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
}): Promise<AlertEvent[]> {
  const current = await getLatestReliabilitySummary(params.universeId);
  if (!current || !current.records) {
    return [];
  }

  const prev = await getPreviousSummary(params.universeId, current.calculatedAt);
  const events: AlertEvent[] = [];

  const currentDate = current.calculatedAt ? current.calculatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

  // 1. Check aggregate level fallback increase
  if (prev && prev.aggregate) {
    const currentFallback = current.aggregate.personalFallbackAffectedSignals || 0;
    const prevFallback = prev.aggregate.personalFallbackAffectedSignals || 0;

    if (currentFallback > prevFallback) {
      events.push({
        id: `evt-reliability-fallback-${params.universeId}-${currentDate}`,
        ruleType: "reliability_deterioration",
        severity: "info",
        titleKo: `[비공식 데이터 공급 증가] ${params.universeId}`,
        titleEn: `[Personal Fallback Expanded] ${params.universeId}`,
        messageKo: `[${params.universeId}] 비공식 개인 백업 데이터(personal_fallback) 영향을 받는 신호 수가 이전 ${prevFallback}개에서 현재 ${currentFallback}개로 증가했습니다.`,
        messageEn: `[${params.universeId}] Number of signals utilizing unofficial backup data (personal_fallback) increased from ${prevFallback} to ${currentFallback}.`,
        assetId: null,
        symbol: null,
        universeId: params.universeId,
        providerId: null,
        sourceEventId: null,
        sourceReceiptNo: null,
        dataStatus: "stale",
        source: "Reliability Engine",
        sourceTier: "personal_fallback",
        warnings: ["unofficial"],
        dedupeKey: `reliability:fallback_increase:${params.universeId}:${currentDate}`,
        occurredAt: current.calculatedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        readAt: null,
        dismissedAt: null,
      });
    }
  }

  // 2. Check record level changes
  for (const rec of current.records) {
    const prevRec = prev?.records?.find(
      (r) => r.signalId === rec.signalId && r.horizon === rec.horizon
    );

    // (A) Check robust signal -> low label deterioration
    const isRobust = rec.sampleStatus === "robust";
    const isLow = rec.reliabilityLabel === "low";
    const wasNotLow = prevRec ? prevRec.reliabilityLabel !== "low" : true;

    if (isRobust && isLow && wasNotLow) {
      events.push({
        id: `evt-reliability-robust-low-${rec.signalId}-${rec.horizon}-${currentDate}`,
        ruleType: "reliability_deterioration",
        severity: "warning",
        titleKo: `[신뢰도 급감] ${rec.signalId}`,
        titleEn: `[Reliability Drop] ${rec.signalId}`,
        messageKo: `[${rec.signalId} / ${rec.horizon}] robust 등급 신호의 신뢰성 라벨이 'low'로 하락했습니다.`,
        messageEn: `[${rec.signalId} / ${rec.horizon}] Robust status signal's reliability label downgraded to 'low'.`,
        assetId: null,
        symbol: null,
        universeId: params.universeId,
        providerId: null,
        sourceEventId: null,
        sourceReceiptNo: null,
        dataStatus: "real_time",
        source: "Reliability Engine",
        sourceTier: "official",
        warnings: [],
        dedupeKey: `reliability:robust_low:${rec.signalId}:${rec.horizon}:${currentDate}`,
        occurredAt: current.calculatedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        readAt: null,
        dismissedAt: null,
      });
    }

    // (B) Check negative_ic warning newly triggered
    const hasNegativeIc = rec.warnings?.includes("negative_ic") === true;
    const hadNegativeIc = prevRec?.warnings?.includes("negative_ic") === true;

    if (hasNegativeIc && !hadNegativeIc) {
      events.push({
        id: `evt-reliability-negative-ic-${rec.signalId}-${rec.horizon}-${currentDate}`,
        ruleType: "reliability_deterioration",
        severity: "warning",
        titleKo: `[음의 IC 경고] ${rec.signalId}`,
        titleEn: `[Negative IC Warning] ${rec.signalId}`,
        messageKo: `[${rec.signalId} / ${rec.horizon}] 미래 수익률과의 음의 상관성(역방향) 경고(negative_ic)가 검출되었습니다.`,
        messageEn: `[${rec.signalId} / ${rec.horizon}] Negative Spearman IC warning (negative_ic) newly detected against forward returns.`,
        assetId: null,
        symbol: null,
        universeId: params.universeId,
        providerId: null,
        sourceEventId: null,
        sourceReceiptNo: null,
        dataStatus: "real_time",
        source: "Reliability Engine",
        sourceTier: "official",
        warnings: [],
        dedupeKey: `reliability:negative_ic:${rec.signalId}:${rec.horizon}:${currentDate}`,
        occurredAt: current.calculatedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        readAt: null,
        dismissedAt: null,
      });
    }

    // (C) Check reliabilityScore drop of 20 or more
    if (rec.reliabilityScore !== null && prevRec && prevRec.reliabilityScore !== null) {
      const scoreDrop = rec.reliabilityScore - prevRec.reliabilityScore;
      if (scoreDrop <= -20) {
        events.push({
          id: `evt-reliability-score-drop-${rec.signalId}-${rec.horizon}-${currentDate}`,
          ruleType: "reliability_deterioration",
          severity: "warning",
          titleKo: `[신뢰도 점수 급감] ${rec.signalId}`,
          titleEn: `[Reliability Score Drop] ${rec.signalId}`,
          messageKo: `[${rec.signalId} / ${rec.horizon}] 신뢰도 점수가 이전 ${prevRec.reliabilityScore}에서 현재 ${rec.reliabilityScore}로 급감했습니다 (감소폭 ${Math.abs(scoreDrop)}).`,
          messageEn: `[${rec.signalId} / ${rec.horizon}] Reliability score dropped from ${prevRec.reliabilityScore} to ${rec.reliabilityScore} (drop of ${Math.abs(scoreDrop)}).`,
          assetId: null,
          symbol: null,
          universeId: params.universeId,
          providerId: null,
          sourceEventId: null,
          sourceReceiptNo: null,
          dataStatus: "real_time",
          source: "Reliability Engine",
          sourceTier: "official",
          warnings: [],
          dedupeKey: `reliability:score_drop:${rec.signalId}:${rec.horizon}:${currentDate}`,
          occurredAt: current.calculatedAt || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          readAt: null,
          dismissedAt: null,
        });
      }
    }
  }

  return events;
}

import { AlertEvent } from "../../../domain/alerts/alert-event";
import { getTechnicalSignalSnapshot, getFactorValues } from "../../factors/factor-store";
import { getSignalHistory } from "../../signals/signal-history-store";

function mapScoreToLabel(score: number | null, isInsufficient: boolean): string {
  if (score === null || isInsufficient) return "데이터 부족";
  if (score >= 30) return "검토";
  if (score <= -50) return "위험";
  if (score <= -30) return "주의";
  return "관망";
}

export async function detectTechnicalSignalChanges(params: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
}): Promise<AlertEvent[]> {
  const snapshot = await getTechnicalSignalSnapshot(params.universeId);
  if (!snapshot || !snapshot.assets) {
    return [];
  }

  const allFactorValues = await getFactorValues();
  const allHistoryRecords = await getSignalHistory();
  const events: AlertEvent[] = [];

  const currentDate = snapshot.updatedAt ? snapshot.updatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

  for (const assetId of Object.keys(snapshot.assets)) {
    const asset = snapshot.assets[assetId];
    const nameKo = asset.nameKo || asset.symbol;
    const nameEn = asset.nameEn || asset.symbol;

    const currentScore = asset.momentum?.factorValue?.rawValue ?? null;
    const currentStatus = asset.momentum?.factorValue?.dataStatus ?? "insufficient_data";
    const currentIsInsufficient = currentStatus === "insufficient_data";
    const currentLabel = mapScoreToLabel(currentScore, currentIsInsufficient);

    // 1. Find historical momentum factor values for this asset
    const assetFactors = allFactorValues
      .filter((v) => v.assetId === assetId && v.factorId === "momentum")
      .sort((a, b) => b.dataAvailableAt.localeCompare(a.dataAvailableAt));

    // Previous factor value is the first historical value before current snapshot date
    const prevFactor = assetFactors.find(
      (v) => v.dataAvailableAt.localeCompare(currentDate) < 0
    );

    if (prevFactor) {
      const prevScore = prevFactor.rawValue;
      const prevStatus = prevFactor.dataStatus;
      const prevIsInsufficient = prevStatus === "insufficient_data";
      const prevLabel = mapScoreToLabel(prevScore, prevIsInsufficient);

      // (A) Check score change threshold of 30
      if (currentScore !== null && prevScore !== null) {
        const scoreDiff = currentScore - prevScore;
        if (Math.abs(scoreDiff) >= 30) {
          events.push({
            id: `evt-momentum-score-${assetId}-${currentDate}`,
            ruleType: "momentum_score_change",
            severity: "watch",
            titleKo: `[모멘텀 점수 급변] ${nameKo}`,
            titleEn: `[Momentum Score Change] ${nameEn}`,
            messageKo: `[${nameKo}] 종합 모멘텀 점수가 이전 ${prevScore}에서 현재 ${currentScore > 0 ? "+" : ""}${currentScore}로 급변했습니다 (변화폭 ${Math.abs(scoreDiff)}).`,
            messageEn: `[${nameEn}] Aggregated momentum score changed from ${prevScore} to ${currentScore > 0 ? "+" : ""}${currentScore} (change of ${Math.abs(scoreDiff)}).`,
            assetId,
            symbol: asset.symbol,
            universeId: params.universeId,
            providerId: null,
            sourceEventId: null,
            sourceReceiptNo: null,
            dataStatus: currentStatus,
            source: "Technical Engine",
            sourceTier: "official",
            warnings: [],
            dedupeKey: `momentum:score_change:${assetId}:${currentDate}`,
            occurredAt: snapshot.updatedAt || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            readAt: null,
            dismissedAt: null,
          });
        }
      }

      // (B) Check label changes
      if (currentLabel !== prevLabel) {
        events.push({
          id: `evt-momentum-label-${assetId}-${currentDate}`,
          ruleType: "momentum_score_change",
          severity: "info",
          titleKo: `[모멘텀 상태 변화] ${nameKo}`,
          titleEn: `[Momentum Status Change] ${nameEn}`,
          messageKo: `[${nameKo}] 모멘텀 진단 상태가 이전 '${prevLabel}'에서 현재 '${currentLabel}' 상태로 변경되었습니다.`,
          messageEn: `[${nameEn}] Momentum diagnostic status changed from '${prevLabel}' to '${currentLabel}'.`,
          assetId,
          symbol: asset.symbol,
          universeId: params.universeId,
          providerId: null,
          sourceEventId: null,
          sourceReceiptNo: null,
          dataStatus: currentStatus,
          source: "Technical Engine",
          sourceTier: "official",
          warnings: [],
          dedupeKey: `momentum:label_change:${assetId}:${currentDate}`,
          occurredAt: snapshot.updatedAt || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          readAt: null,
          dismissedAt: null,
        });

        // (C) Check level downgrade to caution ("주의") or risk ("위험")
        const isDowngrade =
          (currentLabel === "주의" || currentLabel === "위험") &&
          (prevLabel === "검토" || prevLabel === "관망");
        if (isDowngrade) {
          events.push({
            id: `evt-momentum-downgrade-${assetId}-${currentDate}`,
            ruleType: "technical_signal_change",
            severity: currentLabel === "위험" ? "critical" : "warning",
            titleKo: `[모멘텀 단계 하락] ${nameKo}`,
            titleEn: `[Momentum Level Downgrade] ${nameEn}`,
            messageKo: `[${nameKo}] 모멘텀 진단 단계가 '${prevLabel}'에서 '${currentLabel}' 수준으로 하락하여 주의가 필요합니다.`,
            messageEn: `[${nameEn}] Momentum diagnostic level downgraded from '${prevLabel}' to '${currentLabel}'. Caution is advised.`,
            assetId,
            symbol: asset.symbol,
            universeId: params.universeId,
            providerId: null,
            sourceEventId: null,
            sourceReceiptNo: null,
            dataStatus: currentStatus,
            source: "Technical Engine",
            sourceTier: "official",
            warnings: [],
            dedupeKey: `momentum:level_downgrade:${assetId}:${currentDate}`,
            occurredAt: snapshot.updatedAt || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            readAt: null,
            dismissedAt: null,
          });
        }
      }

      // (D) Check insufficient_data -> usable transition
      if (prevIsInsufficient && !currentIsInsufficient) {
        events.push({
          id: `evt-momentum-restored-${assetId}-${currentDate}`,
          ruleType: "data_quality",
          severity: "info",
          titleKo: `[데이터 가용성 확보] ${nameKo}`,
          titleEn: `[Data Availability Restored] ${nameEn}`,
          messageKo: `[${nameKo}] 충분한 데이터가 공급되어 기술적 진단이 가능해졌습니다.`,
          messageEn: `[${nameEn}] Insufficient data resolved. Technical analysis is now usable.`,
          assetId,
          symbol: asset.symbol,
          universeId: params.universeId,
          providerId: null,
          sourceEventId: null,
          sourceReceiptNo: null,
          dataStatus: currentStatus,
          source: "Technical Engine",
          sourceTier: "official",
          warnings: [],
          dedupeKey: `momentum:data_restored:${assetId}:${currentDate}`,
          occurredAt: snapshot.updatedAt || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          readAt: null,
          dismissedAt: null,
        });
      }
    }

    // 2. Check cross-horizon tension
    const currentTension = asset.momentum?.crossHorizonTension?.detected === true;
    if (currentTension) {
      // Find if previous tension was false
      const prevDate = prevFactor?.dataAvailableAt;
      let prevTension = false;
      if (prevDate) {
        const prevDateRecords = allHistoryRecords.filter(
          (r) => r.assetId === assetId && r.date === prevDate
        );
        const prevAtomicSignals = prevDateRecords.map((r) => r.signal);
        
        // Compute previous byHorizon averages
        const horizons = ["short", "medium", "long"];
        const prevByHorizon: Record<string, number | null> = {};
        for (const h of horizons) {
          const hSigs = prevAtomicSignals.filter(
            (s: any) => s.horizon === h && s.score !== null && s.score !== undefined
          );
          if (hSigs.length > 0) {
            const sum = hSigs.reduce((a: number, b: any) => a + (b.score as number), 0);
            prevByHorizon[h] = Math.round(sum / hSigs.length);
          } else {
            prevByHorizon[h] = null;
          }
        }
        
        const ps = prevByHorizon["short"];
        const pl = prevByHorizon["long"];
        if (ps !== null && pl !== null) {
          const pst = ps >= 30 ? "bullish" : ps <= -30 ? "bearish" : "neutral";
          const plt = pl >= 30 ? "bullish" : pl <= -30 ? "bearish" : "neutral";
          prevTension =
            (pst === "bullish" && plt === "bearish") ||
            (pst === "bearish" && plt === "bullish");
        }
      }

      if (!prevTension) {
        events.push({
          id: `evt-momentum-tension-${assetId}-${currentDate}`,
          ruleType: "technical_signal_change",
          severity: "watch",
          titleKo: `[추세 상충 감지] ${nameKo}`,
          titleEn: `[Trend Tension Detected] ${nameEn}`,
          messageKo: `[${nameKo}] 단기 추세와 장기 추세의 불일치(상충)가 신규 감지되었습니다.`,
          messageEn: `[${nameEn}] Cross-horizon trend tension between short-term and long-term momentum has been newly detected.`,
          assetId,
          symbol: asset.symbol,
          universeId: params.universeId,
          providerId: null,
          sourceEventId: null,
          sourceReceiptNo: null,
          dataStatus: currentStatus,
          source: "Technical Engine",
          sourceTier: "official",
          warnings: [],
          dedupeKey: `momentum:tension:${assetId}:${currentDate}`,
          occurredAt: snapshot.updatedAt || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          readAt: null,
          dismissedAt: null,
        });
      }
    }
  }

  return events;
}

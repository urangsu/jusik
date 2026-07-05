import { StrategyAgreementLabel } from "@/domain/strategy/strategy-agreement-signal";
import { StrategySuitability, RegimeGateComponent } from "@/domain/strategy/strategy-suitability";
import { regimeStore } from "../regime/regime-store";
import { signalStabilityService } from "../signals/signal-stability-service";
import { getSignalHistory } from "../signals/signal-history-store";

export class StrategySuitabilityService {
  async calculateSuitability(
    assetId: string,
    symbol: string,
    signalId: string,
    originalLabel: StrategyAgreementLabel | null,
    originalScore: number | null,
    asOf: string,
    universeId?: string
  ): Promise<StrategySuitability> {
    // Determine market based on symbol prefix or pattern
    const isKr = symbol.startsWith("KR:") || /^\d{6}$/.test(symbol) || assetId.startsWith("KR:");
    const market = isKr ? "KR" : "US";
    const resolvedUniverseId = universeId || (market === "KR" ? "KOSPI_SAMPLE" : "SP500_SAMPLE");

    const warnings: string[] = [];

    // Query canonical original label/score from signal history store first
    let historyLoadFailed = false;
    let historyRecords: Awaited<ReturnType<typeof getSignalHistory>> = [];
    try {
      historyRecords = await getSignalHistory();
    } catch {
      historyLoadFailed = true;
      warnings.push("signal_history_load_failed");
    }
    
    function defaultSignalId(sig: unknown): string {
      if (!sig || typeof sig !== "object") return "unknown";
      const candidate = sig as Record<string, unknown>;
      return String(
        candidate.signalId ??
          candidate.strategyId ??
          candidate.factorId ??
          candidate.id ??
          "unknown"
      );
    }
    
    function defaultSignalLabel(sig: unknown): string | null {
      if (!sig || typeof sig !== "object") return null;
      const candidate = sig as Record<string, unknown>;
      const value =
        candidate.signal ??
        candidate.direction ??
        candidate.consensusLabel ??
        candidate.position ??
        candidate.label ??
        candidate.status;
      return typeof value === "string" && value.length > 0 ? value : null;
    }

    const matchedRecord = historyRecords.find(
      (r) =>
        r.assetId === assetId &&
        defaultSignalId(r.signal) === signalId &&
        r.date === asOf
    );

    let canonicalLabel = originalLabel;
    let canonicalScore = originalScore;

    if (matchedRecord) {
      const extractedLabel = matchedRecord.signal.signalLabel || defaultSignalLabel(matchedRecord.signal);
      const extractedScore =
        matchedRecord.signal.score !== undefined
          ? matchedRecord.signal.score
          : matchedRecord.signal.agreementScore !== undefined
          ? matchedRecord.signal.agreementScore
          : null;

      canonicalLabel = extractedLabel as StrategyAgreementLabel;
      canonicalScore = extractedScore;
    } else if (historyLoadFailed) {
      // History store was unavailable — cannot verify canonical data
      canonicalLabel = "insufficient_data";
      canonicalScore = null;
      warnings.push("canonical_lookup_unavailable");
    } else if (!originalLabel) {
      canonicalLabel = "insufficient_data";
      canonicalScore = null;
      warnings.push("source_signal_missing");
    }

    // Retrieve regime snapshot as of the requested date
    const snapshot = await regimeStore.getSnapshotAsOf(market, asOf);

    const gateComponent: RegimeGateComponent = {
      market,
      regime: snapshot?.regime || "insufficient_data",
      allowsNewWatch: snapshot?.gates.allowsNewWatch ?? true,
      allowsRiskUpgrading: snapshot?.gates.allowsRiskUpgrading ?? true,
      confidence: snapshot?.confidence || "low",
      warning: snapshot?.warnings.join("; ") || null,
    };

    let adjustedLabel: StrategyAgreementLabel | "insufficient_data" = canonicalLabel || "insufficient_data";
    let suitabilityScore = canonicalScore;

    // Check Signal Stability Gate
    const stability = await signalStabilityService
      .getStability({
        assetId,
        signalId,
        date: asOf,
        universeId: resolvedUniverseId,
      })
      .catch(() => null);

    if (stability && !stability.actionableThresholdMet) {
      adjustedLabel = "insufficient_data";
      suitabilityScore = null;
      warnings.push(`신호 불안정성 차단: ${stability.warnings.join(", ")}`);
    }

    if (!snapshot) {
      adjustedLabel = "insufficient_data";
      suitabilityScore = null;
      warnings.push("레짐 판단 데이터 부족");
    } else {
      const regime = snapshot.regime;

      if (regime === "panic") {
        suitabilityScore = null;
        adjustedLabel = "insufficient_data";
        warnings.push("레짐 패닉 상태로 인해 적합도 점수가 차단되었습니다.");
      } else if (regime === "risk_off") {
        // P0-3: Stability Gate가 이미 차단한 경우 regime이 부활시키지 않음
        // P0-2: operator precedence 수정 — 괄호 추가
        if ((canonicalLabel === "strong_watch" || canonicalLabel === "watch") && adjustedLabel !== "insufficient_data") {
          adjustedLabel = "caution";
          warnings.push("시장 리스크 오프 국면으로 인해 등급이 caution으로 감쇄되었습니다.");
        }
      } else if (regime === "insufficient_data") {
        suitabilityScore = null;
        adjustedLabel = "insufficient_data";
        warnings.push("레짐 판단 데이터 부족");
      }
    }

    return {
      assetId,
      symbol,
      date: asOf,
      signalId,
      suitabilityScore,
      originalLabel: canonicalLabel || "insufficient_data",
      adjustedLabel,
      regimeGate: gateComponent,
      warnings,
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const strategySuitabilityService = new StrategySuitabilityService();

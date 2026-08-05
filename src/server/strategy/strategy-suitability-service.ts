import { StrategyAgreementLabel } from "@/domain/strategy/strategy-agreement-signal";
import { StrategySuitability, RegimeGateComponent } from "@/domain/strategy/strategy-suitability";
import { regimeStore } from "../regime/regime-store";
import { signalStabilityService, getAssetsOfUniverse } from "../signals/signal-stability-service";
import { getSignalHistory } from "../signals/signal-history-store";

function isStrategyAgreementSignal(sig: any): sig is { agreementLabel: StrategyAgreementLabel; agreementScore: number | null } {
  if (!sig || typeof sig !== "object") return false;
  return "agreementLabel" in sig && "agreementScore" in sig;
}

export class StrategySuitabilityService {
  async calculateSuitability(
    assetId: string,
    symbol: string,
    signalId: string,
    asOf: string,
    universeId?: string
  ): Promise<StrategySuitability> {
    // Determine market based on symbol prefix or pattern
    const isKr = symbol.startsWith("KR:") || /^\d{6}$/.test(symbol) || assetId.startsWith("KR:");
    const market = isKr ? "KR" : "US";

    const warnings: string[] = [];

    // Item 3: universeId is mandatory, no auto fallback
    if (!universeId) {
      return {
        assetId,
        symbol,
        date: asOf,
        signalId,
        suitabilityScore: null,
        originalLabel: "insufficient_data",
        adjustedLabel: "insufficient_data",
        regimeGate: {
          market,
          regime: "insufficient_data",
          allowsNewWatch: false,
          allowsRiskUpgrading: false,
          confidence: "low",
          warning: "universeId is required.",
        },
        warnings: ["universe_id_required"],
        calculatedAt: new Date().toISOString(),
      };
    }

    // Validate universeId is known
    const universeAssets = getAssetsOfUniverse(universeId);
    if (!universeAssets) {
      return {
        assetId,
        symbol,
        date: asOf,
        signalId,
        suitabilityScore: null,
        originalLabel: "insufficient_data",
        adjustedLabel: "insufficient_data",
        regimeGate: {
          market,
          regime: "insufficient_data",
          allowsNewWatch: false,
          allowsRiskUpgrading: false,
          confidence: "low",
          warning: "unknown_universe_id",
        },
        warnings: ["unknown_universe_id"],
        calculatedAt: new Date().toISOString(),
      };
    }

    // Query canonical original label/score from signal history store first
    let historyLoadFailed = false;
    let historyRecords: Awaited<ReturnType<typeof getSignalHistory>> = [];
    try {
      historyRecords = await getSignalHistory();
    } catch {
      historyLoadFailed = true;
      warnings.push("signal_history_load_failed");
    }
    
    function extractSignalId(sig: unknown): string {
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

    const matchedRecord = historyRecords.find(
      (r) =>
        r.assetId === assetId &&
        extractSignalId(r.signal) === signalId &&
        r.date === asOf
    );

    let canonicalLabel: StrategyAgreementLabel = "insufficient_data";
    let canonicalScore: number | null = null;

    if (matchedRecord && isStrategyAgreementSignal(matchedRecord.signal)) {
      canonicalLabel = matchedRecord.signal.agreementLabel;
      canonicalScore = matchedRecord.signal.agreementScore;
    } else if (historyLoadFailed) {
      warnings.push("canonical_lookup_unavailable");
    } else {
      warnings.push("canonical_strategy_agreement_source_missing");
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

    let adjustedLabel: StrategyAgreementLabel | "insufficient_data" = canonicalLabel;
    let suitabilityScore = canonicalScore;

    // Check Signal Stability Gate
    const stability = await signalStabilityService
      .getStability({
        assetId,
        signalId,
        date: asOf,
        universeId,
      })
      .catch(() => null);

    if (!stability) {
      adjustedLabel = "insufficient_data";
      suitabilityScore = null;
      warnings.push("안정성 평가 데이터가 부족합니다.");
    } else {
      if (stability.status === "insufficient_data") {
        adjustedLabel = "insufficient_data";
        suitabilityScore = null;
        warnings.push(`신호 데이터 부족 차단: ${stability.warnings.join(", ")}`);
      } else if (stability.status === "blocked") {
        // Blocked is not converted to insufficient_data. Maps to caution or risk.
        if (stability.warnings.includes("signal_flip_count_high")) {
          adjustedLabel = "risk";
          suitabilityScore = suitabilityScore !== null ? Math.min(suitabilityScore, 30) : null;
          warnings.push("신호 반전 빈도 임계치 초과로 인해 등급이 risk로 강제 하향 조정되었습니다.");
        } else if (stability.warnings.includes("rank_autocorrelation_low")) {
          adjustedLabel = "caution";
          suitabilityScore = suitabilityScore !== null ? Math.min(suitabilityScore, 50) : null;
          warnings.push("순위 자기상관 계수 기준치 미달로 인해 등급이 caution으로 감쇄되었습니다.");
        } else {
          adjustedLabel = "caution";
          suitabilityScore = suitabilityScore !== null ? Math.min(suitabilityScore, 50) : null;
          warnings.push(`신호 불안정성 경고로 인해 등급이 caution으로 감쇄되었습니다: ${stability.warnings.join(", ")}`);
        }
      }
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
        // Stability Gate가 이미 차단 또는 하향 조정한 상태면 risk_off가 이를 부활시키지 않음
        if ((canonicalLabel === "strong_watch" || canonicalLabel === "watch") && adjustedLabel !== "insufficient_data" && adjustedLabel !== "risk" && adjustedLabel !== "caution") {
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
      originalLabel: canonicalLabel,
      adjustedLabel,
      regimeGate: gateComponent,
      warnings,
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const strategySuitabilityService = new StrategySuitabilityService();

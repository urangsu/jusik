import { StrategyAgreementLabel } from "@/domain/strategy/strategy-agreement-signal";
import { RegimeSnapshot } from "@/domain/regime/regime-snapshot";
import { StrategySuitability, RegimeGateComponent } from "@/domain/strategy/strategy-suitability";
import { regimeStore } from "../regime/regime-store";

export class StrategySuitabilityService {
  async calculateSuitability(
    assetId: string,
    symbol: string,
    originalLabel: StrategyAgreementLabel,
    originalScore: number | null
  ): Promise<StrategySuitability> {
    // Determine market based on symbol prefix or pattern
    const isKr = symbol.startsWith("KR:") || /^\d{6}$/.test(symbol) || assetId.startsWith("KR:");
    const market = isKr ? "KR" : "US";
    const snapshot = await regimeStore.getLatestSnapshot(market);

    const warnings: string[] = [];

    const gateComponent: RegimeGateComponent = {
      market,
      regime: snapshot?.regime || "insufficient_data",
      allowsNewWatch: snapshot?.gates.allowsNewWatch ?? true,
      allowsRiskUpgrading: snapshot?.gates.allowsRiskUpgrading ?? true,
      confidence: snapshot?.confidence || "low",
      warning: snapshot?.warnings.join("; ") || null,
    };

    let adjustedLabel: StrategyAgreementLabel | "insufficient_data" = originalLabel;
    let suitabilityScore = originalScore;

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
        if (originalLabel === "strong_watch" || originalLabel === "watch") {
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
      date: new Date().toISOString().slice(0, 10),
      suitabilityScore,
      originalLabel,
      adjustedLabel,
      regimeGate: gateComponent,
      warnings,
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const strategySuitabilityService = new StrategySuitabilityService();

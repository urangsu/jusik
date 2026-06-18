import { RegimeSnapshot } from "@/domain/regime/regime-snapshot";
import { MarketRegime } from "@/domain/regime/market-regime";
import { regimeStore } from "./regime-store";

export type RegimeGateDecision = {
  allowsNewWatch: boolean;
  allowsRiskUpgrading: boolean;
  suppressesMomentumAlert: boolean;
  reason: string;
};

export class RegimeGate {
  async getDecision(market: "US" | "KR"): Promise<RegimeGateDecision> {
    const snapshot = await regimeStore.getLatestSnapshot(market);
    if (!snapshot) {
      return {
        allowsNewWatch: true,
        allowsRiskUpgrading: true,
        suppressesMomentumAlert: false,
        reason: "최근 레짐 스냅샷을 찾을 수 없어 기본 규칙(허용)이 적용되었습니다.",
      };
    }

    const reason = snapshot.warnings.join("; ") || `레짐 등급: ${snapshot.regime}`;
    return {
      allowsNewWatch: snapshot.gates.allowsNewWatch,
      allowsRiskUpgrading: snapshot.gates.allowsRiskUpgrading,
      suppressesMomentumAlert: snapshot.gates.suppressesMomentumAlert,
      reason,
    };
  }
}

export const regimeGate = new RegimeGate();

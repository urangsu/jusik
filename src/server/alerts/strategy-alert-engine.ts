import { StrategyScoreChangeCondition } from "@/domain/alerts/alert-condition";

export type StrategyAlertEvaluation = {
  triggered: boolean;
  strategyId?: string;
  score?: number;
  previousScore?: number;
  scoreChange?: number;
  source?: string;
  sourceTier?: string;
  dataStatus?: string;
  warnings?: string[];
};

export class StrategyAlertEngine {
  async evaluate(params: {
    symbol: string;
    condition: StrategyScoreChangeCondition;
  }): Promise<StrategyAlertEvaluation[]> {
    void params;
    // Skeleton: strategy score changes not integrated in WO 005
    return [];
  }
}

export const strategyAlertEngine = new StrategyAlertEngine();

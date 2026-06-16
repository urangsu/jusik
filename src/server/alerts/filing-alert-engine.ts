import { FilingCondition } from "@/domain/alerts/alert-condition";

export type FilingAlertEvaluation = {
  triggered: boolean;
  assetId?: string;
  symbol?: string;
  title?: string;
  body?: string;
  date?: string;
  source?: string;
  sourceTier?: string;
  dataStatus?: string;
  warnings?: string[];
};

export class FilingAlertEngine {
  async evaluate(params: {
    symbol: string;
    condition: FilingCondition;
  }): Promise<FilingAlertEvaluation[]> {
    void params;
    // Skeleton: filing API not integrated in WO 005
    return [];
  }
}

export const filingAlertEngine = new FilingAlertEngine();

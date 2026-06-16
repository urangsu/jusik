import { DailyReportSection } from "./report-section";
import { DailyReportIntegrityResult } from "./report-integrity";

export type DailyReportStatus =
  | "generated"
  | "partial"
  | "skipped_non_trading_day"
  | "failed_integrity_check"
  | "failed";

export type DailyReportCostSummary = {
  apiCalls: number;
  apiCost: number;
  llmCalls: number;
  llmCost: number;
  runtimeMinutes: number;
};

export type DailyReport = {
  id: string;
  reportDate: string;
  locale: "ko" | "en";
  status: DailyReportStatus;

  generatedAt: string;
  marketDate: string | null;

  sections: DailyReportSection[];

  sourceSummary: {
    providerId: string;
    status: string;
    sourceTier: string;
    warnings: string[];
    updatedAt: string | null;
  }[];

  alertEventIds: string[];
  dataQualityWarnings: string[];
  costSummary: DailyReportCostSummary;

  integrity: DailyReportIntegrityResult;
};

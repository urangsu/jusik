export type DailyReportIntegrityResult = {
  passed: boolean;
  checkedAt: string;
  errors: string[];
  warnings: string[];
};

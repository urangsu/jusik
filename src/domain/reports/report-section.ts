export type DailyReportSection = {
  id: string;
  title: string;
  content: string;
  order: number;
  skipped?: boolean;
  skipReason?: string;
};

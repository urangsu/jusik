import { DailyReport } from "@/domain/reports/daily-report";
import { JsonFileStore } from "../storage/json-file-store";

export class DailyReportStore {
  private store: JsonFileStore<DailyReport[]>;

  constructor() {
    this.store = new JsonFileStore<DailyReport[]>("data/reports/reports.json", []);
  }

  async getReports(): Promise<DailyReport[]> {
    return this.store.read();
  }

  async addReport(report: DailyReport): Promise<void> {
    const reports = await this.getReports();
    // Overwrite if same reportDate already exists to prevent duplicate dates
    const index = reports.findIndex((r) => r.reportDate === report.reportDate);
    if (index !== -1) {
      reports[index] = report;
    } else {
      reports.push(report);
    }
    await this.store.write(reports);
  }

  async prune(retentionDays = 180): Promise<number> {
    const reports = await this.getReports();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const initialCount = reports.length;
    const filtered = reports.filter((r) => new Date(r.generatedAt).getTime() >= cutoff);
    const prunedCount = initialCount - filtered.length;
    if (prunedCount > 0) {
      await this.store.write(filtered);
      console.log(`[DailyReportStore] Pruned ${prunedCount} old daily reports.`);
    }
    return prunedCount;
  }
}

export const dailyReportStore = new DailyReportStore();

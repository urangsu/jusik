import fs from "fs/promises";
import type { RealProviderSmokeReport } from "@/domain/ops/real-provider-smoke";
import { writeAtomic } from "@/server/storage/atomic-write";
import {
  getRealProviderSmokeHistoryDir,
  getRealProviderSmokeHistoryPath,
  getRealProviderSmokeLatestPath,
} from "./real-provider-smoke-store-paths";

export async function saveRealProviderSmokeReport(report: RealProviderSmokeReport): Promise<void> {
  const json = JSON.stringify(report, null, 2);
  await writeAtomic(getRealProviderSmokeLatestPath(), json);
  await writeAtomic(getRealProviderSmokeHistoryPath(report.id), json);
}

export async function getLatestRealProviderSmokeReport(): Promise<RealProviderSmokeReport | null> {
  try {
    const raw = await fs.readFile(getRealProviderSmokeLatestPath(), "utf8");
    return JSON.parse(raw) as RealProviderSmokeReport;
  } catch {
    return null;
  }
}

export async function listRealProviderSmokeReports(): Promise<RealProviderSmokeReport[]> {
  try {
    const files = await fs.readdir(getRealProviderSmokeHistoryDir());
    const reports: RealProviderSmokeReport[] = [];

    for (const file of files.filter((name) => name.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(getRealProviderSmokeHistoryPath(file.replace(/\.json$/, "")), "utf8");
        reports.push(JSON.parse(raw) as RealProviderSmokeReport);
      } catch {
        // Ignore unreadable historical reports.
      }
    }

    return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

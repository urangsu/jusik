import fs from "fs/promises";
import type { OperationalSmokeReport } from "@/domain/ops/operational-smoke";
import { writeAtomic } from "@/server/storage/atomic-write";
import {
  getOpsSmokeLatestPath,
  getOpsSmokeHistoryPath,
  getOpsSmokeHistoryDir,
} from "./operational-smoke-store-paths";

/**
 * Saves the operational smoke report to:
 *   data/ops/smoke/latest.json
 *   data/ops/smoke/history/<reportId>.json
 */
export async function saveOperationalSmokeReport(
  report: OperationalSmokeReport
): Promise<void> {
  const json = JSON.stringify(report, null, 2);
  await writeAtomic(getOpsSmokeLatestPath(), json);
  await writeAtomic(getOpsSmokeHistoryPath(report.id), json);
}

/**
 * Returns the latest operational smoke report, or null if none exists.
 */
export async function getLatestOperationalSmokeReport(): Promise<OperationalSmokeReport | null> {
  try {
    const raw = await fs.readFile(getOpsSmokeLatestPath(), "utf8");
    return JSON.parse(raw) as OperationalSmokeReport;
  } catch {
    return null;
  }
}

/**
 * Lists all historical operational smoke reports, most recent first.
 */
export async function listOperationalSmokeReports(): Promise<OperationalSmokeReport[]> {
  try {
    const dir = getOpsSmokeHistoryDir();
    const files = await fs.readdir(dir);
    const reports: OperationalSmokeReport[] = [];

    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(`${dir}/${file}`, "utf8");
        reports.push(JSON.parse(raw) as OperationalSmokeReport);
      } catch {
        // Skip unreadable files
      }
    }

    // Sort most recent first by createdAt
    return reports.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  } catch {
    return [];
  }
}

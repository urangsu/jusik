import fs from "fs/promises";
import path from "path";
import { resolveRuntimeDataPath } from "../storage/runtime-store-root";
import { writeAtomic } from "../storage/atomic-write";
import type { FindingSynthesisReport } from "@/domain/report/report-section";

function getSynthesisDir(): string {
  return resolveRuntimeDataPath("data", "reports", "synthesis");
}

function getSynthesisPath(id: string): string {
  return resolveRuntimeDataPath("data", "reports", "synthesis", `${id}.json`);
}

export async function saveFindingSynthesisReport(report: FindingSynthesisReport): Promise<void> {
  const dir = getSynthesisDir();
  await fs.mkdir(dir, { recursive: true });

  const filePath = getSynthesisPath(report.id);
  const payload = JSON.stringify(report, null, 2);

  await writeAtomic(filePath, payload);
}

export async function getFindingSynthesisReport(id: string): Promise<FindingSynthesisReport | null> {
  const filePath = getSynthesisPath(id);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as FindingSynthesisReport;
  } catch {
    return null;
  }
}

export async function listFindingSynthesisReports(query?: {
  subjectId?: string;
  subjectType?: string;
}): Promise<FindingSynthesisReport[]> {
  const dir = getSynthesisDir();
  try {
    const files = await fs.readdir(dir);
    const reports: FindingSynthesisReport[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(dir, file);
        try {
          const data = await fs.readFile(filePath, "utf-8");
          const report = JSON.parse(data) as FindingSynthesisReport;

          let matches = true;
          if (query?.subjectId && report.subjectId !== query.subjectId) {
            matches = false;
          }
          if (query?.subjectType && report.subjectType !== query.subjectType) {
            matches = false;
          }

          if (matches) {
            reports.push(report);
          }
        } catch {
          // ignore
        }
      }
    }

    return reports;
  } catch {
    return [];
  }
}

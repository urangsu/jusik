import fs from "fs/promises";
import path from "path";
import { resolveRuntimeDataPath } from "../storage/runtime-store-root";
import { writeAtomic } from "../storage/atomic-write";
import type { DiagnosticDebateReport } from "@/domain/debate/diagnostic-debate";

function getDebateDir(): string {
  return resolveRuntimeDataPath("data", "debates");
}

function getDebatePath(id: string): string {
  return resolveRuntimeDataPath("data", "debates", `${id}.json`);
}

export async function saveDiagnosticDebate(debate: DiagnosticDebateReport): Promise<void> {
  const dir = getDebateDir();
  await fs.mkdir(dir, { recursive: true });

  const filePath = getDebatePath(debate.id);
  const payload = JSON.stringify(debate, null, 2);

  await writeAtomic(filePath, payload);
}

export async function getDiagnosticDebate(id: string): Promise<DiagnosticDebateReport | null> {
  const filePath = getDebatePath(id);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as DiagnosticDebateReport;
  } catch {
    return null;
  }
}

export async function listDiagnosticDebates(query?: {
  subjectId?: string;
  subjectType?: string;
}): Promise<DiagnosticDebateReport[]> {
  const dir = getDebateDir();
  try {
    const files = await fs.readdir(dir);
    const debates: DiagnosticDebateReport[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(dir, file);
        try {
          const data = await fs.readFile(filePath, "utf-8");
          const debate = JSON.parse(data) as DiagnosticDebateReport;

          let matches = true;
          if (query?.subjectId && debate.subjectId !== query.subjectId) {
            matches = false;
          }
          if (query?.subjectType && debate.subjectType !== query.subjectType) {
            matches = false;
          }

          if (matches) {
            debates.push(debate);
          }
        } catch {
          // ignore
        }
      }
    }

    return debates;
  } catch {
    return [];
  }
}

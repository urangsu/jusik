import fs from "fs/promises";
import path from "path";
import { resolveRuntimeDataPath } from "../storage/runtime-store-root";
import { writeAtomic } from "../storage/atomic-write";
import type { SurgeCandidate } from "@/domain/surge/surge-candidate";

function getSurgeDir(): string {
  return resolveRuntimeDataPath("data", "surge");
}

function getSurgePath(id: string): string {
  return resolveRuntimeDataPath("data", "surge", `${id}.json`);
}

export async function saveSurgeCandidate(candidate: SurgeCandidate): Promise<void> {
  const dir = getSurgeDir();
  await fs.mkdir(dir, { recursive: true });

  const filePath = getSurgePath(candidate.id);
  const payload = JSON.stringify(candidate, null, 2);

  await writeAtomic(filePath, payload);
}

export async function getSurgeCandidate(id: string): Promise<SurgeCandidate | null> {
  const filePath = getSurgePath(id);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as SurgeCandidate;
  } catch {
    return null;
  }
}

export async function listSurgeCandidates(query?: {
  market?: "KR" | "US";
  status?: string;
}): Promise<SurgeCandidate[]> {
  const dir = getSurgeDir();
  try {
    const files = await fs.readdir(dir);
    const candidates: SurgeCandidate[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(dir, file);
        try {
          const data = await fs.readFile(filePath, "utf-8");
          const candidate = JSON.parse(data) as SurgeCandidate;

          let matches = true;
          if (query?.market && candidate.market !== query.market) {
            matches = false;
          }
          if (query?.status && candidate.status !== query.status) {
            matches = false;
          }

          if (matches) {
            candidates.push(candidate);
          }
        } catch {
          // ignore
        }
      }
    }

    return candidates;
  } catch {
    return [];
  }
}

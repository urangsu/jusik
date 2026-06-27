import fs from "fs/promises";
import path from "path";
import { writeAtomic } from "../storage/atomic-write";
import {
  getEvidencePackDir,
  getEvidencePackPath,
  getEvidencePackHistoryDir,
  getEvidencePackHistoryPath,
} from "./evidence-pack-store-paths";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";

export async function saveEvidencePack(pack: EvidencePack): Promise<void> {
  const dir = getEvidencePackDir();
  await fs.mkdir(dir, { recursive: true });

  const historyDir = getEvidencePackHistoryDir();
  await fs.mkdir(historyDir, { recursive: true });

  const mainPath = getEvidencePackPath(pack.id);
  const historyPath = getEvidencePackHistoryPath(pack.id);

  const payload = JSON.stringify(pack, null, 2);

  // Write atomically
  await writeAtomic(mainPath, payload);
  await writeAtomic(historyPath, payload);
}

export async function getEvidencePack(id: string): Promise<EvidencePack | null> {
  const mainPath = getEvidencePackPath(id);
  try {
    const data = await fs.readFile(mainPath, "utf-8");
    return JSON.parse(data) as EvidencePack;
  } catch {
    return null;
  }
}

export async function listEvidencePacks(query?: {
  subjectType?: string;
  subjectId?: string;
}): Promise<EvidencePack[]> {
  const dir = getEvidencePackDir();
  try {
    const files = await fs.readdir(dir);
    const packs: EvidencePack[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(dir, file);
        try {
          const data = await fs.readFile(filePath, "utf-8");
          const pack = JSON.parse(data) as EvidencePack;
          
          let matches = true;
          if (query?.subjectType && pack.subjectType !== query.subjectType) {
            matches = false;
          }
          if (query?.subjectId && pack.subjectId !== query.subjectId) {
            matches = false;
          }

          if (matches) {
            packs.push(pack);
          }
        } catch {
          // ignore corrupted/parsing errors
        }
      }
    }

    return packs;
  } catch {
    return [];
  }
}

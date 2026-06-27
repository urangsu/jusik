import { resolveRuntimeDataPath } from "../storage/runtime-store-root";

export function getEvidencePackDir(): string {
  return resolveRuntimeDataPath("data", "evidence");
}

export function getEvidencePackPath(id: string): string {
  return resolveRuntimeDataPath("data", "evidence", `${id}.json`);
}

export function getEvidencePackHistoryDir(): string {
  return resolveRuntimeDataPath("data", "evidence", "history");
}

export function getEvidencePackHistoryPath(id: string): string {
  return resolveRuntimeDataPath("data", "evidence", "history", `${id}.json`);
}

import { resolveRuntimeDataPath } from "../storage/runtime-store-root";

export function getOpsSmokeDir(): string {
  return resolveRuntimeDataPath("data", "ops", "smoke");
}

export function getOpsSmokeLatestPath(): string {
  return resolveRuntimeDataPath("data", "ops", "smoke", "latest.json");
}

export function getOpsSmokeHistoryDir(): string {
  return resolveRuntimeDataPath("data", "ops", "smoke", "history");
}

export function getOpsSmokeHistoryPath(reportId: string): string {
  return resolveRuntimeDataPath("data", "ops", "smoke", "history", `${reportId}.json`);
}

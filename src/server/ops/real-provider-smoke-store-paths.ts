import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";

export function getRealProviderSmokeLatestPath(): string {
  return resolveRuntimeDataPath("data", "ops", "real-provider-smoke", "latest.json");
}

export function getRealProviderSmokeHistoryDir(): string {
  return resolveRuntimeDataPath("data", "ops", "real-provider-smoke", "history");
}

export function getRealProviderSmokeHistoryPath(reportId: string): string {
  return resolveRuntimeDataPath("data", "ops", "real-provider-smoke", "history", `${reportId}.json`);
}

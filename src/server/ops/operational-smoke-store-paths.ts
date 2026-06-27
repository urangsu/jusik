import path from "path";

export function getOpsSmokeDir(): string {
  return path.join(process.cwd(), "data", "ops", "smoke");
}

export function getOpsSmokeLatestPath(): string {
  return path.join(getOpsSmokeDir(), "latest.json");
}

export function getOpsSmokeHistoryDir(): string {
  return path.join(getOpsSmokeDir(), "history");
}

export function getOpsSmokeHistoryPath(reportId: string): string {
  return path.join(getOpsSmokeHistoryDir(), `${reportId}.json`);
}

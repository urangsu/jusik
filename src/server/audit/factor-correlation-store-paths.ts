import path from "path";

export function getFactorCorrelationDir(): string {
  return path.join(process.cwd(), "data", "audits", "factor-correlation");
}

export function getFactorCorrelationLatestPath(): string {
  return path.join(getFactorCorrelationDir(), "latest.json");
}

export function getFactorCorrelationHistoryDir(): string {
  return path.join(getFactorCorrelationDir(), "history");
}

export function getFactorCorrelationHistoryPath(timestamp: string): string {
  return path.join(getFactorCorrelationHistoryDir(), `${timestamp}.json`);
}

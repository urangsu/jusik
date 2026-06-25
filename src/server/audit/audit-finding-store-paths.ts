import path from "path";

export function getAuditFindingsDir(): string {
  return path.join(process.cwd(), "data", "audits", "findings");
}

export function getAuditFindingsLatestPath(): string {
  return path.join(getAuditFindingsDir(), "latest.json");
}

export function getAuditFindingsHistoryDir(): string {
  return path.join(getAuditFindingsDir(), "history");
}

export function getAuditFindingsHistoryPath(timestamp: string): string {
  return path.join(getAuditFindingsHistoryDir(), `${timestamp}.json`);
}

export function getAuditFindingsBySourceDir(): string {
  return path.join(getAuditFindingsDir(), "by-source");
}

export function getAuditFindingsBySourcePath(sourceType: string): string {
  return path.join(getAuditFindingsBySourceDir(), `${sourceType}.json`);
}

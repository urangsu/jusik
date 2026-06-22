import path from "path";

export function getIndividualSignalIcDir(): string {
  return path.join(process.cwd(), "data", "audits", "individual-signal-ic");
}

export function getIndividualSignalIcLatestPath(): string {
  return path.join(getIndividualSignalIcDir(), "latest.json");
}

export function getIndividualSignalIcHistoryDir(): string {
  return path.join(getIndividualSignalIcDir(), "history");
}

export function getIndividualSignalIcHistoryPath(timestamp: string): string {
  return path.join(getIndividualSignalIcHistoryDir(), `${timestamp}.json`);
}

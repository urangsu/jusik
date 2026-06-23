import path from "path";

export function getWatchlistReportsLatestPath(): string {
  return path.join(process.cwd(), "data", "watchlist-reports", "latest.json");
}

export function getWatchlistReportsEventsPath(): string {
  return path.join(process.cwd(), "data", "watchlist-reports", "events.json");
}

export function getWatchlistReportByIdPath(id: string): string {
  return path.join(process.cwd(), "data", "watchlist-reports", "by-id", `${id}.json`);
}

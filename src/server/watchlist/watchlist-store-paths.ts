import path from "path";

export function getWatchlistItemsPath(): string {
  return path.join(process.cwd(), "data", "watchlist", "items.json");
}

export function getWatchlistEventsPath(): string {
  return path.join(process.cwd(), "data", "watchlist", "events.json");
}

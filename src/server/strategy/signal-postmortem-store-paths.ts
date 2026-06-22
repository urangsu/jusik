import path from "path";
import { getDataDir } from "../storage/storage-paths";

export function getSignalPostmortemsDir(): string {
  return path.join(getDataDir(), "signal-postmortems");
}

export function getSignalPostmortemsEventsPath(): string {
  return path.join(getSignalPostmortemsDir(), "events.json");
}

export function getSignalPostmortemsLatestPath(): string {
  return path.join(getSignalPostmortemsDir(), "latest.json");
}

export function getSignalPostmortemByIdPath(id: string): string {
  return path.join(getSignalPostmortemsDir(), "by-id", `${id}.json`);
}

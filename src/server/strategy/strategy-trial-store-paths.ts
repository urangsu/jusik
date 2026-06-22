import path from "path";
import { getDataDir } from "../storage/storage-paths";

export function getStrategyTrialsDir(): string {
  return path.join(getDataDir(), "strategy-trials");
}

export function getStrategyTrialsEventsPath(): string {
  return path.join(getStrategyTrialsDir(), "events.json");
}

export function getStrategyTrialsLatestPath(): string {
  return path.join(getStrategyTrialsDir(), "latest.json");
}

export function getStrategyTrialByIdPath(id: string): string {
  return path.join(getStrategyTrialsDir(), "by-id", `${id}.json`);
}

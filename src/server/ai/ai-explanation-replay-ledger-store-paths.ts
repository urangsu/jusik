import { resolveRuntimeDataPath } from "../storage/runtime-store-root";

export function getAiExplanationReplayDir(): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-replay-ledger");
}

export function getAiExplanationReplayLatestPath(): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-replay-ledger", "latest.json");
}

export function getAiExplanationReplayHistoryDir(): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-replay-ledger", "history");
}

export function getAiExplanationReplayHistoryPath(id: string): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-replay-ledger", "history", `${id}.json`);
}

export function getAiExplanationReplayByFindingDir(): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-replay-ledger", "by-finding");
}

export function getAiExplanationReplayByFindingPath(findingId: string, id: string): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-replay-ledger", "by-finding", findingId, `${id}.json`);
}

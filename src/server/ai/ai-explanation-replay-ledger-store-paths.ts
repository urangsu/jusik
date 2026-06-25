import path from "path";

export function getAiExplanationReplayDir(): string {
  return path.join(process.cwd(), "data", "ai", "explanation-replay-ledger");
}

export function getAiExplanationReplayLatestPath(): string {
  return path.join(getAiExplanationReplayDir(), "latest.json");
}

export function getAiExplanationReplayHistoryDir(): string {
  return path.join(getAiExplanationReplayDir(), "history");
}

export function getAiExplanationReplayHistoryPath(id: string): string {
  return path.join(getAiExplanationReplayHistoryDir(), `${id}.json`);
}

export function getAiExplanationReplayByFindingDir(): string {
  return path.join(getAiExplanationReplayDir(), "by-finding");
}

export function getAiExplanationReplayByFindingPath(findingId: string, id: string): string {
  return path.join(getAiExplanationReplayByFindingDir(), findingId, `${id}.json`);
}

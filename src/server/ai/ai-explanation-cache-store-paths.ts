import path from "path";

export function getAiExplanationCacheDir(): string {
  return path.join(process.cwd(), "data", "ai", "explanation-cache");
}

export function getAiExplanationCacheByHashDir(): string {
  return path.join(getAiExplanationCacheDir(), "by-hash");
}

export function getAiExplanationCacheByHashPath(hash: string): string {
  return path.join(getAiExplanationCacheByHashDir(), `${hash}.json`);
}

export function getAiExplanationCacheLatestPath(): string {
  return path.join(getAiExplanationCacheDir(), "latest.json");
}

export function getAiExplanationCacheBlockedDir(): string {
  return path.join(getAiExplanationCacheDir(), "blocked");
}

export function getAiExplanationCacheBlockedPath(hash: string): string {
  return path.join(getAiExplanationCacheBlockedDir(), `${hash}.json`);
}

import { resolveRuntimeDataPath } from "../storage/runtime-store-root";

export function getAiExplanationCacheDir(): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-cache");
}

export function getAiExplanationCacheByHashDir(): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-cache", "by-hash");
}

export function getAiExplanationCacheByHashPath(hash: string): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-cache", "by-hash", `${hash}.json`);
}

export function getAiExplanationCacheLatestPath(): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-cache", "latest.json");
}

export function getAiExplanationCacheBlockedDir(): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-cache", "blocked");
}

export function getAiExplanationCacheBlockedPath(hash: string): string {
  return resolveRuntimeDataPath("data", "ai", "explanation-cache", "blocked", `${hash}.json`);
}

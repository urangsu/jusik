import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { DataEnvelope } from "@/domain/common/data-status";
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
import { writeAtomic } from "@/server/storage/atomic-write";

export type ProviderCacheRecord<T> = {
  cacheKey: string;
  envelope: DataEnvelope<T>;
  cachedAt: string;
};

function keyToFileName(cacheKey: string): string {
  return `${crypto.createHash("sha256").update(cacheKey).digest("hex")}.json`;
}

function cachePath(cacheKey: string): string {
  return resolveRuntimeDataPath("data", "provider-cache", keyToFileName(cacheKey));
}

function isSuccessCacheable<T>(envelope: DataEnvelope<T>): boolean {
  return envelope.value !== null && ["real_time", "delayed", "eod", "cached", "stale"].includes(envelope.status);
}

export class ProviderResponseCacheStore {
  async get<T>(cacheKey: string): Promise<ProviderCacheRecord<T> | null> {
    try {
      const raw = await fs.readFile(cachePath(cacheKey), "utf8");
      return JSON.parse(raw) as ProviderCacheRecord<T>;
    } catch {
      return null;
    }
  }

  async put<T>(cacheKey: string, envelope: DataEnvelope<T>, cachedAt = new Date().toISOString()): Promise<boolean> {
    if (!isSuccessCacheable(envelope)) return false;
    const filePath = cachePath(cacheKey);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await writeAtomic(filePath, JSON.stringify({ cacheKey, envelope, cachedAt }, null, 2));
    return true;
  }
}

export const providerResponseCacheStore = new ProviderResponseCacheStore();

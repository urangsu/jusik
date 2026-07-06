import type { DataEnvelope } from "@/domain/common/data-status";
import type { ProviderRuntimePolicy } from "@/domain/providers/provider-runtime-policy";
import { providerResponseCacheStore, ProviderResponseCacheStore } from "./provider-response-cache-store";

export type ProviderRuntimeCacheStore = Pick<ProviderResponseCacheStore, "get" | "put">;

type GateOptions<T> = {
  cacheKey: string;
  policy: ProviderRuntimePolicy;
  now?: string;
  cacheStore?: ProviderRuntimeCacheStore;
  fetcher: () => Promise<DataEnvelope<T>>;
};

import type { SourceWarning } from "@/domain/source/provider-tier";

function ageMs(cachedAt: string, now: string): number {
  return Math.max(0, new Date(now).getTime() - new Date(cachedAt).getTime());
}

function cleanWarnings(warnings: SourceWarning[]): SourceWarning[] {
  const set = new Set(warnings);
  if (set.size > 1 && set.has("none")) {
    set.delete("none");
  }
  return Array.from(set);
}

export async function runWithProviderRuntimeGate<T>(options: GateOptions<T>): Promise<DataEnvelope<T>> {
  const now = options.now ?? new Date().toISOString();
  const cacheStore = options.cacheStore ?? providerResponseCacheStore;
  const cached = await cacheStore.get<T>(options.cacheKey);

  if (cached && ageMs(cached.cachedAt, now) <= options.policy.cacheTtlMs) {
    return {
      ...cached.envelope,
      status: "cached",
      warnings: cleanWarnings(Array.from(new Set([...cached.envelope.warnings, "none"]))),
      message: cached.envelope.message ?? "Provider response cache hit.",
    };
  }

  let attempt = 0;
  let last: DataEnvelope<T> | null = null;
  while (attempt <= options.policy.maxRetries) {
    last = await options.fetcher();
    if (!options.policy.retryableStatuses.includes(last.status)) break;
    attempt += 1;
  }

  if (last?.status === "rate_limited" && options.policy.staleAllowed && cached && ageMs(cached.cachedAt, now) <= options.policy.staleTtlMs) {
    return {
      ...cached.envelope,
      status: "stale",
      warnings: cleanWarnings(Array.from(new Set([...cached.envelope.warnings, "license_review_required"]))),
      message: "Rate limited. Returning stale cached provider response.",
    };
  }

  if (last) {
    await cacheStore.put(options.cacheKey, last, now);
    return last;
  }

  return {
    value: null,
    status: "error",
    source: options.policy.providerId,
    sourceTier: "official",
    warnings: [],
    updatedAt: null,
    message: "Provider runtime gate failed before receiving a response.",
  };
}

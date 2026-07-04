import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { ProviderRuntimePolicy } from "@/domain/providers/provider-runtime-policy";
import { runWithProviderRuntimeGate } from "./provider-runtime-gate";
import { ProviderResponseCacheStore } from "./provider-response-cache-store";

const policy: ProviderRuntimePolicy = {
  providerId: "fmp_free",
  cacheTtlMs: 1_000,
  staleTtlMs: 10_000,
  maxRetries: 1,
  retryableStatuses: ["rate_limited", "error"],
  staleAllowed: true,
};

function ok(value = { price: 1 }): DataEnvelope<{ price: number }> {
  return {
    value,
    status: "real_time",
    source: "test",
    sourceTier: "free_limited",
    warnings: [],
    updatedAt: "2026-07-02T00:00:00.000Z",
  };
}

function rateLimited(): DataEnvelope<{ price: number }> {
  return {
    value: null,
    status: "rate_limited",
    source: "test",
    sourceTier: "free_limited",
    warnings: [],
    updatedAt: null,
    message: "Rate limited.",
  };
}

function errorEnvelope(): DataEnvelope<{ price: number }> {
  return {
    value: null,
    status: "error",
    source: "test",
    sourceTier: "free_limited",
    warnings: [],
    updatedAt: null,
    message: "Temporary error.",
  };
}

describe("runWithProviderRuntimeGate", () => {
  beforeEach(async () => {
    process.env.JUSIK_TEST_DATA_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), "provider-runtime-gate-"));
  });

  it("returns fresh cache without calling provider", async () => {
    const cache = new ProviderResponseCacheStore();
    await cache.put("k1", ok(), "2026-07-02T00:00:00.000Z");

    const result = await runWithProviderRuntimeGate<{ price: number }>({
      cacheKey: "k1",
      policy,
      now: "2026-07-02T00:00:00.500Z",
      cacheStore: cache,
      fetcher: async () => {
        throw new Error("should not call provider");
      },
    });

    expect(result.status).toBe("cached");
    expect(result.value?.price).toBe(1);
  });

  it("does not cache null success-shaped envelopes", async () => {
    const cache = new ProviderResponseCacheStore();
    const stored = await cache.put("bad", {
      value: null,
      status: "cached",
      source: "test",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: null,
    });

    expect(stored).toBe(false);
    await expect(cache.get("bad")).resolves.toBeNull();
  });

  it("retries retryable statuses before returning a successful response", async () => {
    const cache = new ProviderResponseCacheStore();
    let calls = 0;

    const result = await runWithProviderRuntimeGate<{ price: number }>({
      cacheKey: "retry",
      policy,
      now: "2026-07-02T00:00:00.000Z",
      cacheStore: cache,
      fetcher: async () => {
        calls += 1;
        return calls === 1 ? errorEnvelope() : ok({ price: 2 });
      },
    });

    expect(calls).toBe(2);
    expect(result.status).toBe("real_time");
    expect(result.value?.price).toBe(2);
  });

  it("returns stale cache when provider is rate limited and stale fallback is allowed", async () => {
    const cache = new ProviderResponseCacheStore();
    await cache.put("stale", ok({ price: 3 }), "2026-07-02T00:00:00.000Z");

    const result = await runWithProviderRuntimeGate<{ price: number }>({
      cacheKey: "stale",
      policy,
      now: "2026-07-02T00:00:02.000Z",
      cacheStore: cache,
      fetcher: async () => rateLimited(),
    });

    expect(result.status).toBe("stale");
    expect(result.value?.price).toBe(3);
    expect(result.warnings).toContain("license_review_required");
  });
});

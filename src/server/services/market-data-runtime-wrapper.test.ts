import { describe, expect, it } from "vitest";
import type { DataEnvelope } from "@/domain/common/data-status";
import { withMarketDataRuntimeGate } from "./market-data-runtime-wrapper";

function quoteEnvelope(status: DataEnvelope<{ price: number }>["status"]): DataEnvelope<{ price: number }> {
  return {
    value: status === "delayed" ? { price: 1 } : null,
    status,
    source: "test_provider",
    sourceTier: "free_limited",
    warnings: [],
    updatedAt: status === "delayed" ? "2026-07-05T00:00:00.000Z" : null,
  };
}

describe("withMarketDataRuntimeGate", () => {
  it("scopes cache keys by provider, market, asset, capability, range, and interval", async () => {
    const observedKeys: string[] = [];
    const result = await withMarketDataRuntimeGate({
      providerId: "fmp_free",
      market: "US",
      assetId: "US_AAPL",
      symbol: "AAPL",
      capability: "ohlcv",
      range: "1M",
      interval: "1D",
      fetcher: async () => quoteEnvelope("delayed"),
      cacheStore: {
        get: async () => null,
        put: async (key: string) => {
          observedKeys.push(key);
          return true;
        },
      },
    });

    expect(result.status).toBe("delayed");
    expect(observedKeys[0]).toContain("fmp_free");
    expect(observedKeys[0]).toContain("US_AAPL");
    expect(observedKeys[0]).toContain("ohlcv");
    expect(observedKeys[0]).toContain("1M");
    expect(observedKeys[0]).toContain("1D");
  });
});

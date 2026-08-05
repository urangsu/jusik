import { describe, it, expect, vi, beforeEach } from "vitest";
import { marketDataService } from "./market-data-service";
import { providerResponseCacheStore } from "../providers/provider-response-cache-store";
import { finnhubFreeProvider } from "../providers/finnhub-free-provider";
import { fmpFreeProvider } from "../providers/fmp-free-provider";
import { yfinancePersonalProvider } from "../providers/yfinance-personal-provider";

// Mock the providers
vi.mock("../providers/finnhub-free-provider", () => ({
  finnhubFreeProvider: {
    getQuote: vi.fn(),
  },
}));

vi.mock("../providers/fmp-free-provider", () => ({
  fmpFreeProvider: {
    getQuote: vi.fn(),
  },
}));

vi.mock("../providers/yfinance-personal-provider", () => ({
  yfinancePersonalProvider: {
    getQuote: vi.fn(),
  },
}));

// Mock the cache store
vi.mock("../providers/provider-response-cache-store", () => ({
  providerResponseCacheStore: {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(true),
  },
}));

describe("MarketDataService Cache Key Isolation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensures Finnhub response is stored with a Finnhub cache key and not FMP", async () => {
    const mockEnvelope = {
      value: { symbol: "AAPL", price: 150, change: 1.5, changePercent: 1.0, volume: 1000, updatedAt: "2026-07-05T00:00:00Z" },
      status: "real_time" as const,
      source: "finnhub",
      sourceTier: "free_limited" as const,
      warnings: [],
      updatedAt: "2026-07-05T00:00:00Z",
    };

    vi.mocked(finnhubFreeProvider.getQuote).mockResolvedValue(mockEnvelope as any);

    const result = await marketDataService.getQuoteForProvider("AAPL", "finnhub_free", "US");

    expect(result.status).toBe("real_time");
    // Verify that cache put was called with finnhub_free in key
    const putCalls = vi.mocked(providerResponseCacheStore.put).mock.calls;
    expect(putCalls.length).toBe(1);
    expect(putCalls[0][0]).toContain("finnhub_free");
    expect(putCalls[0][0]).not.toContain("fmp_free");
  });

  it("ensures yfinance fallback response is stored with yfinance cache key and not KIS", async () => {
    const mockEnvelope = {
      value: { symbol: "005930", price: 60000, change: 100, changePercent: 0.17, volume: 5000, updatedAt: "2026-07-05T00:00:00Z" },
      status: "real_time" as const,
      source: "yfinance_personal",
      sourceTier: "personal_fallback" as const,
      warnings: [],
      updatedAt: "2026-07-05T00:00:00Z",
    };

    vi.mocked(yfinancePersonalProvider.getQuote).mockResolvedValue(mockEnvelope as any);

    const result = await marketDataService.getQuoteForProvider("005930", "yfinance_personal", "KR");

    expect(result.status).toBe("real_time");
    const putCalls = vi.mocked(providerResponseCacheStore.put).mock.calls;
    expect(putCalls.length).toBe(1);
    expect(putCalls[0][0]).toContain("yfinance_personal");
    expect(putCalls[0][0]).not.toContain("kis");
  });
});

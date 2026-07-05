import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/server/services/market-data-service", () => ({
  marketDataService: {
    getOhlcv: vi.fn(),
    getOhlcvForProvider: vi.fn(),
  },
}));

vi.mock("@/server/services/market-data-runtime-wrapper", () => ({
  withMarketDataRuntimeGate: vi.fn(async ({ fetcher }) => fetcher()),
}));

import { marketDataService } from "@/server/services/market-data-service";

describe("GET /api/market/ohlcv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("denies provider override and falls back to getOhlcv when INTERNAL_SMOKE_KEY is missing", async () => {
    delete process.env.INTERNAL_SMOKE_KEY;

    vi.mocked(marketDataService.getOhlcv).mockResolvedValue({
      value: [],
      status: "real_time",
      source: "kis",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
    } as any);

    const req = new NextRequest(
      "http://localhost/api/market/ohlcv?symbol=AAPL&region=US&providerId=fmp_free",
      {
        headers: { "x-internal-smoke-key": "internal_default_key" },
      }
    );

    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(marketDataService.getOhlcv).toHaveBeenCalledWith({
      symbol: "AAPL",
      region: "US",
      range: "6M",
      interval: "1D",
    });
    expect(marketDataService.getOhlcvForProvider).not.toHaveBeenCalled();
  });

  it("denies provider override when header key is wrong", async () => {
    process.env.INTERNAL_SMOKE_KEY = "super_secret_key";

    vi.mocked(marketDataService.getOhlcv).mockResolvedValue({
      value: [],
      status: "real_time",
      source: "kis",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
    } as any);

    const req = new NextRequest(
      "http://localhost/api/market/ohlcv?symbol=AAPL&region=US&providerId=fmp_free",
      {
        headers: { "x-internal-smoke-key": "wrong_secret_key" },
      }
    );

    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(marketDataService.getOhlcv).toHaveBeenCalledWith({
      symbol: "AAPL",
      region: "US",
      range: "6M",
      interval: "1D",
    });
    expect(marketDataService.getOhlcvForProvider).not.toHaveBeenCalled();
  });

  it("allows provider override and invokes getOhlcvForProvider when header key is correct", async () => {
    process.env.INTERNAL_SMOKE_KEY = "super_secret_key";

    vi.mocked(marketDataService.getOhlcvForProvider).mockResolvedValue({
      value: [],
      status: "real_time",
      source: "fmp_free",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
    } as any);

    const req = new NextRequest(
      "http://localhost/api/market/ohlcv?symbol=AAPL&region=US&providerId=fmp_free",
      {
        headers: { "x-internal-smoke-key": "super_secret_key" },
      }
    );

    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(marketDataService.getOhlcvForProvider).toHaveBeenCalledWith({
      symbol: "AAPL",
      region: "US",
      range: "6M",
      interval: "1D",
    }, "fmp_free");
    expect(marketDataService.getOhlcv).not.toHaveBeenCalled();
  });
});

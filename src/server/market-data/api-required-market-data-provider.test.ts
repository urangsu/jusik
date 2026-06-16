import { describe, expect, it } from "vitest";
import { ApiRequiredMarketDataProvider } from "./api-required-market-data-provider";

describe("ApiRequiredMarketDataProvider", () => {
  it("returns api_required quote without fake numeric values", async () => {
    const provider = new ApiRequiredMarketDataProvider("api-required-test");
    const result = await provider.getQuote({
      assetId: "US:AAPL",
      market: "US",
      symbol: "AAPL",
    });

    expect(result.value).toBeNull();
    expect(result.status).toBe("api_required");
    expect(result.source).toBe("api-required-test");
    expect(result.updatedAt).toBeNull();
  });

  it("returns api_required OHLCV without fake candles", async () => {
    const provider = new ApiRequiredMarketDataProvider("api-required-test");
    const result = await provider.getOhlcv({
      assetId: "KR:005930",
      market: "KR",
      symbol: "005930",
      range: "1M",
      interval: "1D",
    });

    expect(result.value).toBeNull();
    expect(result.status).toBe("api_required");
    expect(result.message).toMatch(/required/i);
  });

  it("respects an already aborted request signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = new ApiRequiredMarketDataProvider("api-required-test");

    await expect(
      provider.getQuote(
        { assetId: "US:AAPL", market: "US", symbol: "AAPL" },
        { signal: controller.signal },
      ),
    ).rejects.toThrow("Market data request aborted.");
  });
});

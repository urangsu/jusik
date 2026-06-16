import { describe, expect, it } from "vitest";
import { marketDataQueryKeys } from "./market-data-query-keys";

describe("marketDataQueryKeys", () => {
  it("separates AAPL and Samsung quote keys by market and assetId", () => {
    expect(
      marketDataQueryKeys.quote({ providerId: "p1", market: "US", assetId: "US:AAPL" }),
    ).not.toEqual(
      marketDataQueryKeys.quote({ providerId: "p1", market: "KR", assetId: "KR:005930" }),
    );
  });

  it("separates OHLCV keys by range and interval", () => {
    expect(
      marketDataQueryKeys.ohlcv({ providerId: "p1", market: "US", assetId: "US:AAPL", range: "1M", interval: "1D" }),
    ).not.toEqual(
      marketDataQueryKeys.ohlcv({ providerId: "p1", market: "US", assetId: "US:AAPL", range: "1Y", interval: "1W" }),
    );
  });

  it("separates keys by providerId", () => {
    expect(
      marketDataQueryKeys.quote({ providerId: "provider-a", market: "US", assetId: "US:AAPL" }),
    ).not.toEqual(
      marketDataQueryKeys.quote({ providerId: "provider-b", market: "US", assetId: "US:AAPL" }),
    );
  });

  it("does not use display symbol in query keys", () => {
    expect(marketDataQueryKeys.quote({ providerId: "p1", market: "US", assetId: "US:AAPL" })).toEqual([
      "market-data",
      "quote",
      "p1",
      "US",
      "US:AAPL",
    ]);
  });
});

import { describe, it, expect } from "vitest";
import { ApiRequiredProvider } from "./api-required-provider";

describe("ApiRequiredProvider", () => {
  const provider = new ApiRequiredProvider("TestEnv");

  it("should return api_required for quotes", async () => {
    const res = await provider.getQuote("AAPL");
    expect(res.value).toBeNull();
    expect(res.status).toBe("api_required");
    expect(res.source).toBe("TestEnv");
  });

  it("should return api_required for filings", async () => {
    const res = await provider.getFilings({ symbol: "005930", region: "KR" });
    expect(res.value).toBeNull();
    expect(res.status).toBe("api_required");
  });

  it("should return api_required for financial statements", async () => {
    const res = await provider.getFinancialStatements({
      symbol: "AAPL",
      region: "US",
      basis: "CFS",
      period: "annual",
    });
    expect(res.value).toBeNull();
    expect(res.status).toBe("api_required");
  });
});

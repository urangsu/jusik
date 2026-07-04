import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/server/symbols/symbol-master-store", () => ({
  getSymbolMasterRecord: vi.fn(),
}));

import { getSymbolMasterRecord } from "@/server/symbols/symbol-master-store";

describe("GET /api/symbols/[assetId]", () => {
  it("returns not_found for unknown canonical asset id", async () => {
    vi.mocked(getSymbolMasterRecord).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/symbols/UNKNOWN"), {
      params: Promise.resolve({ assetId: "UNKNOWN" }),
    });
    const data = await response.json();

    expect(data.status).toBe("not_found");
    expect(data.value).toBeNull();
  });

  it("returns cached symbol detail for canonical asset id", async () => {
    vi.mocked(getSymbolMasterRecord).mockResolvedValue({
      assetId: "US_AAPL",
      symbol: "AAPL",
      market: "US",
      exchange: "NASDAQ",
      nameEn: "Apple Inc.",
      currency: "USD",
      assetType: "common_stock",
      cik: "0000320193",
      status: "active",
      source: "seed",
      updatedAt: "2026-07-02T00:00:00.000Z",
    });

    const response = await GET(new Request("http://localhost/api/symbols/US_AAPL"), {
      params: Promise.resolve({ assetId: "US_AAPL" }),
    });
    const data = await response.json();

    expect(data.status).toBe("cached");
    expect(data.value.assetId).toBe("US_AAPL");
  });
});

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/server/symbols/symbol-master-store", () => ({
  searchSymbolMaster: vi.fn(),
}));

import { searchSymbolMaster } from "@/server/symbols/symbol-master-store";

describe("GET /api/symbols/search", () => {
  it("returns cached symbol search results", async () => {
    vi.mocked(searchSymbolMaster).mockResolvedValue({
      query: "005930",
      total: 1,
      records: [
        {
          assetId: "KR_005930",
          symbol: "005930",
          market: "KR",
          exchange: "KOSPI",
          nameKo: "삼성전자",
          currency: "KRW",
          assetType: "common_stock",
          corpCode: "00126380",
          status: "active",
          source: "seed",
          updatedAt: "2026-07-02T00:00:00.000Z",
        },
      ],
    });

    const response = await GET(new NextRequest("http://localhost/api/symbols/search?q=005930"));
    const data = await response.json();

    expect(data.status).toBe("cached");
    expect(data.value.records[0].assetId).toBe("KR_005930");
    expect(searchSymbolMaster).toHaveBeenCalledWith("005930");
  });
});

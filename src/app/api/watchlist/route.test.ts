import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { addWatchlistItem, listWatchlistItems } from "@/server/watchlist/watchlist-store";

vi.mock("@/server/watchlist/watchlist-store", () => ({
  addWatchlistItem: vi.fn(),
  listWatchlistItems: vi.fn(),
}));

describe("Watchlist API - GET/POST /api/watchlist", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("GET should return list of watchlist items wrapped in DataEnvelope", async () => {
    vi.mocked(listWatchlistItems).mockResolvedValue([
      { assetId: "KR:005930", symbol: "005930" } as any,
    ]);

    const req = new NextRequest("http://localhost/api/watchlist");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.value).toHaveLength(1);
    expect(json.value[0].assetId).toBe("KR:005930");
    expect(json.status).toBe("cached");
  });

  it("POST should block requests if write is disabled", async () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "false";

    const req = new NextRequest("http://localhost/api/watchlist", {
      method: "POST",
      body: JSON.stringify({ assetId: "KR:005930", symbol: "005930", market: "KR", universeId: "KOSPI_SAMPLE" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(405);
  });

  it("POST should create watchlist item if write is enabled", async () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";

    const req = new NextRequest("http://localhost/api/watchlist", {
      method: "POST",
      body: JSON.stringify({
        assetId: "KR:005930",
        symbol: "005930",
        market: "KR",
        universeId: "KOSPI_SAMPLE",
        nameKo: "삼성전자",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.value.assetId).toBe("KR:005930");
    expect(addWatchlistItem).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "./route";
import { NextRequest } from "next/server";
import { updateWatchlistItem, removeWatchlistItem, getWatchlistItemByAssetId } from "@/server/watchlist/watchlist-store";

vi.mock("@/server/watchlist/watchlist-store", () => ({
  updateWatchlistItem: vi.fn(),
  removeWatchlistItem: vi.fn(),
  getWatchlistItemByAssetId: vi.fn(),
}));

describe("PATCH/DELETE /api/watchlist/[assetId]", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("should fail (disabled) if write is not enabled", async () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "false";

    const req = new NextRequest("http://localhost/api/watchlist/KR%3A005930", {
      method: "PATCH",
      body: JSON.stringify({ reportInboxEnabled: false }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ assetId: "KR%3A005930" }) });
    expect(res.status).toBe(405);
  });

  it("should update item when write is enabled and item exists", async () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";
    vi.mocked(getWatchlistItemByAssetId).mockResolvedValue({ assetId: "KR:005930" } as any);
    vi.mocked(updateWatchlistItem).mockResolvedValue({ assetId: "KR:005930", reportInboxEnabled: false } as any);

    const req = new NextRequest("http://localhost/api/watchlist/KR%3A005930", {
      method: "PATCH",
      body: JSON.stringify({ reportInboxEnabled: false }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ assetId: "KR%3A005930" }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.value.reportInboxEnabled).toBe(false);
    expect(updateWatchlistItem).toHaveBeenCalledWith(
      "KR:005930",
      expect.objectContaining({ reportInboxEnabled: false })
    );
  });

  it("should delete item when write is enabled and item exists", async () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";
    vi.mocked(getWatchlistItemByAssetId).mockResolvedValue({ assetId: "KR:005930" } as any);

    const req = new NextRequest("http://localhost/api/watchlist/KR%3A005930", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: Promise.resolve({ assetId: "KR%3A005930" }) });
    expect(res.status).toBe(200);
    expect(removeWatchlistItem).toHaveBeenCalledWith("KR:005930");
  });
});

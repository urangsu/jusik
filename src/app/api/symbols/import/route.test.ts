import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("@/server/symbols/symbol-master-store", () => ({
  importSymbolMasterRecords: vi.fn(),
}));

import { importSymbolMasterRecords } from "@/server/symbols/symbol-master-store";

describe("POST /api/symbols/import", () => {
  it("imports provided symbol master records through the store", async () => {
    vi.mocked(importSymbolMasterRecords).mockResolvedValue({ imported: 1 });

    const response = await POST(
      new NextRequest("http://localhost/api/symbols/import", {
        method: "POST",
        body: JSON.stringify({
          records: [
            {
              assetId: "KR_TEST",
              symbol: "000001",
              market: "KR",
              exchange: "KOSPI",
              currency: "KRW",
              assetType: "common_stock",
              status: "active",
              source: "manual_import",
              updatedAt: "2026-07-02T00:00:00.000Z",
            },
          ],
        }),
        headers: { "content-type": "application/json" },
      }),
    );
    const data = await response.json();

    expect(data.status).toBe("cached");
    expect(data.value.imported).toBe(1);
    expect(importSymbolMasterRecords).toHaveBeenCalledWith([
      expect.objectContaining({ assetId: "KR_TEST" }),
    ]);
  });
});

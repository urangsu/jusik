import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import type { MarketBackfillReport } from "@/domain/market/market-data-backfill";

vi.mock("@/server/market-data/market-data-backfill-runner", () => ({
  runMarketDataBackfill: vi.fn(),
}));

import { runMarketDataBackfill } from "@/server/market-data/market-data-backfill-runner";

function makeReport(overrides: Partial<MarketBackfillReport> = {}): MarketBackfillReport {
  return {
    id: "market_backfill_test",
    request: {
      universe: "SP500_SAMPLE",
      capability: "ohlcv",
      range: "1M",
      interval: "1D",
    },
    status: "partial",
    totalCount: 3,
    dataAvailableCount: 0,
    apiRequiredCount: 3,
    errorCount: 0,
    results: [],
    generatedDataRoot: "/tmp/jusik-test",
    createdAt: "2026-07-02T00:00:00.000Z",
    engineVersion: "market-backfill-v1",
    ...overrides,
  };
}

describe("POST /api/market/backfill/run", () => {
  it("returns cached envelope for partial api-required backfill reports", async () => {
    vi.mocked(runMarketDataBackfill).mockResolvedValue(makeReport());

    const response = await POST(
      new NextRequest("http://localhost/api/market/backfill/run", {
        method: "POST",
        body: JSON.stringify({ universe: "SP500_SAMPLE", capability: "ohlcv", range: "1M" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.apiRequiredCount).toBe(3);
    expect(runMarketDataBackfill).toHaveBeenCalledWith({
      universe: "SP500_SAMPLE",
      capability: "ohlcv",
      range: "1M",
      interval: "1D",
    });
  });

  it("returns error envelope when report failed", async () => {
    vi.mocked(runMarketDataBackfill).mockResolvedValue(makeReport({ status: "failed", errorCount: 3 }));

    const response = await POST(
      new NextRequest("http://localhost/api/market/backfill/run", {
        method: "POST",
        body: JSON.stringify({ universe: "KOSPI_SAMPLE", capability: "quote" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const data = await response.json();

    expect(data.status).toBe("error");
    expect(data.value.errorCount).toBe(3);
  });
});

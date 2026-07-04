import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import type { MarketBackfillReport } from "@/domain/market/market-data-backfill";

vi.mock("@/server/market-data/market-data-backfill-store", () => ({
  getLatestMarketBackfillReport: vi.fn(),
}));

import { getLatestMarketBackfillReport } from "@/server/market-data/market-data-backfill-store";

function makeReport(overrides: Partial<MarketBackfillReport> = {}): MarketBackfillReport {
  return {
    id: "latest_market_backfill",
    request: {
      universe: "SP500_SAMPLE",
      capability: "quote",
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

describe("GET /api/market/backfill/latest", () => {
  it("returns not_found when no report exists", async () => {
    vi.mocked(getLatestMarketBackfillReport).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe("not_found");
    expect(data.value).toBeNull();
  });

  it("returns cached latest report when it exists", async () => {
    vi.mocked(getLatestMarketBackfillReport).mockResolvedValue(makeReport());

    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe("cached");
    expect(data.value.id).toBe("latest_market_backfill");
  });
});

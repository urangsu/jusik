import { describe, expect, it } from "vitest";
import { crossSectionalNormalize } from "./cross-sectional-normalize";
import { UniverseSnapshot } from "@/domain/universe/universe-snapshot";

const krSnapshot: UniverseSnapshot = {
  universeId: "KR_KOSPI200",
  asOfDate: "2026-06-16",
  assetIds: ["KR:005930", "A", "B", "C"],
  dataVersionId: "dv-kr",
  generatedAt: "2026-06-16T00:00:00.000Z",
};

const usSnapshot: UniverseSnapshot = {
  universeId: "US_SP500",
  asOfDate: "2026-06-16",
  assetIds: ["A", "B", "C", "D"],
  dataVersionId: "dv-us",
  generatedAt: "2026-06-16T00:00:00.000Z",
};

describe("crossSectionalNormalize", () => {
  it("rejects mixed KR and US inputs", () => {
    const output = crossSectionalNormalize({
      observations: [
        { assetId: "KR:005930", market: "KR", universe: "KOSPI200", value: 1 },
        { assetId: "US:AAPL", market: "US", universe: "SP500", value: 2 },
      ],
      method: "rank_percentile",
      universeSnapshot: {
        universeId: "USER_WATCHLIST",
        asOfDate: "2026-06-16",
        assetIds: ["KR:005930", "US:AAPL"],
        dataVersionId: "dv-mixed",
        generatedAt: "2026-06-16T00:00:00.000Z",
      },
    });

    expect(output.status).toBe("not_supported");
    expect(output.value).toBeNull();
  });

  it("normalizes within one market and universe without converting null to zero", () => {
    const output = crossSectionalNormalize({
      observations: [
        { assetId: "A", market: "KR", universe: "KOSPI200", value: 10 },
        { assetId: "B", market: "KR", universe: "KOSPI200", value: null },
        { assetId: "C", market: "KR", universe: "KOSPI200", value: 30 },
      ],
      method: "rank_percentile",
      universeSnapshot: krSnapshot,
    });

    expect(output.status).toBe("ok");
    expect(output.value).toHaveLength(3);
    expect(output.value?.find((row) => row.assetId === "B")?.normalizedValue).toBeNull();
  });

  it("preserves output shape with sector neutral mode", () => {
    const output = crossSectionalNormalize({
      observations: [
        { assetId: "A", market: "US", universe: "SP500", sector: "Tech", value: 10 },
        { assetId: "B", market: "US", universe: "SP500", sector: "Tech", value: 20 },
        { assetId: "C", market: "US", universe: "SP500", sector: "Finance", value: 30 },
        { assetId: "D", market: "US", universe: "SP500", sector: "Finance", value: 40 },
      ],
      method: "sector_neutral_zscore",
      sectorNeutral: true,
      universeSnapshot: usSnapshot,
    });

    expect(output.status).toBe("ok");
    expect(output.value).toHaveLength(4);
  });

  it("rejects normalization without a universe snapshot", () => {
    const output = crossSectionalNormalize({
      observations: [
        { assetId: "A", market: "KR", universe: "KOSPI200", value: 10 },
        { assetId: "B", market: "KR", universe: "KOSPI200", value: 20 },
      ],
      method: "rank_percentile",
    });

    expect(output.status).toBe("invalid_input");
    expect(output.value).toBeNull();
  });

  it("rejects SEED_DEMO for research normalization", () => {
    const output = crossSectionalNormalize({
      observations: [
        { assetId: "KR:005930", market: "KR", universe: "SEED_DEMO", value: 10 },
        { assetId: "US:AAPL", market: "US", universe: "SEED_DEMO", value: 20 },
      ],
      method: "rank_percentile",
      universeSnapshot: {
        universeId: "SEED_DEMO",
        asOfDate: "2026-06-16",
        assetIds: ["KR:005930", "US:AAPL"],
        dataVersionId: "dv-seed",
        generatedAt: "2026-06-16T00:00:00.000Z",
      },
    });

    expect(output.status).toBe("not_supported");
    expect(output.value).toBeNull();
  });

  it("rejects observations outside the supplied universe snapshot", () => {
    const output = crossSectionalNormalize({
      observations: [
        { assetId: "A", market: "KR", universe: "KOSPI200", value: 10 },
        { assetId: "OUTSIDE", market: "KR", universe: "KOSPI200", value: 20 },
      ],
      method: "rank_percentile",
      universeSnapshot: krSnapshot,
    });

    expect(output.status).toBe("invalid_input");
    expect(output.value).toBeNull();
  });
});

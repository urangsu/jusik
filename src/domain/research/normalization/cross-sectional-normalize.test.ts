import { describe, expect, it } from "vitest";
import { crossSectionalNormalize } from "./cross-sectional-normalize";

describe("crossSectionalNormalize", () => {
  it("rejects mixed KR and US inputs", () => {
    const output = crossSectionalNormalize({
      observations: [
        { assetId: "KR:005930", market: "KR", universe: "KOSPI200", value: 1 },
        { assetId: "US:AAPL", market: "US", universe: "SP500", value: 2 },
      ],
      method: "rank_percentile",
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
    });

    expect(output.status).toBe("ok");
    expect(output.value).toHaveLength(4);
  });
});

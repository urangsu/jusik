import { describe, expect, it } from "vitest";
import { calculateRankIC } from "./calculate-rank-ic";

const manyAssets = Array.from({ length: 30 }, (_, index) => `A${index + 1}`);

describe("calculateRankIC", () => {
  it("returns insufficient_data after common asset filtering when sample size is below 30", () => {
    const output = calculateRankIC({
      calcDate: "2026-06-16",
      horizon: "1m",
      factorScores: manyAssets.slice(0, 29).map((assetId, index) => ({ assetId, value: index })),
      forwardReturns: manyAssets.map((assetId, index) => ({ assetId, value: index / 100 })),
    });

    expect(output.status).toBe("insufficient_data");
    expect(output.value).toBeNull();
    expect(output.sampleSize).toBe(29);
  });

  it("uses only common finite asset pairs and returns finite Spearman rank IC", () => {
    const output = calculateRankIC({
      calcDate: "2026-06-16",
      horizon: "1m",
      factorScores: [
        ...manyAssets.map((assetId, index) => ({ assetId, value: index + 1 })),
        { assetId: "DROP_NAN", value: Number.NaN },
        { assetId: "DROP_MISSING_RETURN", value: 100 },
      ],
      forwardReturns: [
        ...manyAssets.map((assetId, index) => ({ assetId, value: (index + 1) / 100 })),
        { assetId: "DROP_NAN", value: 0.1 },
      ],
    });

    expect(output.status).toBe("ok");
    expect(output.value?.ic).toBeCloseTo(1, 10);
    expect(output.value?.method).toBe("spearman");
    expect(output.sampleSize).toBe(30);
  });

  it("applies average rank for ties", () => {
    const factorScores = manyAssets.map((assetId, index) => ({
      assetId,
      value: index < 10 ? 1 : index < 20 ? 2 : 3,
    }));
    const forwardReturns = manyAssets.map((assetId, index) => ({
      assetId,
      value: index < 10 ? 3 : index < 20 ? 2 : 1,
    }));

    const output = calculateRankIC({
      calcDate: "2026-06-16",
      horizon: "1m",
      factorScores,
      forwardReturns,
    });

    expect(output.status).toBe("ok");
    expect(output.value?.ic).toBeCloseTo(-1, 10);
  });
});

import { describe, expect, it } from "vitest";
import { estimateFactorCovariance } from "./estimate-factor-covariance";

const factorIds = ["value", "momentum"] as const;

describe("estimateFactorCovariance", () => {
  it("returns insufficient_data when observations are below the minimum threshold", () => {
    const output = estimateFactorCovariance({
      date: "2026-06-16",
      market: "KR",
      universe: "KOSPI200",
      factorIds: [...factorIds],
      observations: Array.from({ length: 10 }, (_, index) => ({
        date: `2026-05-${String(index + 1).padStart(2, "0")}`,
        returns: { value: 0.01, momentum: 0.02 },
      })),
      lookbackDays: 60,
      annualized: true,
    });

    expect(output.status).toBe("insufficient_data");
    expect(output.value).toBeNull();
  });

  it("preserves factorIds order and returns a matrix matching factorIds dimensions", () => {
    const observations = Array.from({ length: 30 }, (_, index) => ({
      date: `2026-05-${String((index % 28) + 1).padStart(2, "0")}`,
      returns: {
        value: index / 100,
        momentum: (30 - index) / 100,
      },
    }));

    const output = estimateFactorCovariance({
      date: "2026-06-16",
      market: "KR",
      universe: "KOSPI200",
      factorIds: [...factorIds],
      observations,
      lookbackDays: 60,
      annualized: false,
    });

    expect(output.status).toBe("ok");
    expect(output.value?.factorIds).toEqual(["value", "momentum"]);
    expect(output.value?.covariance).toHaveLength(2);
    expect(output.value?.covariance[0]).toHaveLength(2);
  });
});

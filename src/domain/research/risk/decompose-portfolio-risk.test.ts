import { describe, expect, it } from "vitest";
import { decomposePortfolioRisk } from "./decompose-portfolio-risk";

describe("decomposePortfolioRisk", () => {
  it("calculates totalVariance as factorVariance plus specificVariance and volatility as sqrt", () => {
    const output = decomposePortfolioRisk({
      portfolioId: "p1",
      date: "2026-06-16",
      weights: [
        { assetId: "A", weight: 0.5 },
        { assetId: "B", weight: 0.4 },
      ],
      factorExposures: {
        A: { value: 1, momentum: 0.5 },
        B: { value: 0.2, momentum: 1 },
      },
      factorCovariance: {
        factorIds: ["value", "momentum"],
        covariance: [
          [0.04, 0],
          [0, 0.09],
        ],
      },
      specificVariances: { A: 0.01, B: 0.02 },
      engineVersion: "0.2.0",
      dataVersionId: "dv1",
    });

    expect(output.status).toBe("ok");
    expect(output.value?.totalVariance).toBeCloseTo(
      (output.value?.factorVariance ?? 0) + (output.value?.specificVariance ?? 0),
      10,
    );
    expect(output.value?.totalVolatility).toBeCloseTo(Math.sqrt(output.value?.totalVariance ?? 0), 10);
  });

  it("adds warnings for missing exposure and overweight long-only portfolios", () => {
    const output = decomposePortfolioRisk({
      portfolioId: "p1",
      date: "2026-06-16",
      weights: [
        { assetId: "A", weight: 0.8 },
        { assetId: "B", weight: 0.4 },
      ],
      factorExposures: {
        A: { value: 1 },
      },
      factorCovariance: {
        factorIds: ["value"],
        covariance: [[0.04]],
      },
      specificVariances: { A: 0.01 },
      engineVersion: "0.2.0",
      dataVersionId: "dv1",
    });

    expect(output.status).toBe("ok");
    expect(output.value?.cashWeight).toBe(0);
    expect(output.value?.warnings).toEqual(
      expect.arrayContaining([
        "assetWeights sum exceeds 1.0 tolerance for long-only P0 portfolio.",
        "Missing factor exposure for B.",
        "Missing specific variance for B.",
      ]),
    );
  });

  it("returns invalid_input when covariance dimensions do not match factorIds", () => {
    const output = decomposePortfolioRisk({
      portfolioId: "p1",
      date: "2026-06-16",
      weights: [{ assetId: "A", weight: 0.5 }],
      factorExposures: { A: { value: 1, momentum: 0.5 } },
      factorCovariance: {
        factorIds: ["value", "momentum"],
        covariance: [[0.04]],
      },
      specificVariances: { A: 0.01 },
      engineVersion: "0.2.0",
      dataVersionId: "dv1",
    });

    expect(output.status).toBe("invalid_input");
    expect(output.value).toBeNull();
    expect(output.warnings).toContain("Factor covariance matrix dimensions must match factorIds.");
  });

  it("returns invalid_input when negative variance would make total volatility invalid", () => {
    const output = decomposePortfolioRisk({
      portfolioId: "p1",
      date: "2026-06-16",
      weights: [{ assetId: "A", weight: 1 }],
      factorExposures: { A: { value: 1 } },
      factorCovariance: {
        factorIds: ["value"],
        covariance: [[-0.04]],
      },
      specificVariances: { A: 0.01 },
      engineVersion: "0.2.0",
      dataVersionId: "dv1",
    });

    expect(output.status).toBe("invalid_input");
    expect(output.value).toBeNull();
    expect(output.warnings).toContain("Variance inputs must not produce negative portfolio variance.");
  });
});

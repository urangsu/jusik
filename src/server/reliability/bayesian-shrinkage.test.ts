import { describe, expect, it } from "vitest";
import { shrinkHitRate, shrinkIc } from "./bayesian-shrinkage";

describe("Bayesian Shrinkage", () => {
  describe("shrinkHitRate", () => {
    it("returns null if observedHitRate is null", () => {
      expect(
        shrinkHitRate({
          observedHitRate: null,
          sampleSize: 10,
          priorHitRate: 0.5,
          priorStrength: 30,
        })
      ).toBeNull();
    });

    it("shrinks hit rate towards the prior", () => {
      // (0.8 * 10 + 0.5 * 30) / 40 = (8 + 15) / 40 = 23 / 40 = 0.575
      const result = shrinkHitRate({
        observedHitRate: 0.8,
        sampleSize: 10,
        priorHitRate: 0.5,
        priorStrength: 30,
      });
      expect(result).toBeCloseTo(0.575, 5);
    });
  });

  describe("shrinkIc", () => {
    it("returns null if observedIc is null", () => {
      expect(
        shrinkIc({
          observedIc: null,
          sampleSize: 10,
          priorIc: 0.0,
          priorStrength: 30,
        })
      ).toBeNull();
    });

    it("shrinks IC towards the prior", () => {
      // (0.4 * 20 + 0.0 * 30) / 50 = 8 / 50 = 0.16
      const result = shrinkIc({
        observedIc: 0.4,
        sampleSize: 20,
        priorIc: 0.0,
        priorStrength: 30,
      });
      expect(result).toBeCloseTo(0.16, 5);
    });
  });
});

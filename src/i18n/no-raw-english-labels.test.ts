import { describe, it, expect } from "vitest";
import { ko } from "./dictionaries/ko";
import { en } from "./dictionaries/en";

describe("i18n Korean dictionary integrity", () => {
  it("should verify that Korean translations are not identical to their key names", () => {
    Object.entries(ko).forEach(([key, value]) => {
      // Exclude values that are meant to be English or identical (like appName "K-Terminal")
      if (key === "appName") return;
      
      expect(value).not.toBe(key);
    });
  });

  it("should have matching key sets between Korean and English dictionaries", () => {
    const koKeys = Object.keys(ko).sort();
    const enKeys = Object.keys(en).sort();
    expect(koKeys).toEqual(enKeys);
  });
});

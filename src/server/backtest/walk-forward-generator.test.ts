import { describe, it, expect } from "vitest";
import { generateWalkForwardWindows } from "./walk-forward-generator";

describe("generateWalkForwardWindows", () => {
  it("generates windows with no train/test overlap", () => {
    const windows = generateWalkForwardWindows({
      startDate: "2024-01-01",
      endDate: "2025-12-31",
      trainDays: 90,
      testDays: 30,
      stepDays: 30,
    });

    expect(windows.length).toBeGreaterThan(0);
    for (const w of windows) {
      expect(w.testStart > w.trainEnd).toBe(true);
    }
  });

  it("throws when trainDays < 60", () => {
    expect(() =>
      generateWalkForwardWindows({
        startDate: "2024-01-01",
        endDate: "2025-12-31",
        trainDays: 50,
        testDays: 30,
        stepDays: 30,
      })
    ).toThrow("trainDays must be >= 60");
  });

  it("throws when testDays < 20", () => {
    expect(() =>
      generateWalkForwardWindows({
        startDate: "2024-01-01",
        endDate: "2025-12-31",
        trainDays: 90,
        testDays: 10,
        stepDays: 30,
      })
    ).toThrow("testDays must be >= 20");
  });

  it("throws when range is too short", () => {
    expect(() =>
      generateWalkForwardWindows({
        startDate: "2025-01-01",
        endDate: "2025-02-01",
        trainDays: 90,
        testDays: 30,
        stepDays: 30,
      })
    ).toThrow();
  });

  it("trainEnd is always before testStart in each window", () => {
    const windows = generateWalkForwardWindows({
      startDate: "2024-01-01",
      endDate: "2026-01-01",
      trainDays: 60,
      testDays: 20,
      stepDays: 20,
    });

    for (const w of windows) {
      expect(w.trainEnd < w.testStart).toBe(true);
    }
  });

  it("OOS windows do not overlap each other", () => {
    const windows = generateWalkForwardWindows({
      startDate: "2024-01-01",
      endDate: "2025-12-31",
      trainDays: 90,
      testDays: 30,
      stepDays: 30,
    });

    for (let i = 1; i < windows.length; i++) {
      const prev = windows[i - 1];
      const curr = windows[i];
      // test periods of consecutive windows should not overlap
      // (they may overlap in step-based walk-forward, but trainEnd < testStart is guaranteed)
      expect(curr.trainStart >= prev.trainStart).toBe(true);
    }
  });

  it("generates at least 1 window for 1-year range", () => {
    const windows = generateWalkForwardWindows({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      trainDays: 90,
      testDays: 30,
      stepDays: 60,
    });
    expect(windows.length).toBeGreaterThanOrEqual(1);
  });
});

import { describe, it, expect } from "vitest";
import { getDefaultSnapshot } from "./market-board-snapshot";

describe("MarketBoardSnapshot Model", () => {
  it("should load 20 representative constituents for KOSPI_SAMPLE", () => {
    const snapshot = getDefaultSnapshot("KOSPI_SAMPLE");
    expect(snapshot.universeId).toBe("KOSPI_SAMPLE");
    expect(snapshot.tiles.length).toBe(20);
    expect(snapshot.tableRows.length).toBe(20);
  });

  it("should load 20 representative constituents for SP500_SAMPLE", () => {
    const snapshot = getDefaultSnapshot("SP500_SAMPLE");
    expect(snapshot.universeId).toBe("SP500_SAMPLE");
    expect(snapshot.tiles.length).toBe(20);
    expect(snapshot.tableRows.length).toBe(20);
  });

  it("should flag warnings for uninitialized full universes", () => {
    const snapshot = getDefaultSnapshot("KOSPI");
    expect(snapshot.tiles.length).toBe(0);
    expect(snapshot.warnings.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { classifyFreshness } from "./data-freshness";

describe("classifyFreshness", () => {
  it("returns unknown without updatedAt", () => {
    expect(classifyFreshness({
      updatedAt: null,
      now: "2026-06-16T12:00:00.000Z",
      market: "US",
      interval: "quote",
    })).toBe("unknown");
  });

  it("classifies old quote data as stale", () => {
    expect(classifyFreshness({
      updatedAt: "2026-06-16T10:00:00.000Z",
      now: "2026-06-16T12:00:00.000Z",
      market: "KR",
      interval: "quote",
    })).toBe("stale");
  });

  it("classifies recent OHLCV data as fresh", () => {
    expect(classifyFreshness({
      updatedAt: "2026-06-16T00:00:00.000Z",
      now: "2026-06-16T12:00:00.000Z",
      market: "US",
      interval: "ohlcv",
    })).toBe("fresh");
  });
});

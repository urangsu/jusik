import { describe, it, expect } from "vitest";
import { createStrategyParameterHash } from "./strategy-parameter-hash";

describe("createStrategyParameterHash", () => {
  it("generates same hash regardless of key ordering", () => {
    const hash1 = createStrategyParameterHash({ a: 1, b: 2 });
    const hash2 = createStrategyParameterHash({ b: 2, a: 1 });
    expect(hash1).toBe(hash2);
  });

  it("generates different hash for different values", () => {
    const hash1 = createStrategyParameterHash({ a: 1, b: 2 });
    const hash2 = createStrategyParameterHash({ a: 1, b: 3 });
    expect(hash1).not.toBe(hash2);
  });

  it("ignores undefined values", () => {
    const hash1 = createStrategyParameterHash({ a: 1, b: undefined });
    const hash2 = createStrategyParameterHash({ a: 1 });
    expect(hash1).toBe(hash2);
  });

  it("handles dates and nested objects", () => {
    const date = new Date("2026-06-19T00:00:00.000Z");
    const hash1 = createStrategyParameterHash({ date, nested: { y: 1, x: 2 } });
    const hash2 = createStrategyParameterHash({ nested: { x: 2, y: 1 }, date });
    expect(hash1).toBe(hash2);
  });
});

import { describe, it, expect } from "vitest";
import { assertNoLookAheadBias } from "./forward-return";

describe("assertNoLookAheadBias", () => {
  it("should pass when entryDate is after signalDate", () => {
    expect(() =>
      assertNoLookAheadBias({ signalDate: "2025-01-10", entryDate: "2025-01-11" })
    ).not.toThrow();
  });

  it("should throw when entryDate equals signalDate", () => {
    expect(() =>
      assertNoLookAheadBias({ signalDate: "2025-01-10", entryDate: "2025-01-10" })
    ).toThrow("look-ahead bias detected");
  });

  it("should throw when entryDate is before signalDate", () => {
    expect(() =>
      assertNoLookAheadBias({ signalDate: "2025-01-10", entryDate: "2025-01-09" })
    ).toThrow("look-ahead bias detected");
  });
});

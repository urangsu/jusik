import { describe, it, expect } from "vitest";
import { mapOpenDartStatusToDataStatus } from "./opendart-status";

describe("mapOpenDartStatusToDataStatus", () => {
  it("should map status codes correctly", () => {
    expect(mapOpenDartStatusToDataStatus("000")).toBe("eod");
    expect(mapOpenDartStatusToDataStatus("013")).toBe("not_found");
    expect(mapOpenDartStatusToDataStatus("020")).toBe("rate_limited");
    expect(mapOpenDartStatusToDataStatus("021")).toBe("rate_limited");

    const errorCodes = ["010", "011", "012", "100", "101", "800", "900", "UNKNOWN"];
    for (const code of errorCodes) {
      expect(mapOpenDartStatusToDataStatus(code)).toBe("error");
    }
  });
});

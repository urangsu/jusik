import { describe, expect, it } from "vitest";
import { validateDataEnvelopeContract } from "./data-envelope-contract-validator";

describe("validateDataEnvelopeContract", () => {
  it("passes api_required with null value and required metadata", () => {
    const result = validateDataEnvelopeContract({
      value: null,
      status: "api_required",
      source: "kis",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
    });

    expect(result.passed).toBe(true);
    expect(result.dataAvailable).toBe(false);
    expect(result.status).toBe("api_required");
  });

  it("fails when real_time has null value", () => {
    const result = validateDataEnvelopeContract({
      value: null,
      status: "real_time",
      source: "kis",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-07-02T00:00:00.000Z",
    });

    expect(result.passed).toBe(false);
    expect(result.failures.join(" ")).toContain("value cannot be null");
  });

  it("fails when source metadata is missing", () => {
    const result = validateDataEnvelopeContract({
      value: { price: 1 },
      status: "real_time",
      warnings: [],
      updatedAt: "2026-07-02T00:00:00.000Z",
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("source is required.");
    expect(result.failures).toContain("sourceTier is required.");
  });

  it("fails when warnings is not an array", () => {
    const result = validateDataEnvelopeContract({
      value: null,
      status: "api_required",
      source: "opendart",
      sourceTier: "official",
      warnings: "none",
      updatedAt: null,
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("warnings must be an array.");
  });

  it("passes not_found with an empty provider payload", () => {
    const result = validateDataEnvelopeContract({
      value: { list: [] },
      status: "not_found",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-07-02T00:00:00.000Z",
    });

    expect(result.passed).toBe(true);
    expect(result.dataAvailable).toBe(false);
  });
});

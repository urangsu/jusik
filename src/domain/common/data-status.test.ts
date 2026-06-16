import { describe, it, expect } from "vitest";
import { DataEnvelope } from "./data-status";

describe("Data Envelope Type Contract", () => {
  it("should enforce standard envelopes with delay times", () => {
    const envelope: DataEnvelope<number> = {
      value: 50000,
      status: "delayed",
      source: "KoreaInvestment",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-06-15T09:00:00Z",
      delayMinutes: 15,
    };

    expect(envelope.value).toBe(50000);
    expect(envelope.status).toBe("delayed");
    expect(envelope.delayMinutes).toBe(15);
  });

  it("should handle error envelopes with null values", () => {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "DART",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      errorCode: "500",
      message: "Internal Connection Refused",
    };

    expect(envelope.value).toBeNull();
    expect(envelope.status).toBe("error");
    expect(envelope.errorCode).toBe("500");
  });
});

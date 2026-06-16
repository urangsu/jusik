import { describe, expect, it } from "vitest";
import { createPitRecord } from "./pit-record";

describe("createPitRecord", () => {
  it("requires a dataVersionId and preserves PIT timestamps separately", () => {
    const record = createPitRecord({
      pitRecordId: "pit-1",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 71000 },
      asOfDate: "2026-06-15",
      effectiveAt: "2026-06-15T15:30:00.000Z",
      ingestedAt: "2026-06-16T00:00:00.000Z",
      dataVersionId: "dv-1",
      status: "valid",
      source: "test",
      hash: "hash-1",
    });

    expect(record.dataVersionId).toBe("dv-1");
    expect(record.asOfDate).toBe("2026-06-15");
    expect(record.effectiveAt).not.toBe(record.ingestedAt);
  });
});

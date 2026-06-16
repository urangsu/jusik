import { describe, expect, it } from "vitest";
import { InMemoryPitStore } from "./in-memory-pit-store";
import { createPitRecord } from "@/domain/data/pit-record";

describe("InMemoryPitStore", () => {
  it("getAsOf does not return records ingested after knownAt", async () => {
    const store = new InMemoryPitStore();
    await store.put(createPitRecord({
      pitRecordId: "pit-late",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 72000 },
      asOfDate: "2026-06-15",
      effectiveAt: "2026-06-15T15:30:00.000Z",
      ingestedAt: "2026-06-16T09:00:00.000Z",
      dataVersionId: "dv-late",
      status: "valid",
      source: "seed",
      hash: "late",
    }));

    const record = await store.getAsOf({
      assetId: "KR:005930",
      sourceKind: "market_price",
      asOfDate: "2026-06-15",
      knownAt: "2026-06-16T08:00:00.000Z",
    });

    expect(record).toBeNull();
  });

  it("stores revision records without overwriting older records", async () => {
    const store = new InMemoryPitStore();
    const original = createPitRecord({
      pitRecordId: "pit-original",
      assetId: "US:AAPL",
      market: "US",
      sourceKind: "filing",
      value: { form: "10-K" },
      asOfDate: "2026-02-01",
      effectiveAt: "2026-02-01T00:00:00.000Z",
      ingestedAt: "2026-02-02T00:00:00.000Z",
      dataVersionId: "dv-original",
      status: "superseded",
      source: "SEC",
      hash: "original",
    });
    const revision = createPitRecord({
      ...original,
      pitRecordId: "pit-revision",
      dataVersionId: "dv-revision",
      revisionId: "rev-1",
      status: "revised",
      ingestedAt: "2026-02-03T00:00:00.000Z",
      hash: "revision",
    });

    await store.put(original);
    await store.put(revision);

    expect(await store.getById("pit-original")).toEqual(original);
    expect(await store.getById("pit-revision")).toEqual(revision);
  });
});

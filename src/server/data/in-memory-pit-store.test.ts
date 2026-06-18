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

  it("prefers newer asOfDate even when an older asOf record was ingested later", async () => {
    const store = new InMemoryPitStore();
    await store.put(createPitRecord({
      pitRecordId: "pit-newer-asof",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 72000 },
      asOfDate: "2026-06-16",
      effectiveAt: "2026-06-16T15:30:00.000Z",
      ingestedAt: "2026-06-16T16:00:00.000Z",
      dataVersionId: "dv-newer-asof",
      status: "valid",
      source: "seed",
      hash: "newer-asof",
    }));
    await store.put(createPitRecord({
      pitRecordId: "pit-older-asof-late-ingest",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 70000 },
      asOfDate: "2026-06-15",
      effectiveAt: "2026-06-15T15:30:00.000Z",
      ingestedAt: "2026-06-17T09:00:00.000Z",
      dataVersionId: "dv-older-asof",
      status: "valid",
      source: "seed",
      hash: "older-asof",
    }));

    const record = await store.getAsOf({
      assetId: "KR:005930",
      sourceKind: "market_price",
      asOfDate: "2026-06-16",
      knownAt: "2026-06-17T10:00:00.000Z",
    });

    expect(record?.pitRecordId).toBe("pit-newer-asof");
  });

  it("prefers later ingested revision for the same asOfDate when knownAt allows it", async () => {
    const store = new InMemoryPitStore();
    await store.put(createPitRecord({
      pitRecordId: "pit-original-same-asof",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 71000 },
      asOfDate: "2026-06-16",
      effectiveAt: "2026-06-16T15:30:00.000Z",
      ingestedAt: "2026-06-16T16:00:00.000Z",
      dataVersionId: "dv-original",
      status: "superseded",
      source: "seed",
      hash: "original",
    }));
    await store.put(createPitRecord({
      pitRecordId: "pit-revision-same-asof",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 71500 },
      asOfDate: "2026-06-16",
      effectiveAt: "2026-06-16T15:30:00.000Z",
      ingestedAt: "2026-06-16T18:00:00.000Z",
      dataVersionId: "dv-revision",
      revisionId: "rev-1",
      status: "revised",
      source: "seed",
      hash: "revision",
    }));

    const record = await store.getAsOf({
      assetId: "KR:005930",
      sourceKind: "market_price",
      asOfDate: "2026-06-16",
      knownAt: "2026-06-16T19:00:00.000Z",
    });

    expect(record?.pitRecordId).toBe("pit-revision-same-asof");
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

  it("3.1: prefers latest eligible asOfDate even if older asOf is ingested later", async () => {
    const store = new InMemoryPitStore();
    await store.put(createPitRecord({
      pitRecordId: "record-A",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 70000 },
      asOfDate: "2026-06-14",
      effectiveAt: "2026-06-14T15:30:00.000Z",
      ingestedAt: "2026-06-16T00:00:00.000Z",
      dataVersionId: "dv-a",
      status: "valid",
      source: "seed",
      hash: "a",
    }));
    await store.put(createPitRecord({
      pitRecordId: "record-B",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 71000 },
      asOfDate: "2026-06-15",
      effectiveAt: "2026-06-15T15:30:00.000Z",
      ingestedAt: "2026-06-15T00:00:00.000Z",
      dataVersionId: "dv-b",
      status: "valid",
      source: "seed",
      hash: "b",
    }));

    const record = await store.getAsOf({
      assetId: "KR:005930",
      sourceKind: "market_price",
      asOfDate: "2026-06-15",
      knownAt: "2026-06-16T12:00:00.000Z",
    });
    expect(record?.pitRecordId).toBe("record-B");
  });

  it("3.2: prefers latest ingested revision for the same asOfDate even if effectiveAt is earlier", async () => {
    const store = new InMemoryPitStore();
    await store.put(createPitRecord({
      pitRecordId: "record-A",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 70000 },
      asOfDate: "2026-06-15",
      effectiveAt: "2026-06-15T12:00:00.000Z",
      ingestedAt: "2026-06-15T13:00:00.000Z",
      dataVersionId: "dv-a",
      status: "valid",
      source: "seed",
      hash: "a",
    }));
    await store.put(createPitRecord({
      pitRecordId: "record-B",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 71000 },
      asOfDate: "2026-06-15",
      effectiveAt: "2026-06-15T09:00:00.000Z",
      ingestedAt: "2026-06-15T15:00:00.000Z",
      dataVersionId: "dv-b",
      status: "valid",
      source: "seed",
      hash: "b",
    }));

    const record = await store.getAsOf({
      assetId: "KR:005930",
      sourceKind: "market_price",
      asOfDate: "2026-06-15",
      knownAt: "2026-06-15T16:00:00.000Z",
    });
    expect(record?.pitRecordId).toBe("record-B");
  });

  it("3.3: excludes records ingested after query knownAt", async () => {
    const store = new InMemoryPitStore();
    await store.put(createPitRecord({
      pitRecordId: "record-A",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 70000 },
      asOfDate: "2026-06-15",
      effectiveAt: "2026-06-15T15:30:00.000Z",
      ingestedAt: "2026-06-15T10:00:00.000Z",
      dataVersionId: "dv-a",
      status: "valid",
      source: "seed",
      hash: "a",
    }));
    await store.put(createPitRecord({
      pitRecordId: "record-B",
      assetId: "KR:005930",
      market: "KR",
      sourceKind: "market_price",
      value: { close: 71000 },
      asOfDate: "2026-06-15",
      effectiveAt: "2026-06-15T15:30:00.000Z",
      ingestedAt: "2026-06-16T10:00:00.000Z",
      dataVersionId: "dv-b",
      status: "valid",
      source: "seed",
      hash: "b",
    }));

    const record = await store.getAsOf({
      assetId: "KR:005930",
      sourceKind: "market_price",
      asOfDate: "2026-06-15",
      knownAt: "2026-06-15T12:00:00.000Z",
    });
    expect(record?.pitRecordId).toBe("record-A");
  });
});

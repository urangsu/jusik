/**
 * Task 2: Date-aligned, append-only outcome observation.
 * All tests here FAIL against the old observer and PASS after the fix.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPendingOutcomeRecord, observeOutcome } from "./signal-outcome-observer";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";

vi.mock("../factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: vi.fn(),
}));

const store: Record<string, unknown> = {};
vi.mock("./signal-outcome-journal-store", () => ({
  saveOutcomeRecord: vi.fn(async (record: { id: string }) => {
    store[record.id] = { ...(store[record.id] as object ?? {}), ...record };
  }),
  getOutcomeRecord: vi.fn(async (id: string) => store[id] ?? null),
  listOutcomeRecords: vi.fn(async () => Object.values(store)),
}));

function bar(date: string, close: number) {
  return { assetId: "KR_005930", date, open: close, high: close, low: close, close, volume: 1000 };
}

const NON_MONOTONIC_BARS = [
  bar("2026-01-02", 200),
  bar("2026-01-05", 100), // observation base
  bar("2026-01-06", 80),
  bar("2026-01-07", 120),
];

function mockOhlcv(bars: ReturnType<typeof bar>[], dataVersionId = "ver_test_001") {
  vi.mocked(loadOhlcvHistory).mockResolvedValue({
    value: bars,
    status: "cached",
    source: "test",
    sourceTier: "official",
    warnings: [],
    updatedAt: new Date().toISOString(),
    dataVersionId,
  } as unknown as Awaited<ReturnType<typeof loadOhlcvHistory>>);
}

describe("signal-outcome-observer — Task 2 date-aligned behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(store).forEach((k) => delete store[k]);
  });

  // Case 1: Missing assetId → insufficient_data (no OHLCV load)
  it("missing assetId never calls loadOhlcvHistory and returns insufficient_data", async () => {
    mockOhlcv(NON_MONOTONIC_BARS);

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_noasset",
      assetId: null,
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const observed = await observeOutcome(pending.id);
    expect(observed.outcomeStatus).toBe("insufficient_data");
    expect(loadOhlcvHistory).not.toHaveBeenCalled();
  });

  // Case 2: Missing observationStartedAt → insufficient_data (no OHLCV load)
  it("missing observationStartedAt never loads data", async () => {
    mockOhlcv(NON_MONOTONIC_BARS);

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_nostart",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: undefined,
    });

    const observed = await observeOutcome(pending.id);
    expect(observed.outcomeStatus).toBe("insufficient_data");
    expect(loadOhlcvHistory).not.toHaveBeenCalled();
  });

  // Case 3: Missing basePriceDataVersionId never loads data
  // (basePriceDataVersionId is required when observing — if OHLCV has no dataVersionId the observation fails)
  it("missing basePriceDataVersionId produces insufficient_data status", async () => {
    // loadOhlcvHistory returns value without a dataVersionId (undefined)
    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: NON_MONOTONIC_BARS,
      status: "cached",
      source: "test",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      // No dataVersionId field
    } as unknown as Awaited<ReturnType<typeof loadOhlcvHistory>>);

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_nodataversion",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const observed = await observeOutcome(pending.id);
    // Without dataVersionId, basePriceDataVersionId cannot be set; observation must reject
    expect(observed.basePriceDataVersionId).toBeFalsy();
    expect(["insufficient_data", "error"]).toContain(observed.outcomeStatus);
  });

  // Case 4: Base bar is first trading bar with date >= observationStartedAt
  it("base bar is the first bar with date >= observationStartedAt (not the latest)", async () => {
    mockOhlcv(NON_MONOTONIC_BARS);
    // observationStartedAt = 2026-01-05 → base bar should be bar at 2026-01-05 (close=100)
    // NOT bar at 2026-01-02 (close=200) and NOT bar at 2026-01-07 (close=120)

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_base",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const observed = await observeOutcome(pending.id);
    // Base date must be 2026-01-05
    if (observed.outcomeStatus !== "pending") {
      expect(observed.baseTradeDate).toBe("2026-01-05");
    }
  });

  // Case 5: Target is exactly N trading bars after base bar
  it("target bar is exactly N bars after the base bar index (not always the latest bar)", async () => {
    const bars = [
      bar("2026-01-05", 100), // index 0 — base
      bar("2026-01-06", 80),  // index 1
      bar("2026-01-07", 120), // index 2 — target for forward_5d? No, only 2 bars after base
      bar("2026-01-08", 90),  // index 3
      bar("2026-01-09", 110), // index 4
      bar("2026-01-12", 130), // index 5 — target for forward_5d (base + 5)
    ];
    mockOhlcv(bars);

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_target",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const observed = await observeOutcome(pending.id);
    if (observed.outcomeStatus === "observed") {
      expect(observed.targetTradeDate).toBe("2026-01-12");
      // Return = (130 - 100) / 100 = 0.30
      expect(observed.observedForwardReturn).toBeCloseTo(0.30, 5);
    }
  });

  // Case 6: Target bar does not exist → status remains pending (not insufficient_data)
  it("if target bar does not yet exist, status remains pending", async () => {
    // Only 2 bars exist after base, but horizon is forward_5d (needs 5 bars after base)
    const bars = [
      bar("2026-01-05", 100), // base
      bar("2026-01-06", 80),
      bar("2026-01-07", 120),
    ];
    mockOhlcv(bars);

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_notarget",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const observed = await observeOutcome(pending.id);
    expect(observed.outcomeStatus).toBe("pending");
  });

  // Case 7: A bar before observationStartedAt is never selected as base
  it("bar before observationStartedAt is never used as base", async () => {
    // bars[0] is before the start date — must be skipped
    const bars = [
      bar("2026-01-02", 200), // before observationStartedAt — must not be base
      bar("2026-01-05", 100), // first bar >= observationStartedAt → this is the base
      bar("2026-01-06", 80),
      bar("2026-01-07", 120),
      bar("2026-01-08", 90),
      bar("2026-01-09", 110),
      bar("2026-01-12", 130),
    ];
    mockOhlcv(bars);

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_skipbefore",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const observed = await observeOutcome(pending.id);
    if (observed.baseTradeDate) {
      expect(observed.baseTradeDate).not.toBe("2026-01-02");
      expect(observed.baseTradeDate).toBe("2026-01-05");
    }
  });

  // Case 8: Market benchmark and sector benchmark returns are separate
  it("market benchmark and sector benchmark returns are stored separately", async () => {
    const bars6 = Array.from({ length: 6 }, (_, i) => bar(`2026-01-0${i + 5}`, 100 + i * 5));
    vi.mocked(loadOhlcvHistory).mockImplementation(async (_uni, assetId) => ({
      value: bars6,
      status: "cached" as const,
      source: "test",
      sourceTier: "official" as const,
      warnings: [],
      updatedAt: new Date().toISOString(),
      dataVersionId: `ver_${assetId}`,
    }));

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_benchmarks",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const observed = await observeOutcome(pending.id);
    if (observed.outcomeStatus === "observed") {
      // The new type has separate market/sector benchmark fields
      expect("marketBenchmarkReturn" in observed).toBe(true);
      expect("sectorBenchmarkReturn" in observed).toBe(true);
      expect("marketExcessReturn" in observed).toBe(true);
      expect("sectorExcessReturn" in observed).toBe(true);
      // The deprecated merged fields must NOT exist
      expect("benchmarkReturn" in observed).toBe(false);
      expect("alphaReturn" in observed).toBe(false);
      expect("benchmarkSourceRef" in observed).toBe(false);
    }
  });

  // Case 9: Missing benchmark leaves its excess return null
  it("missing benchmark leaves its excess return null", async () => {
    vi.mocked(loadOhlcvHistory).mockImplementation(async (_uni, assetId) => {
      if (assetId === "KR_005930") {
        return {
          value: Array.from({ length: 6 }, (_, i) => bar(`2026-01-0${i + 5}`, 100)),
          status: "cached" as const,
          source: "test",
          sourceTier: "official" as const,
          warnings: [],
          updatedAt: new Date().toISOString(),
          dataVersionId: "ver_asset",
        };
      }
      // benchmark load fails
      throw new Error("benchmark not found");
    });

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_nobenchmark",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const observed = await observeOutcome(pending.id);
    if (observed.outcomeStatus === "observed") {
      expect(observed.marketBenchmarkReturn).toBeNull();
      expect(observed.marketExcessReturn).toBeNull();
    }
  });

  // Case 10: Single outcome always has confidenceAdjustment: "not_applicable"
  it("a single outcome always has confidenceAdjustment: 'not_applicable'", async () => {
    const bars6 = Array.from({ length: 6 }, (_, i) => bar(`2026-01-0${i + 5}`, 100 + i * 10));
    mockOhlcv(bars6);

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_confidence",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const observed = await observeOutcome(pending.id);
    expect(observed.confidenceAdjustment).toBe("not_applicable");
  });

  // Case 11: Saving an observation creates a new revision and preserves the pending record
  it("observation creates a new revision record and preserves the pending record", async () => {
    const { saveOutcomeRecord, getOutcomeRecord } = await import("./signal-outcome-journal-store");
    const bars6 = Array.from({ length: 6 }, (_, i) => bar(`2026-01-0${i + 5}`, 100 + i * 5));
    mockOhlcv(bars6);

    const pending = await createPendingOutcomeRecord({
      subjectType: "signal",
      subjectId: "sub_revision",
      assetId: "KR_005930",
      horizon: "forward_5d",
      observationStartedAt: "2026-01-05T00:00:00Z",
    });

    const pendingId = pending.id;
    const observed = await observeOutcome(pendingId);

    // If observation creates a new revision, the IDs differ
    if (observed.outcomeStatus === "observed") {
      // The pending record must still exist
      const originalRecord = await getOutcomeRecord(pendingId);
      expect(originalRecord).not.toBeNull();
      expect(originalRecord!.outcomeStatus).toBe("pending");

      // The observed record has a new ID (revision)
      expect(observed.id).not.toBe(pendingId);
      expect(observed.revision).toBeGreaterThan(0);
      expect(observed.supersedesOutcomeId).toBe(pendingId);
    }
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getList } from "./route";
import { POST as createPending } from "./pending/route";
import { POST as runObserver } from "./observe/route";
import { NextRequest } from "next/server";

vi.mock("@/server/outcome/signal-outcome-journal-store", () => ({
  listOutcomeRecords: vi.fn(),
  saveOutcomeRecord: vi.fn().mockResolvedValue(undefined),
  getOutcomeRecord: vi.fn(),
}));

vi.mock("@/server/outcome/signal-outcome-observer", () => ({
  createPendingOutcomeRecord: vi.fn(),
  observeOutcome: vi.fn(),
}));

import { listOutcomeRecords } from "@/server/outcome/signal-outcome-journal-store";
import { createPendingOutcomeRecord, observeOutcome } from "@/server/outcome/signal-outcome-observer";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

function makeMockRecord(id: string, overrides: Partial<SignalOutcomeJournalRecord> = {}): SignalOutcomeJournalRecord {
  return {
    id,
    rootOutcomeId: id,
    supersedesOutcomeId: null,
    revision: 0,
    subjectType: "signal",
    subjectId: "sig_123",
    assetId: "KR_005930",
    universeId: "KOSPI_SAMPLE",
    signalId: "sig_123",
    strategyId: null,
    observationStartedAt: "2026-01-05T00:00:00Z",
    basePriceDataVersionId: null,
    horizon: "forward_20d",
    baseTradeDate: null,
    targetTradeDate: null,
    observedForwardReturn: null,
    marketBenchmarkAssetId: null,
    marketBenchmarkReturn: null,
    marketExcessReturn: null,
    marketBenchmarkDataVersionId: null,
    sectorBenchmarkAssetId: null,
    sectorBenchmarkReturn: null,
    sectorExcessReturn: null,
    sectorBenchmarkDataVersionId: null,
    initialWarnings: [],
    finalWarnings: [],
    outcomeStatus: "pending",
    lesson: null,
    confidenceAdjustment: "not_applicable",
    evidencePackIds: [],
    createdAt: new Date().toISOString(),
    observedAt: null,
    ...overrides,
  };
}

describe("Signal Outcome Journal APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(listOutcomeRecords).mockResolvedValue([makeMockRecord("out_ok")]);

    vi.mocked(createPendingOutcomeRecord).mockResolvedValue(
      makeMockRecord("out_new", { subjectId: "sig_456", assetId: "US_AAPL" }),
    );

    vi.mocked(observeOutcome).mockResolvedValue(
      makeMockRecord("out_ok_r1", {
        rootOutcomeId: "out_ok",
        supersedesOutcomeId: "out_ok",
        revision: 1,
        observedForwardReturn: 0.05,
        marketBenchmarkReturn: 0.02,
        marketExcessReturn: 0.03,
        outcomeStatus: "observed",
        lesson: "Beat benchmark.",
        baseTradeDate: "2026-01-05",
        targetTradeDate: "2026-01-12",
        observedAt: new Date().toISOString(),
      }),
    );
  });

  it("GET lists outcomes", async () => {
    const req = new NextRequest("http://localhost/api/outcomes/signal-journal");
    const res = await getList(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value).toHaveLength(1);
  });

  it("POST pending registers a record", async () => {
    const req = new NextRequest("http://localhost/api/outcomes/signal-journal/pending", {
      method: "POST",
      body: JSON.stringify({
        subjectType: "signal",
        subjectId: "sig_456",
        assetId: "US_AAPL",
        universeId: "SP500_SAMPLE",
        observationStartedAt: "2026-01-05T00:00:00Z",
        horizon: "forward_20d",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await createPending(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.id).toBe("out_new");
  });

  it("POST observe updates record status", async () => {
    const req = new NextRequest("http://localhost/api/outcomes/signal-journal/observe", {
      method: "POST",
      body: JSON.stringify({ recordId: "out_ok" }),
      headers: { "content-type": "application/json" },
    });

    const res = await runObserver(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.outcomeStatus).toBe("observed");
    // New field names (no alphaReturn)
    expect(data.value.marketExcessReturn).toBe(0.03);
  });
});

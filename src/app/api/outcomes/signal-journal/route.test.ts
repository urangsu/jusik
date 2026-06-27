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

describe("Signal Outcome Journal APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(listOutcomeRecords).mockResolvedValue([
      {
        id: "out_ok",
        subjectType: "signal",
        subjectId: "sig_123",
        assetId: "AAPL",
        signalId: "sig_123",
        strategyId: null,
        horizon: "forward_20d",
        observedForwardReturn: null,
        benchmarkReturn: null,
        alphaReturn: null,
        initialWarnings: [],
        finalWarnings: [],
        outcomeStatus: "pending",
        lesson: null,
        confidenceAdjustment: "not_applicable",
        evidencePackIds: [],
        benchmarkSourceRef: null,
        createdAt: new Date().toISOString(),
        observedAt: null,
      },
    ]);

    vi.mocked(createPendingOutcomeRecord).mockResolvedValue({
      id: "out_new",
      subjectType: "signal",
      subjectId: "sig_456",
      assetId: "MSFT",
      signalId: "sig_456",
      strategyId: null,
      horizon: "forward_20d",
      observedForwardReturn: null,
      benchmarkReturn: null,
      alphaReturn: null,
      initialWarnings: [],
      finalWarnings: [],
      outcomeStatus: "pending",
      lesson: null,
      confidenceAdjustment: "not_applicable",
      evidencePackIds: [],
      benchmarkSourceRef: null,
      createdAt: new Date().toISOString(),
      observedAt: null,
    });

    vi.mocked(observeOutcome).mockResolvedValue({
      id: "out_ok",
      subjectType: "signal",
      subjectId: "sig_123",
      assetId: "AAPL",
      signalId: "sig_123",
      strategyId: null,
      horizon: "forward_20d",
      observedForwardReturn: 0.05,
      benchmarkReturn: 0.02,
      alphaReturn: 0.03,
      initialWarnings: [],
      finalWarnings: [],
      outcomeStatus: "observed",
      lesson: "Beat benchmark.",
      confidenceAdjustment: "increase",
      evidencePackIds: [],
      benchmarkSourceRef: null,
      createdAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
    });
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
    expect(data.value.alphaReturn).toBe(0.03);
  });
});

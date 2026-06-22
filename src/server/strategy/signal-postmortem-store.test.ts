import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import {
  saveSignalPostmortem,
  listSignalPostmortems,
  getSignalPostmortemById,
} from "./signal-postmortem-store";
import { getSignalPostmortemsDir } from "./signal-postmortem-store-paths";
import { SignalPostmortem } from "@/domain/strategy/signal-postmortem";

describe("SignalPostmortemStore", () => {
  const testDir = getSignalPostmortemsDir();

  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("saves, retrieves, and lists postmortems", async () => {
    const postmortem: SignalPostmortem = {
      id: "pm1",
      trialId: "t1",
      backtestRunId: "run1",
      strategyId: "momentum_v1_long_only",
      universeId: "KOSPI_SAMPLE",
      windowIndex: 0,
      testStart: "2026-01-01",
      testEnd: "2026-02-01",
      assetId: "KR:005930",
      symbol: "005930",
      rank: 1,
      signalScore: 95,
      entryDate: "2026-01-02",
      entryPrice: 1000,
      exitDate: "2026-02-01",
      exitPrice: 1100,
      grossReturn: 0.1,
      netReturn: 0.09,
      benchmarkReturn: 0.05,
      excessReturn: 0.04,
      outcome: "positive",
      dataWarnings: [],
      biasWarnings: [],
      reviewNotes: "Looks good",
      status: "auto_generated",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveSignalPostmortem(postmortem);

    const retrieved = await getSignalPostmortemById("pm1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("pm1");

    const all = await listSignalPostmortems();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("pm1");

    const filtered = await listSignalPostmortems({ trialId: "t1" });
    expect(filtered).toHaveLength(1);

    const emptyFilter = await listSignalPostmortems({ trialId: "t2" });
    expect(emptyFilter).toHaveLength(0);
  });
});

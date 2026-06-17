import { describe, it, expect, vi } from "vitest";
import { saveSignalHistory, getSignalHistory, saveCurrentSignals, getCurrentSignals } from "./signal-history-store";

vi.mock("../storage/json-file-store", () => {
  return {
    JsonFileStore: class MockJsonFileStore {
      private filePath: string;
      private static dataMap = new Map<string, any>();

      constructor(filePath: string) {
        this.filePath = filePath;
      }

      async read() {
        return MockJsonFileStore.dataMap.get(this.filePath) || [];
      }

      async write(data: any) {
        MockJsonFileStore.dataMap.set(this.filePath, data);
      }
    },
  };
});

vi.mock("fs", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual.default,
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
    },
  };
});

describe("Signal History Store", () => {
  const mockRecord: any = {
    signalHistoryId: "REC1",
    assetId: "US:AAPL",
    date: "2026-06-17",
    version: { signalVersionId: "technical_v1" },
    signal: { factorId: "momentum_ichimoku", score: 50 },
  };

  it("should save and retrieve signal histories, merging duplicate keys", async () => {
    await saveSignalHistory([mockRecord]);

    const history = await getSignalHistory();
    expect(history).toHaveLength(1);
    expect(history[0].signal.score).toBe(50);

    const updatedRecord = {
      ...mockRecord,
      signal: { ...mockRecord.signal, score: 90 },
    };
    await saveSignalHistory([updatedRecord]);

    const history2 = await getSignalHistory();
    expect(history2).toHaveLength(1);
    expect(history2[0].signal.score).toBe(90);
  });

  it("should save and retrieve current active signals", async () => {
    const mockSignals = {
      "US:AAPL": { status: "valid" },
    };

    await saveCurrentSignals(mockSignals);
    const retrieved = await getCurrentSignals();
    expect(retrieved).toEqual(mockSignals);
  });
});

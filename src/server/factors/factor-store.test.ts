import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveFactorValues, getFactorValues, saveTechnicalSignalSnapshot, getTechnicalSignalSnapshot } from "./factor-store";
import { getFactorValuesPath, getTechnicalSignalSnapshotPath } from "../storage/storage-paths";
import fs from "fs";

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

describe("Factor Store", () => {
  const mockFactorValue: any = {
    id: "TEST_FACTOR",
    assetId: "US:AAPL",
    factorId: "momentum",
    rawValue: 50,
    dataAvailableAt: "2026-06-17",
    calculatedAt: "2026-06-17T00:00:00Z",
  };

  it("should save and retrieve FactorValue arrays, merging correctly", async () => {
    await saveFactorValues([mockFactorValue]);
    
    const retrieved = await getFactorValues();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].rawValue).toBe(50);

    // Save with different score for same keys -> should merge/overwrite
    const updatedFactor = { ...mockFactorValue, rawValue: 70 };
    await saveFactorValues([updatedFactor]);

    const retrieved2 = await getFactorValues();
    expect(retrieved2).toHaveLength(1);
    expect(retrieved2[0].rawValue).toBe(70);
  });

  it("should save and retrieve technical signal snapshots", async () => {
    const mockSnapshot = {
      universeId: "KOSPI_SAMPLE",
      updatedAt: "2026-06-17T21:43:54Z",
      assets: {},
    };

    await saveTechnicalSignalSnapshot("KOSPI_SAMPLE", mockSnapshot);
    const retrieved = await getTechnicalSignalSnapshot("KOSPI_SAMPLE");
    expect(retrieved).toEqual(mockSnapshot);
  });
});

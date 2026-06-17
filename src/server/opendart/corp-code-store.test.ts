import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveCorpCodes,
  getCorpCodeByStockCode,
  getCorpCodeByCorpCode,
  searchCorpCodes,
} from "./corp-code-store";
import { OpenDartCorpCodeRecord } from "../../domain/opendart/corp-code";

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

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
  },
}));

describe("Corp Code Store", () => {
  const sampleRecords: OpenDartCorpCodeRecord[] = [
    {
      corpCode: "00126380",
      corpName: "삼성전자",
      stockCode: "005930",
      modifyDate: "20260101",
      source: "OpenDART",
      sourceTier: "official",
      updatedAt: "2026-06-17T00:00:00.000Z",
    },
    {
      corpCode: "00164779",
      corpName: "SK하이닉스",
      stockCode: "000660",
      modifyDate: "20260101",
      source: "OpenDART",
      sourceTier: "official",
      updatedAt: "2026-06-17T00:00:00.000Z",
    },
  ];

  beforeEach(async () => {
    // Clear and seed
    await saveCorpCodes(sampleRecords);
  });

  it("should save and retrieve corp codes by stock code", async () => {
    const res = await getCorpCodeByStockCode("005930");
    expect(res).not.toBeNull();
    expect(res?.corpName).toBe("삼성전자");

    const missing = await getCorpCodeByStockCode("999999");
    expect(missing).toBeNull();
  });

  it("should save and retrieve corp codes by corp code", async () => {
    const res = await getCorpCodeByCorpCode("00164779");
    expect(res).not.toBeNull();
    expect(res?.corpName).toBe("SK하이닉스");

    const missing = await getCorpCodeByCorpCode("99999999");
    expect(missing).toBeNull();
  });

  it("should search corp codes by name, stock code, or corp code", async () => {
    const byName = await searchCorpCodes("삼성");
    expect(byName.length).toBe(1);
    expect(byName[0].corpName).toBe("삼성전자");

    const byStock = await searchCorpCodes("000660");
    expect(byStock.length).toBe(1);
    expect(byStock[0].corpName).toBe("SK하이닉스");

    const byCorp = await searchCorpCodes("00126380");
    expect(byCorp.length).toBe(1);
    expect(byCorp[0].corpName).toBe("삼성전자");

    const empty = await searchCorpCodes("");
    expect(empty).toEqual([]);
  });
});

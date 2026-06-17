import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import { loadOhlcvHistory } from "./ohlcv-history-loader";
import { getOhlcvHistoryPath } from "../storage/storage-paths";

vi.mock("fs", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual.default,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
});

describe("OHLCV History Loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return insufficient_data when history file does not exist", async () => {
    (fs.existsSync as any).mockReturnValue(false);

    const result = await loadOhlcvHistory("TEST_UNIVERSE", "KR:123456");
    expect(result.status).toBe("insufficient_data");
    expect(result.value).toBeNull();
  });

  it("should load and parse the ohlcv data envelope when file exists", async () => {
    (fs.existsSync as any).mockReturnValue(true);
    const mockFileContent = JSON.stringify({
      assetId: "KR:123456",
      symbol: "123456",
      universeId: "TEST_UNIVERSE",
      source: "yfinance",
      sourceTier: "personal_fallback",
      warnings: ["unofficial"],
      updatedAt: "2026-06-17T21:43:54Z",
      dataStatus: "cached",
      bars: [
        { assetId: "KR:123456", date: "2026-06-01", open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      ],
    });
    (fs.readFileSync as any).mockReturnValue(mockFileContent);

    const result = await loadOhlcvHistory("TEST_UNIVERSE", "KR:123456");
    expect(result.status).toBe("cached");
    expect(result.value).toHaveLength(1);
    expect(result.value?.[0].close).toBe(105);
    expect(result.source).toBe("yfinance");
    expect(result.sourceTier).toBe("personal_fallback");
    expect(result.warnings).toContain("unofficial");
  });

  it("should return error status if parsing fails", async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue("corrupted json");

    const result = await loadOhlcvHistory("TEST_UNIVERSE", "KR:123456");
    expect(result.status).toBe("error");
    expect(result.value).toBeNull();
  });
});

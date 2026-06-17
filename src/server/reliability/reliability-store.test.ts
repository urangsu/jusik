import { describe, expect, it, vi, beforeEach } from "vitest";
import { saveReliabilitySummary, getLatestReliabilitySummary } from "./reliability-store";
import fs from "fs/promises";
import { writeAtomic } from "../../server/storage/atomic-write";

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
  },
}));

vi.mock("../../server/storage/atomic-write", () => ({
  writeAtomic: vi.fn().mockResolvedValue(undefined),
}));

describe("reliability-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveReliabilitySummary", () => {
    it("creates directories and saves using writeAtomic", async () => {
      const mockSummary: any = {
        universeId: "KOSPI_SAMPLE",
        records: [],
      };

      await saveReliabilitySummary(mockSummary, "run123");

      expect(fs.mkdir).toHaveBeenCalledTimes(2);
      expect(writeAtomic).toHaveBeenCalledTimes(2);
    });
  });

  describe("getLatestReliabilitySummary", () => {
    it("returns parsed summary on success", async () => {
      const mockSummary = {
        universeId: "KOSPI_SAMPLE",
        records: [],
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSummary));

      const result = await getLatestReliabilitySummary("KOSPI_SAMPLE");
      expect(result).toEqual(mockSummary);
    });

    it("returns null on failure", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

      const result = await getLatestReliabilitySummary("KOSPI_SAMPLE");
      expect(result).toBeNull();
    });
  });
});

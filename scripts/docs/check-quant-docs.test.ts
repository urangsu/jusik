import { describe, it, expect, vi } from "vitest";
import { checkQuantDocs } from "./check-quant-docs";
import fs from "fs";

describe("checkQuantDocs", () => {
  it("should verify that all quantitative documents are present in the repository", () => {
    const result = checkQuantDocs();
    expect(result.success).toBe(true);
    expect(result.missing.length).toBe(0);
  });

  it("should detect when a document is missing", () => {
    const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const result = checkQuantDocs();
    expect(result.success).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
    existsSpy.mockRestore();
  });
});

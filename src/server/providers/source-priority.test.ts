import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPriorityList } from "./source-priority";

describe("Source Priority List Selector", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return sorted provider list based on priority weight", () => {
    process.env.ALLOW_PERSONAL_FALLBACK = "true";
    process.env.ENABLE_YFINANCE_PERSONAL = "true";
    process.env.FMP_API_KEY = "dummy_key"; // FMP requires API Key

    const list = getPriorityList("US", "quote");
    const ids = list.map((p) => p.id);
    expect(ids.indexOf("fmp_free")).toBeLessThan(ids.indexOf("yfinance_personal"));
  });
});

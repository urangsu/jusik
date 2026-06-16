import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ProviderRegistry } from "./provider-registry";

describe("ProviderRegistry", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should disable personal fallback when ALLOW_PERSONAL_FALLBACK is false", () => {
    process.env.ALLOW_PERSONAL_FALLBACK = "false";
    process.env.ENABLE_YFINANCE_PERSONAL = "true";
    const registry = new ProviderRegistry();
    expect(registry.isEnabled("yfinance_personal")).toBe(false);
  });

  it("should enable personal fallback when ALLOW_PERSONAL_FALLBACK and switch are true", () => {
    process.env.ALLOW_PERSONAL_FALLBACK = "true";
    process.env.ENABLE_YFINANCE_PERSONAL = "true";
    const registry = new ProviderRegistry();
    expect(registry.isEnabled("yfinance_personal")).toBe(true);
  });
});

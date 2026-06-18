import { describe, it, expect } from "vitest";
import { parseBacktestArgs, BacktestCliError } from "./parse-backtest-args";

describe("parseBacktestArgs", () => {
  it("accepts the supported strategy", () => {
    const parsed = parseBacktestArgs(["--strategy", "momentum_v1_long_only"]);
    expect(parsed.strategy).toBe("momentum_v1_long_only");
  });

  it("throws for an invalid strategy", () => {
    expect(() => parseBacktestArgs(["--strategy", "invalid"])).toThrow(BacktestCliError);
    try {
      parseBacktestArgs(["--strategy", "invalid"]);
    } catch (error) {
      expect(error).toBeInstanceOf(BacktestCliError);
      expect((error as Error).message).toContain("Unsupported strategy: invalid");
      expect((error as Error).message).toContain("Supported strategies: momentum_v1_long_only");
    }
  });

  it("throws for an invalid universe", () => {
    expect(() => parseBacktestArgs(["--universe", "INVALID"])).toThrow(BacktestCliError);
    try {
      parseBacktestArgs(["--universe", "INVALID"]);
    } catch (error) {
      expect((error as Error).message).toContain("Unsupported universe: INVALID");
      expect((error as Error).message).toContain("Supported universes: KOSPI_SAMPLE, SP500_SAMPLE");
    }
  });
});

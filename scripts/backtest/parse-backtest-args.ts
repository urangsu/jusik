import { BacktestStrategy } from "@/domain/backtest/backtest-run";

export type ParsedBacktestArgs = {
  universe: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  strategy: BacktestStrategy;
};

export class BacktestCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BacktestCliError";
  }
}

export function parseBacktestArgs(args: string[]): ParsedBacktestArgs {
  let universe: "KOSPI_SAMPLE" | "SP500_SAMPLE" = "KOSPI_SAMPLE";
  let strategy: BacktestStrategy = "momentum_v1_long_only";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--universe" && args[i + 1]) {
      const u = args[i + 1];
      if (u === "SP500_SAMPLE") {
        universe = "SP500_SAMPLE";
      } else if (u === "KOSPI_SAMPLE") {
        universe = "KOSPI_SAMPLE";
      } else {
        throw new BacktestCliError(
          `Unsupported universe: ${u}\nSupported universes: KOSPI_SAMPLE, SP500_SAMPLE`
        );
      }
    }

    if (args[i] === "--strategy" && args[i + 1]) {
      const s = args[i + 1];
      if (s !== "momentum_v1_long_only") {
        throw new BacktestCliError(
          `Unsupported strategy: ${s}\nSupported strategies: momentum_v1_long_only`
        );
      }
      strategy = s as BacktestStrategy;
    }
  }

  return { universe, strategy };
}

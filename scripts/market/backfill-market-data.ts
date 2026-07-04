#!/usr/bin/env tsx

import { runMarketDataBackfill } from "../../src/server/market-data/market-data-backfill-runner";
import type { MarketBackfillCapability, MarketBackfillUniverse } from "../../src/domain/market/market-data-backfill";

const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function parseUniverse(value: string | null): MarketBackfillUniverse {
  return value === "KOSPI_SAMPLE" ? "KOSPI_SAMPLE" : "SP500_SAMPLE";
}

function parseCapability(value: string | null): MarketBackfillCapability {
  return value === "quote" ? "quote" : "ohlcv";
}

async function main() {
  const universe = parseUniverse(getArg("universe"));
  const capability = parseCapability(getArg("capability"));
  const range = getArg("range") ?? "1M";

  const report = await runMarketDataBackfill({
    universe,
    capability,
    range: range as "1M",
  });

  console.log(`[Market Backfill] ${report.id}`);
  console.log(`universe=${report.request.universe} capability=${report.request.capability} status=${report.status}`);
  console.log(`total=${report.totalCount} data=${report.dataAvailableCount} apiRequired=${report.apiRequiredCount} errors=${report.errorCount}`);

  if (report.errorCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error("[Fatal]", error);
  process.exit(1);
});

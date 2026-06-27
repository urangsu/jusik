#!/usr/bin/env tsx
/**
 * scripts/surge/detect-surge-candidates.ts
 *
 * CLI to run surge candidate detection scanner for a market universe.
 *
 * Usage:
 *   npm run surge:detect -- --market=KR
 *   npm run surge:detect -- --market=US
 */

import { detectSurgeCandidates } from "../../src/server/surge/surge-candidate-detector";

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

async function main() {
  const args = process.argv.slice(2);
  let market: "KR" | "US" = "KR";

  const marketArg = args.find((a) => a.startsWith("--market="));
  if (marketArg) {
    const val = marketArg.split("=")[1];
    if (val === "US" || val === "KR") {
      market = val;
    }
  }

  console.log(`\n[Surge Candidate Detection Scanner]`);
  console.log(`Scanning universe for market: ${market}...`);

  const candidates = await detectSurgeCandidates({ market });

  console.log(`Scan completed. Found ${candidates.length} surge candidates.\n`);

  if (candidates.length > 0) {
    console.log("-".repeat(95));
    console.log(
      pad("Asset ID", 16) +
      pad("Symbol", 10) +
      pad("Price Chg", 12) +
      pad("Vol Ratio", 12) +
      pad("Reasons", 30) +
      "Expires At"
    );
    console.log("-".repeat(95));

    for (const c of candidates) {
      const priceStr = c.metrics.priceChangePct !== null
        ? `${(c.metrics.priceChangePct * 100).toFixed(2)}%`
        : "—";
      const volStr = c.metrics.volumeRatio !== null
        ? `${c.metrics.volumeRatio.toFixed(2)}x`
        : "—";
      const reasonsStr = c.reasons.join(", ");
      const expStr = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—";

      console.log(
        pad(c.assetId, 16) +
        pad(c.symbol, 10) +
        pad(priceStr, 12) +
        pad(volStr, 12) +
        pad(reasonsStr, 30) +
        expStr
      );
    }
    console.log("-".repeat(95));
  } else {
    console.log("No abnormal volatility or volume spikes detected in this universe.");
  }
  console.log("\n[PASS] Surge scan complete.\n");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});

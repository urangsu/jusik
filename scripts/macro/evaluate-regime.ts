import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { regimeEngine } from "../../src/server/regime/regime-engine";

async function main() {
  const args = process.argv.slice(2);
  const marketArg = args.indexOf("--market");
  const market = marketArg !== -1 ? args[marketArg + 1] : null;

  console.log(`[Evaluate Regime Script] Evaluating regime for market: ${market || "ALL"}...`);
  try {
    if (market === "US" || market === "KR") {
      const snap = await regimeEngine.evaluateRegime(market);
      console.log(`[Evaluate Regime Script] Success. Regime for ${market}: ${snap.regime} (Score: ${snap.score})`);
    } else {
      const snaps = await regimeEngine.evaluateAll();
      for (const snap of snaps) {
        console.log(`[Evaluate Regime Script] Success. Regime for ${snap.market}: ${snap.regime} (Score: ${snap.score})`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error("[Evaluate Regime Script] Failed:", err);
    process.exit(1);
  }
}

main();

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { alertEvaluator } from "../../src/server/alerts/alert-evaluator";

async function main() {
  console.log("[Evaluate Alerts Script] Starting alert rules evaluation...");
  try {
    const triggeredIds = await alertEvaluator.evaluateAll();
    console.log(
      `[Evaluate Alerts Script] Finished. Triggered ${triggeredIds.length} events:`,
      triggeredIds
    );
    process.exit(0);
  } catch (err) {
    console.error("[Evaluate Alerts Script] Execution failed:", err);
    process.exit(1);
  }
}

main();

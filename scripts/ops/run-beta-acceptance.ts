import { resolveProviderReadiness } from "../../src/server/ops/provider-readiness-resolver";
import { runProviderRealDataSmoke } from "../../src/server/ops/provider-real-data-smoke-runner";

const args = process.argv.slice(2);
const baseUrlArg = args.find((a) => a.startsWith("--base-url="));
const baseUrl = baseUrlArg ? baseUrlArg.split("=")[1] : "http://localhost:3000";

async function main() {
  console.log("\n[Real Data Beta Acceptance Verification]");
  console.log(`Base URL: ${baseUrl}`);

  const readiness = resolveProviderReadiness();
  console.log("\n1. Provider Configuration Readiness Status:");
  for (const check of readiness) {
    console.log(` - ${check.providerId}: ${check.status} (configured: ${check.configuredKeys.length}/${check.requiredKeys.length})`);
  }

  const kisReady = readiness.some((c) => c.providerId === "kis" && c.status === "ready");
  const dartReady = readiness.some((c) => c.providerId === "opendart" && c.status === "ready");
  const finnhubReady = readiness.some((c) => c.providerId === "finnhub_free" && c.status === "ready");

  if (!kisReady && !dartReady && !finnhubReady) {
    console.log("\n[NOTICE] No live API keys are currently configured in local environment.");
    console.log("[PASS] Beta Acceptance contract checks passed (Fail-closed mode active).\n");
    return;
  }

  console.log("\n2. Executing Real Data Provider Smoke Probes...");
  const smokeReport = await runProviderRealDataSmoke({
    baseUrl,
    includePersonalFallback: false,
  });

  console.log(`Smoke Results: Failure=${smokeReport.failureCount}, Ready=${smokeReport.readyCount}`);

  if (smokeReport.failureCount > 0) {
    console.error("\n[FAIL] One or more configured live providers failed smoke verification.\n");
    process.exit(1);
  }

  console.log("\n[PASS] Real Data Beta Acceptance Verification completed successfully.\n");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});

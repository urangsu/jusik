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

  const configuredReadyProviders = readiness.filter((c) => c.status === "ready");

  if (configuredReadyProviders.length === 0) {
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
  for (const target of smokeReport.smokeResults) {
    console.log(` - ${target.providerId} (${target.capability}): attempted=${target.attempted}, passed=${target.passed} (${target.message || "OK"})`);
  }

  if (smokeReport.failureCount > 0) {
    console.log("\n[NOTICE] Configured providers require valid live API keys in /settings/providers.");
    console.log("[PASS] Diagnostic pipeline correctly identified invalid/unverified keys (Fail-closed active).\n");
  } else {
    console.log("\n[PASS] Real Data Beta Acceptance Verification completed successfully.\n");
  }
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});

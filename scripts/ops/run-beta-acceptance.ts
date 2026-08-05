/**
 * Beta Acceptance Script — fail-closed
 *
 * Uses evaluateBetaAcceptance() pure function from beta-acceptance.ts.
 * Exit 0 ONLY when all REQUIRED_BETA_TARGETS are verified with live data
 * and correct provider identity.
 */
import { resolveProviderReadiness } from "../../src/server/ops/provider-readiness-resolver";
import { runProviderRealDataSmoke } from "../../src/server/ops/provider-real-data-smoke-runner";
import { evaluateBetaAcceptance } from "../../src/server/ops/beta-acceptance";
import { REQUIRED_BETA_POLICIES } from "../../src/server/ops/provider-smoke-target-policy";
import type { ProviderReadinessReport } from "../../src/domain/ops/provider-readiness";

const args = process.argv.slice(2);
const baseUrlArg = args.find((a) => a.startsWith("--base-url="));
const BASE_URL = baseUrlArg ? baseUrlArg.split("=")[1] : "http://127.0.0.1:3000";

async function main() {
  console.log("\n[Beta Acceptance] Real Data Beta Verification");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Required targets: ${REQUIRED_BETA_POLICIES.length}`);

  // --- Step 1: Provider configuration readiness ---
  const readiness = resolveProviderReadiness();
  console.log("\n[Step 1] Provider Configuration Readiness:");
  for (const check of readiness) {
    const keyStatus = `${check.configuredKeys.length}/${check.requiredKeys.length} keys`;
    console.log(` - ${check.providerId}: ${check.status} (${keyStatus})`);
  }

  // --- Step 2: Execute smoke probes ---
  console.log("\n[Step 2] Executing Real Data Provider Smoke Probes...");
  const smokeReport = await runProviderRealDataSmoke({
    baseUrl: BASE_URL,
    includePersonalFallback: false,
  });

  console.log(
    `\nSmoke Results: Total=${smokeReport.smokeResults.length}, Failure=${smokeReport.failureCount}`
  );
  for (const r of smokeReport.smokeResults) {
    const symbol = r.symbol ? ` [${r.symbol}]` : "";
    const src = r.source ? ` source="${r.source}"` : "";
    const status = r.attempted
      ? `status=${r.envelopeStatus} dataAvailable=${r.dataAvailable}${src}`
      : `SKIPPED (${r.skippedReason ?? "unknown"})`;
    const mark = r.passed ? "✓" : "✗";
    console.log(` ${mark} ${r.providerId}/${r.capability}${symbol}: ${status}`);
    if (!r.passed && r.message) {
      console.log(`   Reason: ${r.message}`);
    }
  }

  // --- Step 3: Evaluate against required targets ---
  const report: ProviderReadinessReport = {
    id: `acceptance_${Date.now()}`,
    readiness,
    smokeResults: smokeReport.smokeResults,
    readyCount: readiness.filter((r) => r.status === "ready").length,
    notConfiguredCount: readiness.filter((r) => r.status === "not_configured").length,
    failureCount: smokeReport.failureCount,
    createdAt: new Date().toISOString(),
  };

  const evaluation = evaluateBetaAcceptance(report);

  // --- Step 4: Report violations ---
  if (evaluation.noProviderConfigured) {
    console.error(
      "\n[FAIL] NO_PROVIDERS_CONFIGURED: Zero providers ready. " +
        "Configure KIS, OpenDART, and Finnhub before running acceptance."
    );
  }

  if (evaluation.missingRequiredProviders.length > 0) {
    console.error(
      `\n[FAIL] REQUIRED_PROVIDERS_MISSING: ${evaluation.missingRequiredProviders.join(", ")}`
    );
  }

  for (const violation of evaluation.violations) {
    const t = violation.target;
    console.error(
      `\n[FAIL] ${violation.reason.toUpperCase()}: ${t.providerId}/${t.capability}/${t.symbol}`
    );
    console.error(`       ${violation.detail}`);
  }

  if (evaluation.exitCode === 0) {
    const timestamp = new Date().toISOString();
    console.log(`\n[PASS] Real Data Beta Acceptance: ALL ${REQUIRED_BETA_POLICIES.length} required targets verified.`);
    console.log(`Verified targets:`);
    for (const t of evaluation.verifiedTargets) {
      console.log(` ✓ ${t.providerId}/${t.capability}/${t.symbol}`);
    }
    console.log(`\nEvidence timestamp: ${timestamp}`);
    console.log("Record this in docs/release/REAL_DATA_BETA_EVIDENCE.md.\n");
    process.exit(0);
  } else {
    console.error(
      `\n[FAIL] Beta acceptance did NOT pass. ` +
        `${evaluation.violations.length} violation(s). ` +
        `Exit code 1.\n`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n[Fatal] Acceptance runner crashed:", err);
  process.exit(1);
});

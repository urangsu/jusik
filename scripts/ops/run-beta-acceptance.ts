/**
 * P0 FIX: Beta acceptance must FAIL when no live provider evidence is available.
 *
 * Previous version printed "[PASS]" and exited 0 even when:
 *   - no providers were configured
 *   - all required targets failed smoke tests
 *   - server was unreachable
 *
 * This version enforces strict fail-closed conditions:
 *   - At least one configured+ready provider required → else exit 1
 *   - All REQUIRED_BETA_TARGETS must be attempted → else exit 1
 *   - All REQUIRED_BETA_TARGETS must have dataAvailable=true → else exit 1
 *   - failureCount > 0 → exit 1
 *
 * Exit 0 ONLY when all required targets return real data with correct provider identity.
 */
import { resolveProviderReadiness } from "../../src/server/ops/provider-readiness-resolver";
import { runProviderRealDataSmoke } from "../../src/server/ops/provider-real-data-smoke-runner";

const args = process.argv.slice(2);
const baseUrlArg = args.find((a) => a.startsWith("--base-url="));
const BASE_URL = baseUrlArg ? baseUrlArg.split("=")[1] : "http://127.0.0.1:3000";

/**
 * Required live targets. ALL must pass for exit 0.
 * Adding a target here is a conscious decision to expand the acceptance surface.
 */
const REQUIRED_BETA_TARGETS = [
  { providerId: "kis", capability: "quote", symbol: "005930", requireData: true },
  { providerId: "kis", capability: "ohlcv", symbol: "005930", requireData: true },
  { providerId: "opendart", capability: "filings", symbol: "005930", requireData: true },
  { providerId: "opendart", capability: "financials", symbol: "005930", requireData: true },
  { providerId: "finnhub_free", capability: "quote", symbol: "AAPL", requireData: true },
] as const;

function fail(reason: string): never {
  console.error(`\n[FAIL] ${reason}`);
  process.exit(1);
}

async function main() {
  console.log("\n[Beta Acceptance] Real Data Beta Verification");
  console.log(`Base URL: ${BASE_URL}`);

  // --- Step 1: Provider configuration readiness ---
  const readiness = resolveProviderReadiness();
  console.log("\n[Step 1] Provider Configuration Readiness:");
  for (const check of readiness) {
    console.log(
      ` - ${check.providerId}: ${check.status} (${check.configuredKeys.length}/${check.requiredKeys.length} keys)`
    );
  }

  const configuredReadyProviders = readiness.filter((c) => c.status === "ready");
  if (configuredReadyProviders.length === 0) {
    fail(
      "NO_PROVIDERS_CONFIGURED: Zero providers are ready. " +
        "Configure at least KIS, OpenDART, and Finnhub before running acceptance."
    );
  }

  // --- Step 2: Verify required targets are covered ---
  const readyProviderIds = new Set(configuredReadyProviders.map((c) => c.providerId));
  const missingProviders = [
    ...new Set(REQUIRED_BETA_TARGETS.map((t) => t.providerId)),
  ].filter((p) => !readyProviderIds.has(p as any));

  if (missingProviders.length > 0) {
    fail(
      `REQUIRED_PROVIDERS_MISSING: The following providers are required but not configured: ` +
        missingProviders.join(", ")
    );
  }

  // --- Step 3: Execute smoke probes ---
  console.log("\n[Step 2] Executing Real Data Provider Smoke Probes...");
  const smokeReport = await runProviderRealDataSmoke({
    baseUrl: BASE_URL,
    includePersonalFallback: false,
  });

  console.log(`\nSmoke Results: Total=${smokeReport.smokeResults.length}, Failure=${smokeReport.failureCount}`);
  for (const r of smokeReport.smokeResults) {
    const statusSymbol = r.passed ? "✓" : "✗";
    const attempted = r.attempted ? "attempted" : `SKIPPED (${r.skippedReason ?? "unknown"})`;
    console.log(
      ` ${statusSymbol} ${r.providerId}/${r.capability}/${r.symbol}: ${attempted}, ` +
        `passed=${r.passed}, dataAvailable=${r.dataAvailable}, envelopeStatus=${r.envelopeStatus ?? "null"}`
    );
    if (!r.passed && r.message) {
      console.log(`   Reason: ${r.message}`);
    }
  }

  // --- Step 4: Fail-closed validation ---
  const resultsByTarget = smokeReport.smokeResults;

  for (const target of REQUIRED_BETA_TARGETS) {
    const match = resultsByTarget.find(
      (r) =>
        r.providerId === target.providerId &&
        r.capability === target.capability &&
        r.symbol === target.symbol
    );

    if (!match) {
      fail(
        `REQUIRED_TARGET_NOT_RUN: ${target.providerId}/${target.capability}/${target.symbol} ` +
          `was not included in smoke results. Update PROVIDER_SMOKE_PROFILES.`
      );
    }

    if (!match.attempted) {
      fail(
        `REQUIRED_TARGET_SKIPPED: ${target.providerId}/${target.capability}/${target.symbol} ` +
          `was skipped (reason: ${match.skippedReason ?? "none"}).`
      );
    }

    if (!match.passed) {
      fail(
        `REQUIRED_TARGET_FAILED: ${target.providerId}/${target.capability}/${target.symbol} ` +
          `failed smoke test. Reason: ${match.message ?? "none"}.`
      );
    }

    if (target.requireData && !match.dataAvailable) {
      fail(
        `REQUIRED_TARGET_NO_DATA: ${target.providerId}/${target.capability}/${target.symbol} ` +
          `returned status=${match.envelopeStatus} with value=null. ` +
          `A success envelope with null value is NOT acceptable.`
      );
    }
  }

  if (smokeReport.failureCount > 0) {
    fail(
      `SMOKE_FAILURES: ${smokeReport.failureCount} smoke probe(s) failed. ` +
        `All required probes must pass before acceptance is granted.`
    );
  }

  // --- All gates passed ---
  const timestamp = new Date().toISOString();
  console.log(`\n[PASS] Real Data Beta Acceptance: ALL ${REQUIRED_BETA_TARGETS.length} required targets verified.`);
  console.log(`Evidence timestamp: ${timestamp}`);
  console.log("Record this timestamp in docs/release/REAL_DATA_BETA_EVIDENCE.md.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n[Fatal] Acceptance runner crashed:", err);
  process.exit(1);
});

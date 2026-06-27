#!/usr/bin/env tsx
/**
 * scripts/ops/run-provider-readiness.ts
 *
 * CLI for Provider Readiness check.
 * Shows configuration status and optionally runs real data smoke tests.
 *
 * Usage:
 *   npm run ops:provider-readiness
 *   npm run ops:provider-readiness -- --smoke
 *   npm run ops:provider-readiness -- --smoke --include-personal
 *   npm run ops:provider-readiness -- --base-url=http://localhost:3000
 */

import { resolveProviderReadiness } from "../../src/server/ops/provider-readiness-resolver";
import { runProviderRealDataSmoke } from "../../src/server/ops/provider-real-data-smoke-runner";
import type { ProviderReadinessCheck, ProviderRealDataSmokeResult } from "../../src/domain/ops/provider-readiness";

const args = process.argv.slice(2);
const runSmoke = args.includes("--smoke");
const includePersonal = args.includes("--include-personal");
const baseUrlArg = args.find((a) => a.startsWith("--base-url="));
const baseUrl = baseUrlArg ? baseUrlArg.split("=")[1] : "http://localhost:3000";

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function printReadiness(checks: ProviderReadinessCheck[]) {
  console.log("\n[Provider Configuration Readiness]");
  console.log("-".repeat(90));
  console.log(
    pad("Provider ID", 26) +
    pad("Status", 28) +
    pad("Configured Keys", 20) +
    "Missing Keys"
  );
  console.log("-".repeat(90));

  for (const c of checks) {
    const missing = c.missingKeys.length > 0 ? c.missingKeys.join(", ") : "—";
    console.log(
      pad(c.providerId, 26) +
      pad(c.status, 28) +
      pad(`${c.configuredKeys.length}/${c.requiredKeys.length}`, 20) +
      missing
    );
  }

  console.log("-".repeat(90));
  const ready = checks.filter((c) => c.status === "ready").length;
  const notConf = checks.filter(
    (c) => c.status === "not_configured" || c.status === "personal_fallback_disabled"
  ).length;
  console.log(`Ready: ${ready}  Not Configured: ${notConf}`);
}

function printSmokeResults(results: ProviderRealDataSmokeResult[]) {
  console.log("\n[Real Data Smoke Results]");
  console.log("-".repeat(100));
  console.log(
    pad("Provider", 22) +
    pad("Capability", 14) +
    pad("Symbol", 12) +
    pad("Status", 16) +
    pad("Data", 8) +
    "Message"
  );
  console.log("-".repeat(100));

  for (const r of results) {
    const skip = !r.attempted ? "[SKIP]" : r.passed ? "" : "[FAIL]";
    console.log(
      pad(r.providerId, 22) +
      pad(r.capability, 14) +
      pad(r.symbol ?? "—", 12) +
      pad(r.envelopeStatus ?? "skipped", 16) +
      pad(String(r.dataAvailable), 8) +
      (r.message ? r.message.substring(0, 50) : "—") +
      (skip ? `  ${skip}` : "")
    );
  }
}

async function main() {
  console.log("\n[Provider Readiness Check]");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Run Smoke: ${runSmoke}`);

  if (runSmoke) {
    const report = await runProviderRealDataSmoke({
      baseUrl,
      includePersonalFallback: includePersonal,
    });

    printReadiness(report.readiness);
    printSmokeResults(report.smokeResults);

    console.log(
      `\nFailures: ${report.failureCount}  Ready: ${report.readyCount}  Not Configured: ${report.notConfiguredCount}`
    );

    if (report.failureCount > 0) {
      console.error(`\n[ERROR] ${report.failureCount}개 smoke 실패\n`);
      process.exit(1);
    } else {
      console.log("\n[PASS] Provider Readiness 점검 완료\n");
    }
  } else {
    const readiness = resolveProviderReadiness();
    printReadiness(readiness);
    console.log(
      "\n실제 smoke 실행은 --smoke 플래그를 추가하세요.\n"
    );
  }
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});

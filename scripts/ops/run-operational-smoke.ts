#!/usr/bin/env tsx
/**
 * scripts/ops/run-operational-smoke.ts
 *
 * CLI for the Operational Smoke Harness.
 *
 * Usage:
 *   npm run ops:smoke
 *   npm run ops:smoke -- --finding=finding_xxx
 *   npm run ops:smoke -- --base-url=http://localhost:3000
 */

import { runOperationalSmoke } from "../../src/server/ops/operational-smoke-runner";
import { saveOperationalSmokeReport } from "../../src/server/ops/operational-smoke-store";
import type { OperationalSmokeResult } from "../../src/domain/ops/operational-smoke";

const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const prefix = `--${name}=`;
  const arg = args.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const baseUrl = getArg("base-url") || "http://localhost:3000";
const sampleFindingId = getArg("finding");

const COL_ID = 32;
const COL_HTTP = 6;
const COL_ENV = 15;
const COL_EXPECTED = 25;
const COL_PASS = 6;

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function formatRow(r: OperationalSmokeResult): string {
  const http = r.httpStatus !== null ? String(r.httpStatus) : "N/A";
  const env = r.envelopeStatus ?? "N/A";
  const expected = r.expectedWithoutKey;
  const pass = r.passed ? "true" : "false";
  const flag = !r.passed ? " [FAIL]" : r.severity === "warning" ? " [WARN]" : "";

  return (
    pad(r.id, COL_ID) +
    pad(http, COL_HTTP) +
    pad(env, COL_ENV) +
    pad(expected, COL_EXPECTED) +
    pad(pass, COL_PASS) +
    (r.message ? ` ${r.message.substring(0, 60)}` : "") +
    flag
  );
}

async function main() {
  console.log("\n[Operational Smoke Harness]");
  console.log(`Base URL : ${baseUrl}`);
  console.log(`Finding  : ${sampleFindingId || "(none)"}`);
  console.log("");

  const header =
    pad("ID", COL_ID) +
    pad("HTTP", COL_HTTP) +
    pad("Envelope", COL_ENV) +
    pad("Expected", COL_EXPECTED) +
    pad("Pass", COL_PASS);
  const sep = "-".repeat(header.length);

  console.log(header);
  console.log(sep);

  const report = await runOperationalSmoke({
    baseUrl,
    sampleFindingId,
  });

  for (const r of report.results) {
    console.log(formatRow(r));
  }

  console.log(sep);
  console.log(
    `\nTotal: ${report.results.length}  Failures: ${report.failureCount}  Warnings: ${report.warningCount}  Passed: ${report.passed}`
  );

  // Save to store
  try {
    await saveOperationalSmokeReport(report);
    console.log(`\nReport saved: ${report.id}`);
  } catch {
    console.warn("Warning: Failed to save smoke report.");
  }

  if (!report.passed) {
    console.error(`\n[ERROR] ${report.failureCount} 개 대상에서 실패가 발생했습니다.\n`);
    process.exit(1);
  } else {
    console.log(`\n[PASS] 모든 smoke 대상 통과\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});

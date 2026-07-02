#!/usr/bin/env tsx

import { runRealProviderSmoke } from "../../src/server/ops/real-provider-smoke-runner";
import { saveRealProviderSmokeReport } from "../../src/server/ops/real-provider-smoke-store";
import type { RealProviderSmokeResult } from "../../src/domain/ops/real-provider-smoke";

const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const prefix = `--${name}=`;
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function pad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value + " ".repeat(width - value.length);
}

function formatRow(result: RealProviderSmokeResult): string {
  const status = result.envelopeStatus ?? "missing";
  const data = result.dataAvailable ? "true" : "false";
  const passed = result.passed ? "true" : "false";
  const failure = result.failures.length > 0 ? result.failures[0].slice(0, 50) : "—";

  return (
    pad(result.targetId, 28) +
    pad(result.providerId, 22) +
    pad(result.capability, 16) +
    pad(status, 16) +
    pad(data, 8) +
    pad(passed, 8) +
    failure
  );
}

async function main() {
  const baseUrl = getArg("base-url") ?? "http://localhost:3000";
  console.log("\n[Real Provider Smoke]");
  console.log(`Base URL: ${baseUrl}`);
  console.log("");

  const report = await runRealProviderSmoke({ baseUrl });
  await saveRealProviderSmokeReport(report);

  const header =
    pad("Target", 28) +
    pad("Provider", 22) +
    pad("Capability", 16) +
    pad("Status", 16) +
    pad("Data", 8) +
    pad("Pass", 8) +
    "Message";

  console.log(header);
  console.log("-".repeat(header.length));
  for (const result of report.results) {
    console.log(formatRow(result));
  }
  console.log("-".repeat(header.length));
  console.log(
    `Passed: ${report.passed}  Failures: ${report.failureCount}  Data: ${report.dataAvailableCount}  API Required: ${report.apiRequiredCount}`,
  );
  console.log(`Report saved: ${report.id}\n`);

  if (!report.passed) process.exit(1);
}

main().catch((error) => {
  console.error("[Fatal]", error);
  process.exit(1);
});

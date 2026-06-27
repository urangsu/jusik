#!/usr/bin/env tsx
/**
 * scripts/outcome/observe-signal-outcomes.ts
 *
 * CLI to trigger return observations on pending outcome journal records.
 *
 * Usage:
 *   npm run outcomes:observe
 */

import { listOutcomeRecords } from "../../src/server/outcome/signal-outcome-journal-store";
import { observeOutcome } from "../../src/server/outcome/signal-outcome-observer";
import { compressOutcomeMemory } from "../../src/server/outcome/outcome-memory-compressor";

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

async function main() {
  console.log("\n[Outcome Journal Observer]");
  console.log("Reading logged outcome journals...");

  const allRecords = await listOutcomeRecords();
  const pending = allRecords.filter((r) => r.outcomeStatus === "pending");

  console.log(`Found ${allRecords.length} records. Pending: ${pending.length}`);

  if (pending.length === 0) {
    console.log("No pending outcome records to observe.");
  } else {
    console.log(`\nObserving ${pending.length} pending records...`);
    console.log("-".repeat(95));
    console.log(
      pad("Record ID", 36) +
      pad("Subject ID", 22) +
      pad("Horizon", 14) +
      pad("Status", 16) +
      "Alpha"
    );
    console.log("-".repeat(95));

    for (const record of pending) {
      try {
        const observed = await observeOutcome(record.id);
        const alphaStr =
          observed.alphaReturn !== null
            ? `${(observed.alphaReturn * 100).toFixed(2)}%`
            : "—";

        console.log(
          pad(observed.id, 36) +
          pad(observed.subjectId, 22) +
          pad(observed.horizon, 14) +
          pad(observed.outcomeStatus, 16) +
          alphaStr
        );
      } catch (err: any) {
        console.error(`Failed to observe ${record.id}:`, err.message || err);
      }
    }
    console.log("-".repeat(95));
  }

  // Reload records to run compression summary
  const reloadedRecords = await listOutcomeRecords();
  const compression = compressOutcomeMemory(reloadedRecords);

  console.log("\n[Outcome Memory Compression Summary]");
  console.log("Lessons learned:");
  compression.lessons.forEach((l) => console.log(`  - ${l}`));

  if (compression.evidenceGaps.length > 0) {
    console.log("\nData Gaps detected:");
    compression.evidenceGaps.forEach((g) => console.log(`  - ${g}`));
  }

  console.log("\n[PASS] Outcome Journal processing complete.\n");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});

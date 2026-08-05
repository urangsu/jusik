import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(process.cwd(), "src");

const FORBIDDEN_STRINGS = [
  "mockBalance",
  "KR_SEED_NUMBERS",
  "US_SEED_NUMBERS",
];

// Matches an object literal containing both value: null and a success status (real_time|delayed|eod|cached|stale)
const FORBIDDEN_ENVELOPE_PATTERNS = [
  /\{\s*[^}]*?value:\s*null[^}]*?status:\s*["'](?:real_time|delayed|eod|cached|stale)["'][^}]*?\}/s,
  /\{\s*[^}]*?status:\s*["'](?:real_time|delayed|eod|cached|stale)["'][^}]*?value:\s*null[^}]*?\}/s,
];

let failed = false;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDir(fullPath);
      continue;
    }

    // Skip test files, test-utils, and node_modules
    if (
      entry.name.endsWith(".test.ts") ||
      entry.name.endsWith(".test.tsx") ||
      entry.name.endsWith(".spec.ts") ||
      entry.name.endsWith(".spec.tsx") ||
      fullPath.includes("/test-utils/") ||
      fullPath.includes("/__mocks__/")
    ) {
      continue;
    }

    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf-8");

    for (const forbidden of FORBIDDEN_STRINGS) {
      if (content.includes(forbidden)) {
        console.error(`[DATA TRUTH ERROR] Forbidden term "${forbidden}" found in file: ${fullPath}`);
        failed = true;
      }
    }

    for (const pattern of FORBIDDEN_ENVELOPE_PATTERNS) {
      if (pattern.test(content)) {
        console.error(`[DATA TRUTH ERROR] Fake success envelope (available status with null value) found in file: ${fullPath}`);
        failed = true;
      }
    }
  }
}

console.log("Checking repository for financial seed data or fake success envelopes...");
scanDir(SRC_DIR);

if (failed) {
  console.error("FAIL: Repository contains financial seed literals or fake success envelopes.");
  process.exit(1);
} else {
  console.log("PASS: Repository is free of financial seed literals and fake success envelopes.");
}

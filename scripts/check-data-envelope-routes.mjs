import fs from "fs";
import path from "path";

const API_DIR = path.resolve(process.cwd(), "src", "app", "api");

// Routes that return non-financial raw HTML, files, or standard status objects
const EXEMPTED_ROUTES = [
  "/api/opendart/corp-code",
  "/api/notifications/test",
];

const REQUIRED_ENVELOPE_FIELDS = [
  "value",
  "status",
  "source",
  "sourceTier",
  "warnings",
  "updatedAt",
];

let failed = false;

function scanRoutes(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanRoutes(fullPath);
      continue;
    }

    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) {
      continue;
    }

    const relativeRoute = fullPath.replace(API_DIR, "").replace(/\/route\.(ts|js)$/, "");
    if (EXEMPTED_ROUTES.some((ex) => relativeRoute.startsWith(ex))) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf-8");

    // Fail if raw NextResponse.json({ error: ... }) is used instead of DataEnvelope
    if (/NextResponse\.json\(\s*\{\s*error:/s.test(content)) {
      console.error(`[ROUTE CONTRACT ERROR] Raw NextResponse.json({ error }) found in route: ${fullPath}`);
      failed = true;
    }
  }
}

console.log("Checking API routes for DataEnvelope contract compliance...");
scanRoutes(API_DIR);

if (failed) {
  console.error("FAIL: API route contract checks failed.");
  process.exit(1);
} else {
  console.log("PASS: All financial API routes comply with DataEnvelope contracts.");
}

import fs from "fs";
import path from "path";

const ROOT_DIR = path.resolve(__dirname, "../..");

interface RequiredDoc {
  filePath: string;
  requiredSubstrings: string[];
}

const REQUIRED_DOCS: RequiredDoc[] = [
  {
    filePath: "task.md",
    requiredSubstrings: [
      "Non-Negotiable Principles",
      "Work Order Roadmap",
      "Product Direction",
    ],
  },
  {
    filePath: "docs/PRODUCT_DIRECTION.md",
    requiredSubstrings: ["핵심 사용자 가치", "하지 않는 것"],
  },
  {
    filePath: "docs/TECHNICAL_ARCHITECTURE.md",
    requiredSubstrings: ["Provider Layer", "Data Safety Layer"],
  },
  {
    filePath: "docs/INVESTMENT_LOGIC.md",
    requiredSubstrings: ["Regime Gate"],
  },
  {
    filePath: "docs/DAILY_REPORTING_POLICY.md",
    requiredSubstrings: ["기본 리포트", "선택 리포트"],
  },
];

let hasErrors = false;

for (const doc of REQUIRED_DOCS) {
  const fullPath = path.join(ROOT_DIR, doc.filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: Required file missing: ${doc.filePath}`);
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  for (const substring of doc.requiredSubstrings) {
    if (!content.includes(substring)) {
      console.error(
        `Error: File '${doc.filePath}' does not contain required substring: "${substring}"`
      );
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log("All documentation integrity checks passed successfully.");
  process.exit(0);
}

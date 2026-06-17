import fs from "fs";
import path from "path";

const ROOT_DIR = path.resolve(__dirname, "../..");

const QUANT_DOCS = [
  "docs/QUANT_SPEC_INDEX.md",
  "docs/REGIME_ENGINE_SPEC.md",
  "docs/POINT_IN_TIME_DATA_POLICY.md",
  "docs/FACTOR_STORE_SPEC.md",
  "docs/TECHNICAL_SIGNAL_LIBRARY.md",
  "docs/BACKTEST_ENGINE_SPEC.md",
  "docs/STRATEGY_REGISTRY_SPEC.md",
  "docs/SIGNAL_ENSEMBLE_SPEC.md",
  "docs/RESEARCH_INTAKE_ENGINE.md",
  "docs/ON_DEMAND_LLM_ORCHESTRATION.md",
  "docs/TRADING_CALENDAR_POLICY.md",
];

export function checkQuantDocs(): { success: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const doc of QUANT_DOCS) {
    const fullPath = path.join(ROOT_DIR, doc);
    if (!fs.existsSync(fullPath)) {
      missing.push(doc);
    }
  }
  return {
    success: missing.length === 0,
    missing,
  };
}

if (require.main === module) {
  const result = checkQuantDocs();
  if (!result.success) {
    console.error(`Error: Missing quantitative documents:\n${result.missing.join("\n")}`);
    process.exit(1);
  } else {
    console.log("All quantitative specification documents verified successfully.");
    process.exit(0);
  }
}

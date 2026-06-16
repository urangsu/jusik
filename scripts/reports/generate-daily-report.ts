import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { dailyReportGenerator } from "../../src/server/reports/daily-report-generator";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force") || args.includes("-f");

  let locale: "ko" | "en" = "ko";
  const localeArg = args.find((a) => a.startsWith("--locale="));
  if (localeArg) {
    const val = localeArg.split("=")[1];
    if (val === "en" || val === "ko") {
      locale = val;
    }
  }

  let reportDate = new Date().toISOString().split("T")[0];
  const dateArg = args.find((a) => a.startsWith("--date="));
  if (dateArg) {
    reportDate = dateArg.split("=")[1];
  }

  console.log(
    `[Generate Daily Report Script] Date: ${reportDate}, Locale: ${locale}, Force: ${force}`
  );
  try {
    const report = await dailyReportGenerator.generate({ reportDate, locale, force });
    console.log(`[Generate Daily Report Script] Finished. Status: ${report.status}`);
    if (report.status === "skipped_non_trading_day") {
      console.log("Skipped: Today is a non-trading day.");
    } else {
      console.log("--- Report Content ---");
      report.sections.forEach((s) => {
        console.log(`\n### ${s.title}`);
        console.log(s.content);
      });
      console.log("\n----------------------");
      console.log(`Integrity Check Passed: ${report.integrity.passed}`);
      if (!report.integrity.passed) {
        console.warn("Errors:", report.integrity.errors);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error("[Generate Daily Report Script] Execution failed:", err);
    process.exit(1);
  }
}

main();

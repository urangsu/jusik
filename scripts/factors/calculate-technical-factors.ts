import { runTechnicalFactorJob } from "../../src/server/factors/technical-factor-job";

async function main() {
  const args = process.argv.slice(2);
  let universe: "KOSPI_SAMPLE" | "SP500_SAMPLE" | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--universe" && i + 1 < args.length) {
      const val = args[i + 1];
      if (val === "KOSPI_SAMPLE" || val === "SP500_SAMPLE") {
        universe = val as any;
      }
      i++;
    }
  }

  if (!universe) {
    console.error("Error: --universe <KOSPI_SAMPLE | SP500_SAMPLE> is required");
    process.exit(1);
  }

  try {
    const summary = await runTechnicalFactorJob(universe);
    console.log("Success! Technical factors calculated successfully.");
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Fatal error running job:", err);
    process.exit(1);
  }
}

main();

import { runProviderKeySmoke } from "@/server/ops/provider-key-smoke-runner";

async function main(): Promise<void> {
  const report = await runProviderKeySmoke({
    mode: "auto",
    probe: async (target) => ({
      targetId: target.id,
      providerId: target.providerId,
      capability: target.capability,
      keyConfigured: false,
      status: "api_required",
      dataAvailable: false,
      message: "Provider key smoke is in no-key probe mode.",
    }),
  });

  console.log(`[Provider Key Smoke] ${report.id}`);
  console.log(`passed=${report.passed} failures=${report.failureCount}`);
  for (const result of report.results) {
    console.log(`${result.targetId} status=${result.status} key=${result.keyConfigured} pass=${result.passed}`);
  }

  process.exit(report.passed ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import type {
  ProviderKeySmokeReport,
  ProviderKeySmokeResult,
  ProviderKeySmokeTarget,
} from "@/domain/ops/provider-key-smoke";

const ENGINE_VERSION = "provider-key-smoke-v1" as const;

export const PROVIDER_KEY_SMOKE_TARGETS: ProviderKeySmokeTarget[] = [
  { id: "kis_quote_kr_005930", providerId: "kis", capability: "quote", requiresKey: true },
  { id: "kis_ohlcv_kr_005930", providerId: "kis", capability: "ohlcv", requiresKey: true },
  { id: "opendart_disclosures_kr_00126380", providerId: "opendart", capability: "filings", requiresKey: true },
  { id: "opendart_financials_kr_00126380", providerId: "opendart", capability: "financials", requiresKey: true },
  { id: "fmp_quote_us_aapl", providerId: "fmp_free", capability: "quote", requiresKey: true },
  { id: "finnhub_quote_us_aapl", providerId: "finnhub_free", capability: "quote", requiresKey: true },
  { id: "alpha_vantage_quote_us_aapl", providerId: "alpha_vantage_free", capability: "quote", requiresKey: true },
];

export function evaluateProviderKeySmokeResult(
  input: Omit<ProviderKeySmokeResult, "passed">,
): ProviderKeySmokeResult {
  const dataStatusOk = ["real_time", "delayed", "eod", "cached", "stale"].includes(input.status);
  const passed = input.keyConfigured
    ? dataStatusOk && input.dataAvailable
    : input.status === "api_required" || input.status === "not_supported";

  return { ...input, passed };
}

export async function runProviderKeySmoke(params: {
  mode: "without_key" | "with_key" | "auto";
  probe: (target: ProviderKeySmokeTarget) => Promise<Omit<ProviderKeySmokeResult, "passed">>;
}): Promise<ProviderKeySmokeReport> {
  const results: ProviderKeySmokeResult[] = [];

  for (const target of PROVIDER_KEY_SMOKE_TARGETS) {
    const raw = await params.probe(target);
    results.push(evaluateProviderKeySmokeResult(raw));
  }

  const failureCount = results.filter((result) => !result.passed).length;
  return {
    id: `provider_key_smoke_${Date.now()}`,
    mode: params.mode,
    results,
    passed: failureCount === 0,
    failureCount,
    createdAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}

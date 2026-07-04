import type { DataEnvelope } from "@/domain/common/data-status";
import {
  DEFAULT_PROVIDER_RUNTIME_POLICIES,
  type RuntimeProviderId,
} from "@/domain/providers/provider-runtime-policy";
import {
  runWithProviderRuntimeGate,
  type ProviderRuntimeCacheStore,
} from "@/server/providers/provider-runtime-gate";

export async function withMarketDataRuntimeGate<T>(params: {
  providerId: RuntimeProviderId;
  market: "KR" | "US";
  assetId: string;
  symbol: string;
  capability: "quote" | "ohlcv";
  range?: string;
  interval?: string;
  cacheStore?: ProviderRuntimeCacheStore;
  fetcher: () => Promise<DataEnvelope<T>>;
}): Promise<DataEnvelope<T>> {
  const key = [
    "market-data",
    params.providerId,
    params.market,
    params.assetId,
    params.symbol,
    params.capability,
    params.range ?? "none",
    params.interval ?? "none",
  ].join(":");

  return runWithProviderRuntimeGate<T>({
    cacheKey: key,
    policy: DEFAULT_PROVIDER_RUNTIME_POLICIES[params.providerId],
    cacheStore: params.cacheStore,
    fetcher: params.fetcher,
  });
}

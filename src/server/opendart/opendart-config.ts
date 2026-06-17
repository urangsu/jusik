import { resolveProviderConfigSync } from "../settings/provider-config-resolver";

export function getOpenDartConfig() {
  const config = resolveProviderConfigSync("opendart");

  const enabled = config["OPENDART_ENABLED"] === true;
  const apiKey = (config["OPENDART_API_KEY"] as string) || null;
  const baseUrl = (config["OPENDART_BASE_URL"] as string) || "https://opendart.fss.or.kr/api";
  const pageCount = Math.min(
    100,
    Number(config["OPENDART_DISCLOSURE_PAGE_COUNT"] ?? 100)
  );
  const timeoutMs = Number(config["OPENDART_REQUEST_TIMEOUT_MS"] ?? 10000);
  const cacheTtlMinutes = Number(
    config["OPENDART_CACHE_TTL_MINUTES"] ??
      process.env.OPENDART_CACHE_TTL_MINUTES ??
      30
  );

  return {
    enabled: enabled && !!apiKey,
    apiKey,
    baseUrl,
    pageCount,
    timeoutMs,
    cacheTtlMinutes,
  };
}

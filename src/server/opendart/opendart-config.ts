export function getOpenDartConfig() {
  const enabled = process.env.OPENDART_ENABLED === "true";
  const apiKey = process.env.OPENDART_API_KEY || null;
  const baseUrl = process.env.OPENDART_BASE_URL || "https://opendart.fss.or.kr/api";
  const pageCount = Math.min(
    100,
    parseInt(process.env.OPENDART_DISCLOSURE_PAGE_COUNT || "100", 10)
  );
  const timeoutMs = parseInt(process.env.OPENDART_REQUEST_TIMEOUT_MS || "10000", 10);
  const cacheTtlMinutes = parseInt(process.env.OPENDART_CACHE_TTL_MINUTES || "30", 10);

  return {
    enabled: enabled && !!apiKey,
    apiKey,
    baseUrl,
    pageCount,
    timeoutMs,
    cacheTtlMinutes,
  };
}

import { getOpenDartConfig } from "./opendart-config";

export type OpenDartRawResponse<T> = {
  status: string;
  message: string;
} & T;

export async function requestOpenDartJson<T>(params: {
  path: string;
  query: Record<string, string | number | undefined>;
}): Promise<OpenDartRawResponse<T>> {
  const config = getOpenDartConfig();
  if (!config.apiKey) {
    throw new Error("OPENDART_API_KEY가 설정되지 않았습니다.");
  }

  const searchParams = new URLSearchParams();
  searchParams.append("crtfc_key", config.apiKey);

  for (const [key, val] of Object.entries(params.query)) {
    if (val !== undefined && val !== null) {
      searchParams.append(key, String(val));
    }
  }

  // Construct URL without key for logging/error purposes
  const urlSafe = `${config.baseUrl}${params.path}?${Object.entries(params.query)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .join("&")}`;

  const urlFull = `${config.baseUrl}${params.path}?${searchParams.toString()}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetch(urlFull, {
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      throw new Error(`OpenDART request failed with status: ${res.status}`);
    }

    const json = await res.json();
    return json as OpenDartRawResponse<T>;
  } catch (err: any) {
    clearTimeout(id);
    const errMsg = err?.message || String(err);
    // Mask apiKey if it leaked into the error
    const maskedMsg = errMsg.replace(config.apiKey, "[REDACTED_API_KEY]");
    throw new Error(`[OpenDART HTTP Client] Error accessing ${urlSafe}: ${maskedMsg}`);
  }
}

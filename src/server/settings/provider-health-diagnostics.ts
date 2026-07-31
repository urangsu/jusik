import { ProviderStatus } from "../../domain/settings/provider-setting-snapshot";
import { isMockKey } from "../providers/provider-registry";

export type DiagnosticResult = {
  status: ProviderStatus;
  safeMessage: string;
};

export type KisDiagnosticInput = {
  enabled: boolean;
  appKey: string;
  appSecret: string;
  isPaper: boolean;
  baseUrl: string;
  tokenResult: { success: true } | { success: false; errorMessage: string };
  quoteResult:
    | { status: "real_time" | "delayed" | "eod" | "cached"; hasValue: boolean }
    | { status: "rate_limited"; message: string | null }
    | { status: "error" | "api_required" | "not_found" | "not_supported"; message: string | null };
};

export type OpenDartDiagnosticInput = {
  enabled: boolean;
  apiKey: string;
  searchResult:
    | { status: "eod" | "not_found" | "real_time"; hasValue: boolean }
    | { status: "rate_limited"; message: string | null }
    | { status: "api_required" | "error"; message: string | null };
};

export type FinnhubDiagnosticInput = {
  enabled: boolean;
  apiKey: string;
  quoteResult:
    | { status: "real_time" | "delayed" | "eod" | "cached"; hasValue: boolean }
    | { status: "rate_limited"; message: string | null }
    | { status: "error" | "api_required"; message: string | null };
};

const LIVE_STATUSES = new Set(["real_time", "delayed", "eod", "cached"]);

/**
 * Pure function: given structured inputs, compute the KIS diagnostic result.
 * No filesystem, no network, no environment variables.
 * Easily testable with any input combination.
 */
export function evaluateKisDiagnostic(input: KisDiagnosticInput): DiagnosticResult {
  if (!input.enabled) {
    return { status: "disabled", safeMessage: "KIS API가 비활성화되어 있습니다." };
  }

  if (!input.appKey || !input.appSecret) {
    return {
      status: "credentials_missing",
      safeMessage: "App Key 또는 App Secret이 저장되지 않았습니다.",
    };
  }

  if (isMockKey(input.appKey) || isMockKey(input.appSecret)) {
    return {
      status: "credentials_invalid",
      safeMessage: "유효한 App Key와 App Secret을 입력해주세요 (placeholder 키 사용 불가).",
    };
  }

  // Stage 3: Endpoint verification
  if (input.isPaper && !input.baseUrl.includes(":29443")) {
    return {
      status: "endpoint_mismatch",
      safeMessage: "모의투자 URL에 :29443 포트가 필요합니다.",
    };
  }
  if (!input.isPaper && !input.baseUrl.includes(":9443")) {
    return {
      status: "endpoint_mismatch",
      safeMessage: "실전투자 URL에 :9443 포트가 필요합니다.",
    };
  }

  // Stage 4: OAuth token
  if (!input.tokenResult.success) {
    const errMsg = input.tokenResult.errorMessage;
    const isAuthError =
      errMsg.includes("401") ||
      errMsg.includes("403") ||
      errMsg.toUpperCase().includes("APPKEY") ||
      errMsg.toLowerCase().includes("invalid") ||
      errMsg.includes("인증");
    return {
      status: isAuthError ? "credentials_invalid" : "token_failed",
      safeMessage: isAuthError
        ? "KIS가 App Key 또는 App Secret을 거부했습니다."
        : "KIS 토큰 발급에 실패했습니다. 서버 상태를 확인하세요.",
    };
  }

  // Stage 5 & 6: Quote retrieval
  const q = input.quoteResult;
  if (LIVE_STATUSES.has(q.status)) {
    return {
      status: "healthy",
      safeMessage: "KIS Open API 시세 연결 및 인증 테스트 성공",
    };
  }
  if (q.status === "rate_limited") {
    return {
      status: "rate_limited",
      safeMessage: "KIS API 호출 한도를 초과했습니다.",
    };
  }
  const errMsg = (q as { message: string | null }).message || "";
  const isAuthError =
    errMsg.includes("인증") ||
    errMsg.toUpperCase().includes("APPKEY") ||
    errMsg.includes("401") ||
    errMsg.includes("403");
  return {
    status: isAuthError ? "credentials_invalid" : "provider_error",
    safeMessage: isAuthError
      ? "KIS가 App Key 또는 App Secret을 거부했습니다."
      : "토큰 발급은 성공했지만 시세 조회가 실패했습니다.",
  };
}

/**
 * Pure function: compute OpenDART diagnostic result.
 */
export function evaluateOpenDartDiagnostic(input: OpenDartDiagnosticInput): DiagnosticResult {
  if (!input.enabled) {
    return { status: "disabled", safeMessage: "OPENDART API가 비활성화되어 있습니다." };
  }
  if (!input.apiKey) {
    return { status: "credentials_missing", safeMessage: "OpenDART API Key가 설정되지 않았습니다." };
  }
  if (isMockKey(input.apiKey)) {
    return {
      status: "credentials_invalid",
      safeMessage: "유효한 OpenDART API Key를 입력해주세요 (placeholder 키 사용 불가).",
    };
  }

  const s = input.searchResult;
  if (LIVE_STATUSES.has(s.status) || s.status === "not_found") {
    return { status: "healthy", safeMessage: "OpenDART 전자공시 시스템 정상적으로 연결되었습니다." };
  }
  if (s.status === "rate_limited") {
    return { status: "rate_limited", safeMessage: "OpenDART 요청 한도를 초과했습니다." };
  }
  if (s.status === "api_required") {
    return { status: "credentials_missing", safeMessage: "OpenDART API Key 설정이 필요합니다." };
  }
  const errMsg = (s as { message: string | null }).message || "";
  const isAuthError =
    errMsg.includes("인증") || errMsg.includes("Key") || errMsg.includes("010") || errMsg.includes("011");
  return {
    status: isAuthError ? "credentials_invalid" : "provider_error",
    safeMessage: isAuthError ? "OpenDART API Key가 거부되었습니다." : "OpenDART 연결 중 오류가 발생했습니다.",
  };
}

/**
 * Pure function: compute Finnhub diagnostic result.
 */
export function evaluateFinnhubDiagnostic(input: FinnhubDiagnosticInput): DiagnosticResult {
  if (!input.enabled) {
    return { status: "disabled", safeMessage: "Finnhub API가 비활성화되어 있습니다." };
  }
  if (!input.apiKey) {
    return { status: "credentials_missing", safeMessage: "Finnhub API Key가 누락되었습니다." };
  }
  if (isMockKey(input.apiKey)) {
    return { status: "credentials_invalid", safeMessage: "유효한 Finnhub API Key를 입력해주세요." };
  }

  const q = input.quoteResult;
  if (LIVE_STATUSES.has(q.status)) {
    return { status: "healthy", safeMessage: "Finnhub 시세 조회가 성공했습니다." };
  }
  if (q.status === "rate_limited") {
    return { status: "rate_limited", safeMessage: "Finnhub rate limit 초과." };
  }
  return { status: "credentials_invalid", safeMessage: "Finnhub API Key가 거부되었습니다." };
}
